package model

import "time"

// Error is the standard API error response.
type Error struct {
	Code        int    `json:"code"`
	Message     string `json:"message"`
	Description string `json:"description,omitempty"`
}

// Product represents a ceramics product in the catalog.
type Product struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	Category      string    `json:"category"`
	Price         float64   `json:"price"`
	ImageUrls     []string  `json:"imageUrls"`
	StockQuantity int       `json:"stockQuantity"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ProductInput is the request body for creating or updating a product.
type ProductInput struct {
	Name          string   `json:"name"`
	Description   string   `json:"description,omitempty"`
	Category      string   `json:"category"`
	Price         float64  `json:"price"`
	ImageUrls     []string `json:"imageUrls,omitempty"`
	StockQuantity int      `json:"stockQuantity"`
}

// CartItem represents a single line item in a cart.
type CartItem struct {
	ID          string  `json:"id"`
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName,omitempty"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	Subtotal    float64 `json:"subtotal"`
}

// CartItemInput is the request body for adding an item to the cart.
type CartItemInput struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// CartItemUpdateInput is the request body for updating a cart item's quantity.
type CartItemUpdateInput struct {
	Quantity int `json:"quantity"`
}

// Cart represents a shopper's shopping cart.
type Cart struct {
	ID        string     `json:"id"`
	Items     []CartItem `json:"items"`
	Total     float64    `json:"total"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// ShippingAddress holds shipping destination details.
type ShippingAddress struct {
	Name       string `json:"name"`
	Line1      string `json:"line1"`
	Line2      string `json:"line2,omitempty"`
	City       string `json:"city"`
	Region     string `json:"region,omitempty"`
	PostalCode string `json:"postalCode"`
	Country    string `json:"country"`
	Phone      string `json:"phone,omitempty"`
}

// CheckoutRequest is the request body for POST /checkout.
type CheckoutRequest struct {
	ShippingAddress    ShippingAddress `json:"shippingAddress"`
	PaymentMethodToken string          `json:"paymentMethodToken"`
}

// OrderItem represents a single line item in an order.
type OrderItem struct {
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName,omitempty"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	LineTotal   float64 `json:"lineTotal"`
}

// Order represents a placed order.
type Order struct {
	ID               string           `json:"id"`
	Status           string           `json:"status"`
	Items            []OrderItem      `json:"items"`
	Subtotal         float64          `json:"subtotal"`
	ShippingCost     float64          `json:"shippingCost"`
	Tax              float64          `json:"tax"`
	Total            float64          `json:"total"`
	ShippingAddress  *ShippingAddress `json:"shippingAddress,omitempty"`
	PaymentReference string           `json:"paymentReference,omitempty"`
	CreatedAt        time.Time        `json:"createdAt"`
}

// PagedProducts is a paginated list of products.
type PagedProducts struct {
	Count    int       `json:"count"`
	Next     *string   `json:"next"`
	Previous *string   `json:"previous"`
	Data     []Product `json:"data"`
}

// PagedOrders is a paginated list of orders.
type PagedOrders struct {
	Count    int     `json:"count"`
	Next     *string `json:"next"`
	Previous *string `json:"previous"`
	Data     []Order `json:"data"`
}
