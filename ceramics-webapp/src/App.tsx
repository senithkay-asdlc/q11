import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { CatalogHome } from './pages/CatalogHome'
import { ProductDetail } from './pages/ProductDetail'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { OrderHistory } from './pages/OrderHistory'
import { AdminProductList } from './pages/AdminProductList'
import { AdminProductForm } from './pages/AdminProductForm'
import { ProtectedRoute } from './components/ProtectedRoute'

/** Handles the OIDC redirect callback at /auth/callback */
function AuthCallback() {
  const auth = useAuth()
  if (auth.isLoading) return <div style={{ padding: 48, textAlign: 'center' }}>Completing sign in…</div>
  if (auth.error) return <div style={{ padding: 48, textAlign: 'center', color: '#b00020' }}>Sign-in error: {auth.error.message}</div>
  return <Navigate to="/" replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogHome />} />
      <Route path="/products/:productId" element={<ProductDetail />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/cart"
        element={
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order-confirmation/:orderId"
        element={
          <ProtectedRoute>
            <OrderConfirmation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrderHistory />
          </ProtectedRoute>
        }
      />

      {/* Admin routes — require administrator role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminProductList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/:productId"
        element={
          <ProtectedRoute requireAdmin>
            <AdminProductForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/new"
        element={
          <ProtectedRoute requireAdmin>
            <AdminProductForm />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
