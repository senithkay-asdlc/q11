package handler

import (
	"ceramics-api/internal/payment"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewRouter wires up all routes and returns the root HTTP handler.
func NewRouter(db *pgxpool.Pool, paymentAPIKey string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)
	r.Use(identityMiddleware)

	ph := newProductHandler(db)
	ch := newCartHandler(db)
	payClient := payment.NewClient(paymentAPIKey)
	coh := newCheckoutHandler(db, payClient)
	oh := newOrderHandler(db)

	// Health check (unauthenticated)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Product catalog endpoints
	r.Get("/products", ph.listProducts)
	r.Get("/products/{productId}", ph.getProduct)

	// Admin-only product management
	r.With(requireAdmin).Post("/products", ph.createProduct)
	r.With(requireAdmin).Put("/products/{productId}", ph.updateProduct)
	r.With(requireAdmin).Delete("/products/{productId}", ph.deleteProduct)

	// Cart endpoints (authenticated shoppers)
	r.With(requireAuth).Get("/cart", ch.getCart)
	r.With(requireAuth).Post("/cart/items", ch.addCartItem)
	r.With(requireAuth).Patch("/cart/items/{itemId}", ch.updateCartItem)
	r.With(requireAuth).Delete("/cart/items/{itemId}", ch.removeCartItem)

	// Checkout endpoint
	r.With(requireAuth).Post("/checkout", coh.checkout)

	// Order history endpoints
	r.With(requireAuth).Get("/orders", oh.listOrders)
	r.With(requireAuth).Get("/orders/{orderId}", oh.getOrder)

	return r
}
