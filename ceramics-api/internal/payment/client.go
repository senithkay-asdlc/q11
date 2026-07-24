package payment

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// Client is a payment-provider API client.
type Client struct {
	apiKey string
}

// NewClient creates a new payment client with the given API key.
func NewClient(apiKey string) *Client {
	return &Client{apiKey: apiKey}
}

// ChargeResult holds the result of a charge attempt.
type ChargeResult struct {
	Reference string
	Success   bool
	Message   string
}

// Charge attempts to charge the given amount using the tokenized payment method.
// Returns a charge reference on success.
func (c *Client) Charge(ctx context.Context, paymentMethodToken string, amount float64, currency string) (*ChargeResult, error) {
	if c.apiKey == "" {
		return &ChargeResult{Success: false, Message: "payment provider not configured"}, nil
	}

	if paymentMethodToken == "" {
		return &ChargeResult{Success: false, Message: "payment method token is required"}, nil
	}

	if amount <= 0 {
		return &ChargeResult{Success: false, Message: "charge amount must be positive"}, nil
	}

	// Simulate a payment provider charge using the API key.
	// In a real implementation this would call the payment provider's HTTP API.
	ref, err := generateReference()
	if err != nil {
		return nil, fmt.Errorf("generate payment reference: %w", err)
	}

	return &ChargeResult{
		Reference: "pay_" + ref,
		Success:   true,
		Message:   "payment accepted",
	}, nil
}

func generateReference() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
