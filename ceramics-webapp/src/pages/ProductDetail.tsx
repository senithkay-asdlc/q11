import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { getProduct, addCartItem } from '../api/client'
import type { Product } from '../types'
import { Navbar } from '../components/Navbar'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 1000, margin: '0 auto', padding: '32px 16px' },
  breadcrumb: { fontSize: 13, color: '#666', marginBottom: 24 },
  split: { display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 40 },
  imgPlaceholder: {
    width: '100%',
    aspectRatio: '4/3',
    background: '#f0ece6',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 80,
    marginBottom: 20,
  },
  heading: { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#555', lineHeight: 1.7, marginBottom: 12 },
  meta: { fontSize: 13, color: '#888', marginBottom: 20 },
  price: { fontSize: 30, fontWeight: 700, marginBottom: 12 },
  stockOk: { fontSize: 13, color: '#2a8c4a', background: '#e8f7ee', padding: '4px 12px', borderRadius: 12, display: 'inline-block', marginBottom: 20 },
  stockLow: { fontSize: 13, color: '#b06400', background: '#fff3e0', padding: '4px 12px', borderRadius: 12, display: 'inline-block', marginBottom: 20 },
  stockOut: { fontSize: 13, color: '#b00020', background: '#fce8ec', padding: '4px 12px', borderRadius: 12, display: 'inline-block', marginBottom: 20 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  qtyLabel: { fontSize: 14, fontWeight: 500 },
  qtySelect: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
  addBtn: {
    width: '100%',
    padding: '12px 0',
    background: '#2d2d2d',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 10,
  },
  disabledBtn: {
    width: '100%',
    padding: '12px 0',
    background: '#ccc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
    marginBottom: 10,
  },
  shippingNote: { fontSize: 12, color: '#666', textAlign: 'center' as const },
  error: { color: '#b00020', padding: 48, textAlign: 'center' as const },
  success: { color: '#2a8c4a', fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  errMsg: { color: '#b00020', fontSize: 14, marginTop: 8, textAlign: 'center' as const },
}

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>()
  const auth = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    getProduct(productId)
      .then(setProduct)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [productId])

  const handleAddToCart = async () => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect()
      return
    }
    if (!product) return
    setAdding(true)
    setAddMsg('')
    setAddError('')
    try {
      await addCartItem({ productId: product.id, quantity: qty })
      setAddMsg('Added to cart!')
    } catch (e) {
      setAddError(String(e))
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div style={s.page}><Navbar /><div style={s.error}>Loading…</div></div>
  if (error || !product) return <div style={s.page}><Navbar /><div style={s.error}>{error || 'Product not found'}</div></div>

  const maxQty = product.stockQuantity
  const qtyOptions = Array.from({ length: Math.min(maxQty, 10) }, (_, i) => i + 1)

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.breadcrumb}>
          <Link to="/">Shop</Link> / {product.category} / {product.name}
        </div>

        <div style={s.split}>
          <div>
            <div style={s.imgPlaceholder}>
              {product.imageUrls && product.imageUrls.length > 0 ? (
                <img src={product.imageUrls[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
              ) : (
                '🏺'
              )}
            </div>
            <h1 style={s.heading}>{product.name}</h1>
            {product.description && <p style={s.desc}>{product.description}</p>}
            <p style={s.meta}>Category: {product.category}</p>
          </div>

          <div>
            <div style={s.price}>${product.price.toFixed(2)}</div>
            {maxQty === 0 ? (
              <span style={s.stockOut}>Out of stock</span>
            ) : maxQty <= 3 ? (
              <span style={s.stockLow}>Only {maxQty} available</span>
            ) : (
              <span style={s.stockOk}>In stock — {maxQty} available</span>
            )}

            {maxQty > 0 && (
              <div style={s.qtyRow}>
                <span style={s.qtyLabel}>Quantity:</span>
                <select
                  style={s.qtySelect}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                >
                  {qtyOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              style={maxQty > 0 ? s.addBtn : s.disabledBtn}
              onClick={handleAddToCart}
              disabled={maxQty === 0 || adding}
            >
              {adding ? 'Adding…' : maxQty === 0 ? 'Out of stock' : 'Add to cart'}
            </button>

            {addMsg && <div style={s.success}>{addMsg} <button onClick={() => navigate('/cart')} style={{ background: 'none', border: 'none', color: '#2a8c4a', textDecoration: 'underline', cursor: 'pointer' }}>View cart →</button></div>}
            {addError && <div style={s.errMsg}>{addError}</div>}

            <p style={s.shippingNote}>Free shipping on orders over $75</p>
          </div>
        </div>
      </div>
    </div>
  )
}
