import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useIsAdmin } from '../auth/AuthProvider'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const auth = useAuth()
  const isAdmin = useIsAdmin()

  if (auth.isLoading) {
    return <div style={{ padding: 48, textAlign: 'center' }}>Loading…</div>
  }

  if (!auth.isAuthenticated) {
    auth.signinRedirect()
    return <div style={{ padding: 48, textAlign: 'center' }}>Redirecting to sign in…</div>
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
