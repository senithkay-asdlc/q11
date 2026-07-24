package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"ceramics-api/internal/model"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type cartHandler struct {
	db *pgxpool.Pool
}

func newCartHandler(db *pgxpool.Pool) *cartHandler {
	return &cartHandler{db: db}
}

// getCart handles GET /cart
func (h *cartHandler) getCart(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	cart, err := h.loadOrCreateCart(r, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	respond(w, http.StatusOK, cart)
}

// addCartItem handles POST /cart/items
func (h *cartHandler) addCartItem(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	var input model.CartItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if input.ProductID == "" {
		respondError(w, http.StatusBadRequest, "productId is required")
		return
	}
	if input.Quantity < 1 {
		respondError(w, http.StatusBadRequest, "quantity must be at least 1")
		return
	}

	// Validate product exists and has enough stock.
	var stockQty int
	var unitPrice float64
	err := h.db.QueryRow(r.Context(),
		"SELECT stock_quantity, price FROM products WHERE id=$1",
		input.ProductID,
	).Scan(&stockQty, &unitPrice)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch product")
		return
	}

	if input.Quantity > stockQty {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("requested quantity %d exceeds available stock %d", input.Quantity, stockQty))
		return
	}

	// Ensure the cart exists for this user.
	cartID, err := h.ensureCart(r, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to ensure cart")
		return
	}

	// Upsert the cart item (increment quantity if already in cart).
	_, err = h.db.Exec(r.Context(), `
		INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (cart_id, product_id)
		DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
		              unit_price = EXCLUDED.unit_price`,
		cartID, input.ProductID, input.Quantity, unitPrice,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to add item to cart")
		return
	}

	// Update cart timestamp.
	_, _ = h.db.Exec(r.Context(), "UPDATE carts SET updated_at=NOW() WHERE id=$1", cartID)

	cart, err := h.loadCartByID(r, cartID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	respond(w, http.StatusCreated, cart)
}

// updateCartItem handles PATCH /cart/items/{itemId}
func (h *cartHandler) updateCartItem(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	itemID := chi.URLParam(r, "itemId")

	var input model.CartItemUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if input.Quantity < 1 {
		respondError(w, http.StatusBadRequest, "quantity must be at least 1")
		return
	}

	// Verify the item belongs to this user's cart and fetch product info.
	var cartID, productID string
	err := h.db.QueryRow(r.Context(), `
		SELECT ci.cart_id, ci.product_id
		FROM cart_items ci
		JOIN carts c ON c.id = ci.cart_id
		WHERE ci.id=$1 AND c.owner_id=$2`,
		itemID, userID,
	).Scan(&cartID, &productID)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusNotFound, "cart item not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch cart item")
		return
	}

	// Validate stock.
	var stockQty int
	if err := h.db.QueryRow(r.Context(), "SELECT stock_quantity FROM products WHERE id=$1", productID).Scan(&stockQty); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch product stock")
		return
	}
	if input.Quantity > stockQty {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("requested quantity %d exceeds available stock %d", input.Quantity, stockQty))
		return
	}

	// Update quantity.
	_, err = h.db.Exec(r.Context(), "UPDATE cart_items SET quantity=$1 WHERE id=$2", input.Quantity, itemID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update cart item")
		return
	}
	_, _ = h.db.Exec(r.Context(), "UPDATE carts SET updated_at=NOW() WHERE id=$1", cartID)

	cart, err := h.loadCartByID(r, cartID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}
	respond(w, http.StatusOK, cart)
}

// removeCartItem handles DELETE /cart/items/{itemId}
func (h *cartHandler) removeCartItem(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	itemID := chi.URLParam(r, "itemId")

	// Verify the item belongs to this user's cart.
	var cartID string
	err := h.db.QueryRow(r.Context(), `
		SELECT ci.cart_id
		FROM cart_items ci
		JOIN carts c ON c.id = ci.cart_id
		WHERE ci.id=$1 AND c.owner_id=$2`,
		itemID, userID,
	).Scan(&cartID)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusNotFound, "cart item not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch cart item")
		return
	}

	if _, err := h.db.Exec(r.Context(), "DELETE FROM cart_items WHERE id=$1", itemID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to remove cart item")
		return
	}
	_, _ = h.db.Exec(r.Context(), "UPDATE carts SET updated_at=NOW() WHERE id=$1", cartID)

	w.WriteHeader(http.StatusNoContent)
}

// --- helpers ---

// ensureCart gets or creates the cart for the given owner.
func (h *cartHandler) ensureCart(r *http.Request, ownerID string) (string, error) {
	var cartID string
	err := h.db.QueryRow(r.Context(),
		"SELECT id FROM carts WHERE owner_id=$1", ownerID,
	).Scan(&cartID)
	if err == nil {
		return cartID, nil
	}
	if err != pgx.ErrNoRows {
		return "", err
	}

	// Create a new cart.
	err = h.db.QueryRow(r.Context(),
		"INSERT INTO carts (owner_id) VALUES ($1) RETURNING id", ownerID,
	).Scan(&cartID)
	return cartID, err
}

// loadOrCreateCart fetches (or creates) the cart for a user and returns the model.
func (h *cartHandler) loadOrCreateCart(r *http.Request, ownerID string) (model.Cart, error) {
	cartID, err := h.ensureCart(r, ownerID)
	if err != nil {
		return model.Cart{}, err
	}
	return h.loadCartByID(r, cartID)
}

// loadCartByID loads a full Cart model including items and computed totals.
func (h *cartHandler) loadCartByID(r *http.Request, cartID string) (model.Cart, error) {
	var cart model.Cart
	err := h.db.QueryRow(r.Context(),
		"SELECT id, updated_at FROM carts WHERE id=$1", cartID,
	).Scan(&cart.ID, &cart.UpdatedAt)
	if err != nil {
		return cart, err
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT ci.id, ci.product_id, p.name, ci.quantity, ci.unit_price
		FROM cart_items ci
		JOIN products p ON p.id = ci.product_id
		WHERE ci.cart_id=$1
		ORDER BY ci.id`, cartID)
	if err != nil {
		return cart, err
	}
	defer rows.Close()

	var items []model.CartItem
	var total float64
	for rows.Next() {
		var item model.CartItem
		if err := rows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.Quantity, &item.UnitPrice); err != nil {
			return cart, err
		}
		item.Subtotal = item.UnitPrice * float64(item.Quantity)
		total += item.Subtotal
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return cart, err
	}

	if items == nil {
		items = []model.CartItem{}
	}
	cart.Items = items
	cart.Total = total
	return cart, nil
}
