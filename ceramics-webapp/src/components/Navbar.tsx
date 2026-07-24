import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useIsAdmin } from '../auth/AuthProvider'

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    height: 56,
    background: '#2d2d2d',
    color: '#fff',
    gap: 24,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: { fontWeight: 700, fontSize: 18, marginRight: 'auto' },
  link: { fontSize: 14, opacity: 0.85 },
  btn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'transparent',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
}

export function Navbar() {
  const auth = useAuth()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()

  const handleSignIn = () => auth.signinRedirect()
  const handleSignOut = () => auth.signoutRedirect()

  return (
    <nav style={styles.nav}>
      <Link to="/" style={{ ...styles.brand, color: '#fff' }}>
        Ceramics Co.
      </Link>
      <Link to="/" style={{ color: '#fff', fontSize: 14 }}>
        Shop
      </Link>
      {auth.isAuthenticated && (
        <>
          <Link to="/cart" style={{ color: '#fff', fontSize: 14 }}>
            Cart
          </Link>
          <Link to="/orders" style={{ color: '#fff', fontSize: 14 }}>
            Orders
          </Link>
        </>
      )}
      {isAdmin && (
        <Link to="/admin" style={{ color: '#e8c97a', fontSize: 14, fontWeight: 600 }}>
          Admin
        </Link>
      )}
      <div style={{ marginLeft: 'auto' }}>
        {auth.isAuthenticated ? (
          <button style={styles.btn} onClick={handleSignOut}>
            Sign out
          </button>
        ) : (
          <button style={styles.btn} onClick={handleSignIn}>
            Sign in
          </button>
        )}
      </div>
    </nav>
  )
}
