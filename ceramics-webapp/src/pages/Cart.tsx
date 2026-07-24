import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCart, updateCartItem, removeCartItem } from '../api/client'
import type { Cart as CartType } from '../types'
import { Navbar } from '../components/Navbar'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 28 },
  empty: { padding: 40, textAlign: 'center' as const, color: '#666' },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginBottom: 24 },
  th: { textAlign: 'left' as const, padding: '10px 14px', borderBottom: '2px solid #e5e5e5', fontSize: 13, color: '#666', fontWeight: 600 },
  td: { padding: '14px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' as const },
  productName: { fontWeight: 500 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 16 },
  qtyNum: { minWidth: 28, textAlign: 'center' as const, fontSize: 14 },
  removeBtn: { background: 'none', border: 'none', color: '#b00020', cursor: 'pointer', fontSize: 13 },
  subtotal: { fontWeight: 500 },
  totalRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: 24 },
  totalText: { fontSize: 18, fontWeight: 700 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  contBtn: { padding: '10px 22px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 },
  checkoutBtn: { padding: '10px 28px', background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 },
  errMsg: { color: '#b00020', fontSize: 13, marginTop: 8 },
}

export function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})

  const loadCart = useCallback(() => {
    setLoading(true)
    setError('')
    getCart()
      .then(setCart)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadCart() }, [loadCart])

  const handleQtyChange = async (itemId: string, qty: number) => {
    setItemErrors((prev) => ({ ...prev, [itemId]: '' }))
    try {
      const updated = await updateCartItem(itemId, qty)
      setCart(updated)
    } catch (e) {
      setItemErrors((prev) => ({ ...prev, [itemId]: String(e) }))
    }
  }

  const handleRemove = async (itemId: string) => {
    setItemErrors((prev) => ({ ...prev, [itemId]: '' }))
    try {
      await removeCartItem(itemId)
      loadCart()
    } catch (e) {
      setItemErrors((prev) => ({ ...prev, [itemId]: String(e) }))
    }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <h1 style={s.heading}>Your Cart</h1>

        {loading && <div style={s.empty}>Loading cart…</div>}
        {error && <div style={{ ...s.empty, color: '#b00020' }}>{error}</div>}

        {!loading && !error && (!cart || cart.items.length === 0) && (
          <div style={s.empty}>
            <p>Your cart is empty.</p>
            <Link to="/" style={{ color: '#2d2d2d', textDecoration: 'underline' }}>Continue shopping →</Link>
          </div>
        )}

        {!loading && !error && cart && cart.items.length > 0 && (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Unit price</th>
                  <th style={s.th}>Quantity</th>
                  <th style={s.th}>Subtotal</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td style={s.td}>
                        <span style={s.productName}>{item.productName ?? item.productId}</span>
                      </td>
                      <td style={s.td}>${item.unitPrice.toFixed(2)}</td>
                      <td style={s.td}>
                        <div style={s.qtyRow}>
                          <button
                            style={s.qtyBtn}
                            onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span style={s.qtyNum}>{item.quantity}</span>
                          <button
                            style={s.qtyBtn}
                            onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={s.subtotal}>
                          ${((item.subtotal != null ? item.subtotal : item.unitPrice * item.quantity)).toFixed(2)}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button style={s.removeBtn} onClick={() => handleRemove(item.id)}>Remove</button>
                      </td>
                    </tr>
                    {itemErrors[item.id] && (
                      <tr>
                        <td colSpan={5} style={{ ...s.td, paddingTop: 0 }}>
                          <span style={s.errMsg}>{itemErrors[item.id]}</span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div style={s.totalRow}>
              <span style={s.totalText}>Cart total: ${cart.total.toFixed(2)}</span>
            </div>

            <div style={s.actions}>
              <button style={s.contBtn} onClick={() => navigate('/')}>Continue shopping</button>
              <button style={s.checkoutBtn} onClick={() => navigate('/checkout')}>
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
