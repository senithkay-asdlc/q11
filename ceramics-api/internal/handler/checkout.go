package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"ceramics-api/internal/model"
	"ceramics-api/internal/payment"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	shippingCostFixed = 9.99
	taxRate           = 0.08 // 8%
)

type checkoutHandler struct {
	db             *pgxpool.Pool
	paymentClient  *payment.Client
}

func newCheckoutHandler(db *pgxpool.Pool, paymentClient *payment.Client) *checkoutHandler {
	return &checkoutHandler{db: db, paymentClient: paymentClient}
}

// checkout handles POST /checkout
func (h *checkoutHandler) checkout(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	var req model.CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateCheckoutRequest(req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Load the shopper's cart (must exist and be non-empty).
	var cartID string
	err := h.db.QueryRow(r.Context(), "SELECT id FROM carts WHERE owner_id=$1", userID).Scan(&cartID)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusBadRequest, "cart is empty")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	order, err := h.processCheckout(r.Context(), userID, cartID, req)
	if err != nil {
		if isStockErr(err) {
			respondError(w, http.StatusConflict, err.Error())
			return
		}
		if isPaymentErr(err) {
			respondError(w, http.StatusConflict, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "checkout failed")
		return
	}

	respond(w, http.StatusCreated, order)
}

// processCheckout executes the full checkout flow inside a single serializable transaction.
// The transaction ensures atomicity: either stock is decremented AND order is created,
// or nothing changes (cart is preserved on any failure).
func (h *checkoutHandler) processCheckout(
	ctx context.Context,
	userID, cartID string,
	req model.CheckoutRequest,
) (model.Order, error) {

	tx, err := h.db.BeginTx(ctx, pgx.TxOptions{
		IsoLevel: pgx.Serializable,
	})
	if err != nil {
		return model.Order{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Load cart items with a row-level lock on the products to prevent overselling.
	rows, err := tx.Query(ctx, `
		SELECT ci.id, ci.product_id, p.name, ci.quantity, ci.unit_price, p.stock_quantity
		FROM cart_items ci
		JOIN products p ON p.id = ci.product_id
		WHERE ci.cart_id = $1
		FOR UPDATE OF p`, cartID)
	if err != nil {
		return model.Order{}, fmt.Errorf("lock products: %w", err)
	}

	type lineItem struct {
		cartItemID  string
		productID   string
		productName string
		quantity    int
		unitPrice   float64
		stock       int
	}

	var lines []lineItem
	for rows.Next() {
		var li lineItem
		if err := rows.Scan(&li.cartItemID, &li.productID, &li.productName, &li.quantity, &li.unitPrice, &li.stock); err != nil {
			rows.Close()
			return model.Order{}, fmt.Errorf("scan line item: %w", err)
		}
		lines = append(lines, li)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return model.Order{}, fmt.Errorf("iterate cart items: %w", err)
	}

	if len(lines) == 0 {
		return model.Order{}, stockError("cart is empty")
	}

	// Validate stock for every line item.
	for _, li := range lines {
		if li.quantity > li.stock {
			return model.Order{}, stockError(fmt.Sprintf(
				"insufficient stock for product %s: requested %d, available %d",
				li.productName, li.quantity, li.stock))
		}
	}

	// Compute totals.
	var subtotal float64
	for _, li := range lines {
		subtotal += li.unitPrice * float64(li.quantity)
	}
	shippingCost := shippingCostFixed
	tax := subtotal * taxRate
	total := subtotal + shippingCost + tax

	// Charge via the payment provider BEFORE writing any order (so a declined
	// payment leaves the cart intact and we rollback cleanly).
	chargeResult, err := h.paymentClient.Charge(ctx, req.PaymentMethodToken, total, "USD")
	if err != nil {
		return model.Order{}, fmt.Errorf("payment error: %w", err)
	}
	if !chargeResult.Success {
		return model.Order{}, paymentError(chargeResult.Message)
	}

	// Create the order.
	var orderID string
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (owner_id, status, subtotal, shipping_cost, tax, total, payment_reference)
		VALUES ($1, 'confirmed', $2, $3, $4, $5, $6)
		RETURNING id`,
		userID, subtotal, shippingCost, tax, total, chargeResult.Reference,
	).Scan(&orderID)
	if err != nil {
		return model.Order{}, fmt.Errorf("create order: %w", err)
	}

	// Insert order items and decrement stock.
	var orderItems []model.OrderItem
	for _, li := range lines {
		lineTotal := li.unitPrice * float64(li.quantity)
		_, err := tx.Exec(ctx, `
			INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			orderID, li.productID, li.productName, li.quantity, li.unitPrice, lineTotal)
		if err != nil {
			return model.Order{}, fmt.Errorf("insert order item: %w", err)
		}

		_, err = tx.Exec(ctx, `
			UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2`,
			li.quantity, li.productID)
		if err != nil {
			return model.Order{}, fmt.Errorf("decrement stock: %w", err)
		}

		orderItems = append(orderItems, model.OrderItem{
			ProductID:   li.productID,
			ProductName: li.productName,
			Quantity:    li.quantity,
			UnitPrice:   li.unitPrice,
			LineTotal:   lineTotal,
		})
	}

	// Persist shipping address.
	addr := req.ShippingAddress
	_, err = tx.Exec(ctx, `
		INSERT INTO shipping_addresses (order_id, name, line1, line2, city, region, postal_code, country, phone)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		orderID, addr.Name, addr.Line1, addr.Line2, addr.City, addr.Region, addr.PostalCode, addr.Country, addr.Phone)
	if err != nil {
		return model.Order{}, fmt.Errorf("save shipping address: %w", err)
	}

	// Clear the cart (success path).
	_, err = tx.Exec(ctx, "DELETE FROM cart_items WHERE cart_id=$1", cartID)
	if err != nil {
		return model.Order{}, fmt.Errorf("clear cart: %w", err)
	}
	_, err = tx.Exec(ctx, "UPDATE carts SET updated_at=NOW() WHERE id=$1", cartID)
	if err != nil {
		return model.Order{}, fmt.Errorf("update cart timestamp: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return model.Order{}, fmt.Errorf("commit tx: %w", err)
	}

	// Fetch the created_at timestamp.
	var createdAt interface{ IsZero() bool }
	_ = h.db.QueryRow(ctx, "SELECT created_at FROM orders WHERE id=$1", orderID).Scan(&createdAt)

	var order model.Order
	_ = h.db.QueryRow(ctx, "SELECT id, status, subtotal, shipping_cost, tax, total, payment_reference, created_at FROM orders WHERE id=$1", orderID).
		Scan(&order.ID, &order.Status, &order.Subtotal, &order.ShippingCost, &order.Tax, &order.Total, &order.PaymentReference, &order.CreatedAt)

	order.Items = orderItems
	order.ShippingAddress = &req.ShippingAddress

	return order, nil
}

// --- sentinel error types ---

type stockErr string

func stockError(msg string) stockErr  { return stockErr(msg) }
func (e stockErr) Error() string      { return string(e) }
func isStockErr(err error) bool       { _, ok := err.(stockErr); return ok }

type paymentErr string

func paymentError(msg string) paymentErr { return paymentErr(msg) }
func (e paymentErr) Error() string       { return string(e) }
func isPaymentErr(err error) bool        { _, ok := err.(paymentErr); return ok }

// --- validation ---

func validateCheckoutRequest(req model.CheckoutRequest) error {
	addr := req.ShippingAddress
	missing := []string{}
	if strings.TrimSpace(addr.Name) == "" {
		missing = append(missing, "shippingAddress.name")
	}
	if strings.TrimSpace(addr.Line1) == "" {
		missing = append(missing, "shippingAddress.line1")
	}
	if strings.TrimSpace(addr.City) == "" {
		missing = append(missing, "shippingAddress.city")
	}
	if strings.TrimSpace(addr.PostalCode) == "" {
		missing = append(missing, "shippingAddress.postalCode")
	}
	if strings.TrimSpace(addr.Country) == "" {
		missing = append(missing, "shippingAddress.country")
	}
	if strings.TrimSpace(req.PaymentMethodToken) == "" {
		missing = append(missing, "paymentMethodToken")
	}
	if len(missing) > 0 {
		return fmt.Errorf("required fields missing: %s", strings.Join(missing, ", "))
	}
	return nil
}
