package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"ceramics-api/internal/model"
)

type contextKey string

const (
	ctxKeyUserID contextKey = "userID"
	ctxKeyGroups contextKey = "userGroups"

	// AdminGroup is the role group that grants administrator access.
	AdminGroup = "Store Administrator"
)

// respond writes a JSON response with the given status code and body.
func respond(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// respondError writes a standard error response.
func respondError(w http.ResponseWriter, status int, message string) {
	respond(w, status, model.Error{Code: status, Message: message})
}

// identityMiddleware extracts caller identity from platform-injected headers.
// X-User-Id is required for authenticated endpoints.
// X-User-Groups is a comma-separated list of groups.
func identityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-Id")
		groups := r.Header.Get("X-User-Groups")

		ctx := r.Context()
		if userID != "" {
			ctx = context.WithValue(ctx, ctxKeyUserID, userID)
		}
		if groups != "" {
			ctx = context.WithValue(ctx, ctxKeyGroups, groups)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// requireAuth ensures that a caller identity is present; returns 401 otherwise.
func requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if userIDFromCtx(r.Context()) == "" {
			respondError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// requireAdmin ensures that the caller is in the administrator group; returns 403 otherwise.
func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if userIDFromCtx(r.Context()) == "" {
			respondError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		if !isAdmin(r.Context()) {
			respondError(w, http.StatusForbidden, "administrator role required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// userIDFromCtx retrieves the caller's user ID from the context.
func userIDFromCtx(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyUserID).(string)
	return v
}

// isAdmin returns true if the caller is in the administrator group.
func isAdmin(ctx context.Context) bool {
	groups, _ := ctx.Value(ctxKeyGroups).(string)
	for _, g := range strings.Split(groups, ",") {
		if strings.TrimSpace(g) == AdminGroup {
			return true
		}
	}
	return false
}
