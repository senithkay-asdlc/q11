import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listProducts } from '../api/client'
import type { Product } from '../types'
import { Navbar } from '../components/Navbar'

const CATEGORIES = ['All', 'Mugs', 'Bowls', 'Vases', 'Plates', 'Decor']

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  searchRow: { display: 'flex', gap: 10, marginBottom: 20 },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    fontSize: 15,
  },
  searchBtn: {
    padding: '10px 20px',
    background: '#2d2d2d',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  catRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    border: '1px solid #e5e5e5',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#fff',
    cursor: 'pointer',
  },
  imgPlaceholder: {
    width: '100%',
    height: 200,
    background: '#f0ece6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
  },
  cardBody: { padding: '14px 16px 18px' },
  cardName: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  cardPrice: { fontSize: 17, fontWeight: 700, color: '#2d2d2d', marginBottom: 6 },
  stockOk: { fontSize: 12, color: '#2a8c4a', background: '#e8f7ee', padding: '2px 8px', borderRadius: 12, display: 'inline-block' },
  stockLow: { fontSize: 12, color: '#b06400', background: '#fff3e0', padding: '2px 8px', borderRadius: 12, display: 'inline-block' },
  stockOut: { fontSize: 12, color: '#b00020', background: '#fce8ec', padding: '2px 8px', borderRadius: 12, display: 'inline-block' },
  empty: { padding: 48, textAlign: 'center', color: '#666' },
  error: { padding: 48, textAlign: 'center', color: '#b00020' },
  pagination: { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 },
  pageBtn: {
    padding: '8px 18px',
    border: '1px solid #ccc',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
  },
  pageBtnDisabled: {
    padding: '8px 18px',
    border: '1px solid #ccc',
    borderRadius: 6,
    background: '#fff',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  catBadgeActive: {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1px solid #2d2d2d',
    background: '#2d2d2d',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  catBadgeInactive: {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1px solid #ccc',
    background: '#fff',
    color: '#333',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 400,
  },
}

function stockLabel(q: number) {
  if (q === 0) return <span style={s.stockOut}>Out of stock</span>
  if (q <= 3) return <span style={s.stockLow}>Only {q} left</span>
  return <span style={s.stockOk}>In stock</span>
}

const PAGE_SIZE = 12

export function CatalogHome() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [category, setCategory] = useState('All')
  const [searchText, setSearchText] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listProducts({
      q: query || undefined,
      category: category === 'All' ? undefined : category,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        setProducts(res.data)
        setTotal(res.count)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [query, category, offset])

  useEffect(() => {
    load()
  }, [load])

  const handleCategoryChange = (cat: string) => {
    setCategory(cat)
    setOffset(0)
  }

  const handleSearch = () => {
    setQuery(searchText)
    setOffset(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <h1 style={s.heading}>Handmade Ceramics</h1>

        <div style={s.searchRow}>
          <input
            style={s.searchInput}
            placeholder="Search mugs, bowls, vases…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button style={s.searchBtn} onClick={handleSearch}>
            Search
          </button>
        </div>

        <div style={s.catRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              style={cat === category ? s.catBadgeActive : s.catBadgeInactive}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <div style={s.empty}>Loading products…</div>}
        {error && <div style={s.error}>{error}</div>}

        {!loading && !error && products.length === 0 && (
          <div style={s.empty}>No products found.</div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div style={s.grid}>
              {products.map((p) => (
                <div
                  key={p.id}
                  style={s.card}
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <div style={s.imgPlaceholder}>
                    {p.imageUrls && p.imageUrls.length > 0 ? (
                      <img src={p.imageUrls[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '🏺'
                    )}
                  </div>
                  <div style={s.cardBody}>
                    <div style={s.cardName}>{p.name}</div>
                    <div style={s.cardPrice}>${p.price.toFixed(2)}</div>
                    {stockLabel(p.stockQuantity)}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={s.pagination}>
                <button
                  style={offset === 0 ? s.pageBtnDisabled : s.pageBtn}
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  ← Previous
                </button>
                <span style={{ padding: '8px 4px', fontSize: 14 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  style={offset + PAGE_SIZE >= total ? s.pageBtnDisabled : s.pageBtn}
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
