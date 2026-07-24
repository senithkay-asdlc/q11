// Runtime environment configuration loaded from /env-config.js (injected by nginx at startup).
// Falls back to Vite env vars for local dev.

declare global {
  interface Window {
    _env_?: Record<string, string>
  }
}

function getEnv(key: string, fallback = ''): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window._env_?.[key] ?? ((import.meta as any).env?.[key] as string | undefined) ?? fallback
}

export const env = {
  CERAMICS_API_URL: getEnv('CERAMICS_API_URL', 'http://localhost:8080'),
  USER_AUTH_ISSUER: getEnv('USER_AUTH_ISSUER', ''),
  USER_AUTH_CLIENT_ID: getEnv('USER_AUTH_CLIENT_ID', ''),
  USER_AUTH_JWKS_URL: getEnv('USER_AUTH_JWKS_URL', ''),
  USER_AUTH_SCOPES: getEnv('USER_AUTH_SCOPES', 'openid profile email'),
}
