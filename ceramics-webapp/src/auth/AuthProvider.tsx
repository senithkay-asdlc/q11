import React, { useEffect } from 'react'
import { AuthProvider as OidcAuthProvider, useAuth } from 'react-oidc-context'
import { env } from '../env'
import { setTokenGetter } from '../api/client'

interface Props {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  const oidcConfig = {
    authority: env.USER_AUTH_ISSUER,
    client_id: env.USER_AUTH_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    scope: env.USER_AUTH_SCOPES,
    response_type: 'code',
    automaticSilentRenew: true,
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname)
    },
  }

  return (
    <OidcAuthProvider {...oidcConfig}>
      <TokenSyncer />
      {children}
    </OidcAuthProvider>
  )
}

/** Keeps the API client's token getter in sync with the current OIDC session. */
function TokenSyncer() {
  const auth = useAuth()

  useEffect(() => {
    setTokenGetter(() => auth.user?.access_token ?? null)
  }, [auth.user])

  return null
}

/** Returns the currently signed-in user's roles from the ID token claims. */
export function useRoles(): string[] {
  const auth = useAuth()
  const claims = auth.user?.profile
  if (!claims) return []
  // Thunder encodes roles as `roles` claim (array) or `groups`
  const roles =
    (claims['roles'] as string[] | undefined) ??
    (claims['groups'] as string[] | undefined) ??
    []
  return roles
}

export function useIsAdmin(): boolean {
  const roles = useRoles()
  return roles.includes('Store Administrator') || roles.includes('administrator') || roles.includes('admin')
}
