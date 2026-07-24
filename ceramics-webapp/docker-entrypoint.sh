#!/bin/sh
# Generate /env-config.js from runtime environment variables at container startup.
# This allows the React SPA to read OpenChoreo-injected env vars without rebuilding the image.
set -e

cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  "CERAMICS_API_URL":       "${CERAMICS_API_URL:-}",
  "USER_AUTH_ISSUER":       "${USER_AUTH_ISSUER:-}",
  "USER_AUTH_CLIENT_ID":    "${USER_AUTH_CLIENT_ID:-}",
  "USER_AUTH_JWKS_URL":     "${USER_AUTH_JWKS_URL:-}",
  "USER_AUTH_SCOPES":       "${USER_AUTH_SCOPES:-openid profile email}"
};
EOF

exec nginx -g "daemon off;"
