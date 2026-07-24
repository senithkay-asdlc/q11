import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listProducts, deleteProduct } from '../api/client'
import type { Product } from '../types'
import { Navbar } from '../components/Navbar'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 1000, margin: '0 auto', padding: '32px 16px' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: 700 },
  newBtn: { padding: '10px 22px', background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 14px', borderBottom: '2px solid #e5e5e5', fontSize: 13, color: '#666', fontWeight: 600 },
  td: { padding: '13px 14px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' as const },
  editLink: { color: '#2d2d2d', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, background: 'none', border: 'none' },
  delBtn: { color: '#b00020', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, background: 'none', border: 'none', marginLeft: 12 },
  empty: { padding: 40, textAlign: 'center' as const, color: '#666' },
  error: { padding: 40, textAlign: 'center' as const, color: '#b00020' },
  outOfStock: { color: '#b00020' },
}

export function AdminProductList() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listProducts({ limit: 100 })
      .then((res) => setProducts(res.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    try {
      await deleteProduct(product.id)
      load()
    } catch (e) {
      alert(`Delete failed: ${String(e)}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.topRow}>
          <h1 style={s.heading}>Manage Products</h1>
          <button style={s.newBtn} onClick={() => navigate('/admin/products/new')}>
            New product
          </button>
        </div>

        {loading && <div style={s.empty}>Loading products…</div>}
        {error && <div style={s.error}>{error}</div>}

        {!loading && !error && products.length === 0 && (
          <div style={s.empty}>No products yet. Create the first one!</div>
        )}

        {!loading && !error && products.length > 0 && (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Product</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Price</th>
                <th style={s.th}>Stock</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={s.td}>{p.name}</td>
                  <td style={s.td}>{p.category}</td>
                  <td style={s.td}>${p.price.toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={p.stockQuantity === 0 ? s.outOfStock : undefined}>
                      {p.stockQuantity}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.editLink} onClick={() => navigate(`/admin/products/${p.id}`)}>
                      Edit →
                    </button>
                    <button
                      style={s.delBtn}
                      onClick={() => handleDelete(p)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? 'Deleting…' : 'Delete'}
                    </button>
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
