package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"ceramics-api/internal/db"
	"ceramics-api/internal/handler"
)

func main() {
	port := getenv("PORT", "8080")

	dbURL := buildDBURL()

	ctx := context.Background()

	pool, err := db.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	paymentAPIKey := getenv("PAYMENT_PROVIDER_API_KEY", "dev-payment-key")

	r := handler.NewRouter(pool, paymentAPIKey)

	log.Printf("ceramics-api listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

// buildDBURL assembles the PostgreSQL DSN from individual env vars,
// falling back to the full CERAMICS_DB_URL if set, or sensible defaults.
func buildDBURL() string {
	if url := os.Getenv("CERAMICS_DB_URL"); url != "" {
		return url
	}

	host := getenv("CERAMICS_DB_HOST", "localhost")
	port := getenv("CERAMICS_DB_PORT", "5432")
	dbname := getenv("CERAMICS_DB_DATABASE", "ceramics")
	user := getenv("CERAMICS_DB_USERNAME", "ceramics")
	password := getenv("CERAMICS_DB_PASSWORD", "ceramics")

	return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=disable",
		user, password, host, port, dbname)
}

// getenv returns the value of an environment variable, or the fallback default.
func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
