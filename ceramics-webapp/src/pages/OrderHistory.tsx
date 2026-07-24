import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOrders } from '../api/client'
import type { Order } from '../types'
import { Navbar } from '../components/Navbar'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 28 },
  empty: { padding: 40, textAlign: 'center' as const, color: '#666' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 14px', borderBottom: '2px solid #e5e5e5', fontSize: 13, color: '#666', fontWeight: 600 },
  tr: { cursor: 'pointer' },
  td: { padding: '14px', borderBottom: '1px solid #f0f0f0' },
  statusConfirmed: { color: '#2a8c4a', fontWeight: 500 },
  statusFailed: { color: '#b00020', fontWeight: 500 },
  statusPending: { color: '#b06400', fontWeight: 500 },
}

function statusStyle(status: Order['status']): React.CSSProperties {
  if (status === 'confirmed') return s.statusConfirmed
  if (status === 'failed') return s.statusFailed
  return s.statusPending
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function OrderHistory() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listOrders({ limit: 50 })
      .then((res) => setOrders(res.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <h1 style={s.heading}>Your Orders</h1>

        {loading && <div style={s.empty}>Loading orders…</div>}
        {error && <div style={{ ...s.empty, color: '#b00020' }}>{error}</div>}

        {!loading && !error && orders.length === 0 && (
          <div style={s.empty}>You haven't placed any orders yet.</div>
        )}

        {!loading && !error && orders.length > 0 && (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Order</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Total</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  style={s.tr}
                  onClick={() => navigate(`/order-confirmation/${order.id}`)}
                >
                  <td style={s.td}>{order.id}</td>
                  <td style={s.td}>{fmtDate(order.createdAt)}</td>
                  <td style={s.td}>${order.total.toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={statusStyle(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
