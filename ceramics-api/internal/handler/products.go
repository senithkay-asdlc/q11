package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"ceramics-api/internal/model"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type productHandler struct {
	db *pgxpool.Pool
}

func newProductHandler(db *pgxpool.Pool) *productHandler {
	return &productHandler{db: db}
}

// listProducts handles GET /products
func (h *productHandler) listProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")
	limit := parseIntParam(r.URL.Query().Get("limit"), 20, 100)
	offset := parseIntParam(r.URL.Query().Get("offset"), 0, -1)

	// Build the query dynamically.
	args := []any{}
	conditions := []string{}
	argIdx := 1

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, category)
		argIdx++
	}
	if q != "" {
		conditions = append(conditions, fmt.Sprintf(
			"to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', $%d)", argIdx))
		args = append(args, q)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching rows.
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM products %s", where)
	var total int
	if err := h.db.QueryRow(r.Context(), countSQL, args...).Scan(&total); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to count products")
		return
	}

	// Fetch paginated products.
	args = append(args, limit, offset)
	dataSQL := fmt.Sprintf(`
		SELECT id, name, description, category, price, image_urls, stock_quantity, created_at, updated_at
		FROM products %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	rows, err := h.db.Query(r.Context(), dataSQL, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to query products")
		return
	}
	defer rows.Close()

	products, err := scanProducts(rows)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to scan products")
		return
	}

	paged := buildPagedProducts(r, total, products, limit, offset)
	respond(w, http.StatusOK, paged)
}

// createProduct handles POST /products (admin only)
func (h *productHandler) createProduct(w http.ResponseWriter, r *http.Request) {
	var input model.ProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateProductInput(input); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	imageUrls := input.ImageUrls
	if imageUrls == nil {
		imageUrls = []string{}
	}

	var p model.Product
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO products (name, description, category, price, image_urls, stock_quantity)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, description, category, price, image_urls, stock_quantity, created_at, updated_at`,
		input.Name, input.Description, input.Category, input.Price, imageUrls, input.StockQuantity,
	).Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Price, &p.ImageUrls, &p.StockQuantity, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create product")
		return
	}

	if p.ImageUrls == nil {
		p.ImageUrls = []string{}
	}
	respond(w, http.StatusCreated, p)
}

// getProduct handles GET /products/{productId}
func (h *productHandler) getProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productId")
	p, err := h.fetchProduct(r, productID)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get product")
		return
	}
	respond(w, http.StatusOK, p)
}

// updateProduct handles PUT /products/{productId} (admin only)
func (h *productHandler) updateProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productId")

	var input model.ProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateProductInput(input); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	imageUrls := input.ImageUrls
	if imageUrls == nil {
		imageUrls = []string{}
	}

	var p model.Product
	err := h.db.QueryRow(r.Context(), `
		UPDATE products
		SET name=$1, description=$2, category=$3, price=$4, image_urls=$5, stock_quantity=$6, updated_at=NOW()
		WHERE id=$7
		RETURNING id, name, description, category, price, image_urls, stock_quantity, created_at, updated_at`,
		input.Name, input.Description, input.Category, input.Price, imageUrls, input.StockQuantity, productID,
	).Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Price, &p.ImageUrls, &p.StockQuantity, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update product")
		return
	}

	if p.ImageUrls == nil {
		p.ImageUrls = []string{}
	}
	respond(w, http.StatusOK, p)
}

// deleteProduct handles DELETE /products/{productId} (admin only)
func (h *productHandler) deleteProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productId")

	tag, err := h.db.Exec(r.Context(), "DELETE FROM products WHERE id=$1", productID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete product")
		return
	}
	if tag.RowsAffected() == 0 {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// fetchProduct is a helper to load a single product by ID.
func (h *productHandler) fetchProduct(r *http.Request, productID string) (model.Product, error) {
	var p model.Product
	err := h.db.QueryRow(r.Context(), `
		SELECT id, name, description, category, price, image_urls, stock_quantity, created_at, updated_at
		FROM products WHERE id=$1`, productID,
	).Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Price, &p.ImageUrls, &p.StockQuantity, &p.CreatedAt, &p.UpdatedAt)
	if p.ImageUrls == nil {
		p.ImageUrls = []string{}
	}
	return p, err
}

// --- helpers ---

func scanProducts(rows pgx.Rows) ([]model.Product, error) {
	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Price, &p.ImageUrls, &p.StockQuantity, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if p.ImageUrls == nil {
			p.ImageUrls = []string{}
		}
		products = append(products, p)
	}
	if products == nil {
		products = []model.Product{}
	}
	return products, rows.Err()
}

func buildPagedProducts(r *http.Request, total int, products []model.Product, limit, offset int) model.PagedProducts {
	paged := model.PagedProducts{
		Count: total,
		Data:  products,
	}

	base := r.URL.Path
	if offset+limit < total {
		nextURL := fmt.Sprintf("%s?limit=%d&offset=%d", base, limit, offset+limit)
		if q := r.URL.Query().Get("q"); q != "" {
			nextURL += "&q=" + q
		}
		if cat := r.URL.Query().Get("category"); cat != "" {
			nextURL += "&category=" + cat
		}
		paged.Next = &nextURL
	}
	if offset > 0 {
		prevOffset := offset - limit
		if prevOffset < 0 {
			prevOffset = 0
		}
		prevURL := fmt.Sprintf("%s?limit=%d&offset=%d", base, limit, prevOffset)
		if q := r.URL.Query().Get("q"); q != "" {
			prevURL += "&q=" + q
		}
		if cat := r.URL.Query().Get("category"); cat != "" {
			prevURL += "&category=" + cat
		}
		paged.Previous = &prevURL
	}
	return paged
}

func validateProductInput(input model.ProductInput) error {
	if strings.TrimSpace(input.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if strings.TrimSpace(input.Category) == "" {
		return fmt.Errorf("category is required")
	}
	if input.Price < 0 {
		return fmt.Errorf("price must be non-negative")
	}
	if input.StockQuantity < 0 {
		return fmt.Errorf("stockQuantity must be non-negative")
	}
	return nil
}

func parseIntParam(s string, defaultVal, max int) int {
	if s == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 0 {
		return defaultVal
	}
	if max > 0 && v > max {
		return max
	}
	return v
}
