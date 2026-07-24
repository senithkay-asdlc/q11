import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, deleteProduct } from '../api/client'
import type { ProductInput } from '../types'
import { Navbar } from '../components/Navbar'

const CATEGORIES = ['Mugs', 'Bowls', 'Vases', 'Plates', 'Decor', 'Other']

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 700, margin: '0 auto', padding: '32px 16px' },
  breadcrumb: { fontSize: 13, color: '#666', marginBottom: 20 },
  heading: { fontSize: 26, fontWeight: 700, marginBottom: 28 },
  inputGroup: { marginBottom: 18 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5, color: '#444' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, minHeight: 100, resize: 'vertical' as const },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
  row: { display: 'flex', gap: 16 },
  imgPlaceholder: {
    width: 320,
    height: 200,
    background: '#f0ece6',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
    marginBottom: 8,
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 },
  saveBtn: { padding: '11px 28px', background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  delBtn: { padding: '11px 22px', background: '#b00020', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  cancelBtn: { padding: '11px 18px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 },
  error: { color: '#b00020', background: '#fce8ec', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 },
  success: { color: '#2a8c4a', background: '#e8f7ee', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 },
}

export function AdminProductForm() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const isNew = !productId || productId === 'new'

  const [form, setForm] = useState<ProductInput>({
    name: '',
    description: '',
    category: 'Mugs',
    price: 0,
    stockQuantity: 0,
    imageUrls: [],
  })
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    getProduct(productId!)
      .then((p) => {
        setForm({
          name: p.name,
          description: p.description ?? '',
          category: p.category,
          price: p.price,
          stockQuantity: p.stockQuantity,
          imageUrls: p.imageUrls ?? [],
        })
        setImageUrl((p.imageUrls ?? [])[0] ?? '')
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [isNew, productId])

  const handleChange = (field: keyof ProductInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'price' || field === 'stockQuantity' ? Number(e.target.value) : e.target.value,
    }))
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    const payload: ProductInput = {
      ...form,
      imageUrls: imageUrl ? [imageUrl] : [],
    }
    try {
      if (isNew) {
        await createProduct(payload)
        setSuccess('Product created successfully.')
        setTimeout(() => navigate('/admin'), 1200)
      } else {
        await updateProduct(productId!, payload)
        setSuccess('Product updated successfully.')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!productId || isNew) return
    if (!window.confirm('Delete this product? This cannot be undone.')) return
    setSaving(true)
    try {
      await deleteProduct(productId)
      navigate('/admin')
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  if (loading) return <div style={s.page}><Navbar /><div style={{ padding: 48, textAlign: 'center' }}>Loading…</div></div>

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <div style={s.breadcrumb}>
          <Link to="/admin">Admin</Link> / <Link to="/admin">Products</Link> / {isNew ? 'New product' : form.name}
        </div>
        <h1 style={s.heading}>{isNew ? 'New Product' : 'Edit Product'}</h1>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <div style={s.inputGroup}>
          <label style={s.label}>Name</label>
          <input style={s.input} placeholder="e.g. Speckled Stoneware Mug" value={form.name} onChange={handleChange('name')} />
        </div>

        <div style={s.inputGroup}>
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} value={form.description} onChange={handleChange('description')} />
        </div>

        <div style={{ ...s.row, ...s.inputGroup }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Category</label>
            <select style={s.select} value={form.category} onChange={handleChange('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Price (USD)</label>
            <input style={s.input} type="number" min="0" step="0.01" value={form.price} onChange={handleChange('price')} />
          </div>
        </div>

        <div style={s.inputGroup}>
          <label style={s.label}>Stock quantity</label>
          <input style={s.input} type="number" min="0" value={form.stockQuantity} onChange={handleChange('stockQuantity')} />
        </div>

        <div style={s.inputGroup}>
          <label style={s.label}>Product image URL</label>
          <input style={s.input} placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          {imageUrl && (
            <div style={s.imgPlaceholder}>
              <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
          {!imageUrl && <div style={s.imgPlaceholder}>🏺</div>}
        </div>

        <div style={s.actions}>
          {!isNew && (
            <button style={s.delBtn} onClick={handleDelete} disabled={saving}>Delete</button>
          )}
          <button style={s.cancelBtn} onClick={() => navigate('/admin')} disabled={saving}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </div>
    </div>
  )
}
