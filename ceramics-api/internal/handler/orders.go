package handler

import (
	"fmt"
	"net/http"

	"ceramics-api/internal/model"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type orderHandler struct {
	db *pgxpool.Pool
}

func newOrderHandler(db *pgxpool.Pool) *orderHandler {
	return &orderHandler{db: db}
}

// listOrders handles GET /orders
func (h *orderHandler) listOrders(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	limit := parseIntParam(r.URL.Query().Get("limit"), 20, 100)
	offset := parseIntParam(r.URL.Query().Get("offset"), 0, -1)

	var total int
	if err := h.db.QueryRow(r.Context(),
		"SELECT COUNT(*) FROM orders WHERE owner_id=$1", userID,
	).Scan(&total); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to count orders")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, status, subtotal, shipping_cost, tax, total, payment_reference, created_at
		FROM orders
		WHERE owner_id=$1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to query orders")
		return
	}
	defer rows.Close()

	var orders []model.Order
	for rows.Next() {
		var o model.Order
		if err := rows.Scan(&o.ID, &o.Status, &o.Subtotal, &o.ShippingCost, &o.Tax, &o.Total, &o.PaymentReference, &o.CreatedAt); err != nil {
			respondError(w, http.StatusInternalServerError, "failed to scan order")
			return
		}
		o.Items = []model.OrderItem{}
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to iterate orders")
		return
	}

	if orders == nil {
		orders = []model.Order{}
	}

	paged := buildPagedOrders(r, total, orders, limit, offset)
	respond(w, http.StatusOK, paged)
}

// getOrder handles GET /orders/{orderId}
func (h *orderHandler) getOrder(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "orderId")

	var o model.Order
	err := h.db.QueryRow(r.Context(), `
		SELECT id, status, subtotal, shipping_cost, tax, total, payment_reference, created_at
		FROM orders
		WHERE id=$1 AND owner_id=$2`,
		orderID, userID,
	).Scan(&o.ID, &o.Status, &o.Subtotal, &o.ShippingCost, &o.Tax, &o.Total, &o.PaymentReference, &o.CreatedAt)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusNotFound, "order not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch order")
		return
	}

	// Load order items.
	itemRows, err := h.db.Query(r.Context(), `
		SELECT product_id, product_name, quantity, unit_price, line_total
		FROM order_items WHERE order_id=$1`, orderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch order items")
		return
	}
	defer itemRows.Close()

	var items []model.OrderItem
	for itemRows.Next() {
		var item model.OrderItem
		if err := itemRows.Scan(&item.ProductID, &item.ProductName, &item.Quantity, &item.UnitPrice, &item.LineTotal); err != nil {
			respondError(w, http.StatusInternalServerError, "failed to scan order item")
			return
		}
		items = append(items, item)
	}
	if items == nil {
		items = []model.OrderItem{}
	}
	o.Items = items

	// Load shipping address.
	var addr model.ShippingAddress
	err = h.db.QueryRow(r.Context(), `
		SELECT name, line1, line2, city, region, postal_code, country, phone
		FROM shipping_addresses WHERE order_id=$1`, orderID,
	).Scan(&addr.Name, &addr.Line1, &addr.Line2, &addr.City, &addr.Region, &addr.PostalCode, &addr.Country, &addr.Phone)
	if err == nil {
		o.ShippingAddress = &addr
	}

	respond(w, http.StatusOK, o)
}

func buildPagedOrders(r *http.Request, total int, orders []model.Order, limit, offset int) model.PagedOrders {
	paged := model.PagedOrders{
		Count: total,
		Data:  orders,
	}

	base := r.URL.Path
	if offset+limit < total {
		nextURL := fmt.Sprintf("%s?limit=%d&offset=%d", base, limit, offset+limit)
		paged.Next = &nextURL
	}
	if offset > 0 {
		prevOffset := offset - limit
		if prevOffset < 0 {
			prevOffset = 0
		}
		prevURL := fmt.Sprintf("%s?limit=%d&offset=%d", base, limit, prevOffset)
		paged.Previous = &prevURL
	}
	return paged
}
