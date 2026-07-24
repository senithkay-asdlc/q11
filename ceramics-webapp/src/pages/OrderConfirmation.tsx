import React, { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { getOrder } from '../api/client'
import type { Order } from '../types'
import { Navbar } from '../components/Navbar'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 800, margin: '0 auto', padding: '40px 16px' },
  badge: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    background: '#e8f7ee',
    color: '#2a8c4a',
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 16,
  },
  heading: { fontSize: 30, fontWeight: 700, marginBottom: 8 },
  subtext: { color: '#555', marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: 24, marginBottom: 24 },
  th: { textAlign: 'left' as const, padding: '10px 14px', borderBottom: '2px solid #e5e5e5', fontSize: 13, color: '#666', fontWeight: 600 },
  td: { padding: '12px 14px', borderBottom: '1px solid #f0f0f0' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  secBtn: { padding: '10px 22px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 },
  primBtn: { padding: '10px 28px', background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  summary: { background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 10, padding: 20, marginBottom: 24 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#555' },
  summaryTotal: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid #e5e5e5', paddingTop: 10, marginTop: 6 },
}

export function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>()
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(location.state?.order ?? null)
  const [loading, setLoading] = useState(!order)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order || !orderId) return
    getOrder(orderId)
      .then(setOrder)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [orderId, order])

  if (loading) return <div style={s.page}><Navbar /><div style={{ padding: 48, textAlign: 'center' }}>Loading…</div></div>
  if (error || !order) return <div style={s.page}><Navbar /><div style={{ padding: 48, textAlign: 'center', color: '#b00020' }}>{error || 'Order not found'}</div></div>

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.badge}>Confirmed</div>
        <h1 style={s.heading}>Order confirmed</h1>
        <p style={s.subtext}>Order #{order.id} — thank you for your purchase!</p>
        <p style={s.subtext}>A summary has been saved to your order history.</p>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Product</th>
              <th style={s.th}>Quantity</th>
              <th style={s.th}>Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td style={s.td}>{item.productName ?? item.productId}</td>
                <td style={s.td}>{item.quantity}</td>
                <td style={s.td}>${item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={s.summary}>
          <div style={s.summaryRow}><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
          <div style={s.summaryRow}><span>Shipping</span><span>${order.shippingCost.toFixed(2)}</span></div>
          <div style={s.summaryRow}><span>Tax</span><span>${order.tax.toFixed(2)}</span></div>
          <div style={s.summaryTotal}><span>Total</span><span>${order.total.toFixed(2)}</span></div>
        </div>

        <div style={s.actions}>
          <Link to="/orders"><button style={s.secBtn}>View order history</button></Link>
          <Link to="/"><button style={s.primBtn}>Continue shopping</button></Link>
        </div>
      </div>
    </div>
  )
}
