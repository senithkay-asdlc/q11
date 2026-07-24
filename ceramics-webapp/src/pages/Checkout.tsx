import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, checkout } from '../api/client'
import type { Cart, Order, ShippingAddress } from '../types'
import { Navbar } from '../components/Navbar'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh' },
  container: { maxWidth: 1000, margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 28 },
  split: { display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 40, alignItems: 'start' },
  section: { marginBottom: 28 },
  sectionHeading: { fontSize: 17, fontWeight: 700, marginBottom: 14 },
  inputGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#444' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
  row: { display: 'flex', gap: 12 },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
  summaryCard: {
    border: '1px solid #e5e5e5',
    borderRadius: 10,
    padding: 20,
    background: '#fff',
    position: 'sticky' as const,
    top: 80,
  },
  summaryHeading: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 },
  summaryTotal: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid #e5e5e5', paddingTop: 12, marginTop: 8 },
  placeBtn: {
    width: '100%',
    padding: '13px 0',
    background: '#2d2d2d',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 20,
  },
  disabledBtn: {
    width: '100%',
    padding: '13px 0',
    background: '#ccc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
    marginTop: 20,
  },
  error: { color: '#b00020', background: '#fce8ec', padding: '12px 16px', borderRadius: 8, marginTop: 16, fontSize: 14 },
}

const SHIPPING_RATE = 6
const TAX_RATE = 0.08

export function Checkout() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'United States',
    cardNumber: '',
    expiry: '',
    cvc: '',
  })

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const subtotal = cart?.total ?? 0
  const shipping = subtotal > 75 ? 0 : SHIPPING_RATE
  const tax = parseFloat(((subtotal + shipping) * TAX_RATE).toFixed(2))
  const total = subtotal + shipping + tax

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    const shippingAddress: ShippingAddress = {
      name: form.name,
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      postalCode: form.postalCode,
      country: form.country,
    }
    // Tokenise card: in a real app this would call Stripe/etc.
    // We send a placeholder token to the API.
    const paymentMethodToken = `tok_${form.cardNumber.replace(/\s/g, '').slice(-4)}_${Date.now()}`

    try {
      const order: Order = await checkout({ shippingAddress, paymentMethodToken })
      navigate(`/order-confirmation/${order.id}`, { state: { order } })
    } catch (e) {
      setError(
        String(e).includes('409')
          ? 'Payment declined or insufficient stock. Your cart has been preserved — please try again or adjust your cart.'
          : `Checkout failed: ${String(e)}`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const formValid =
    form.name && form.line1 && form.city && form.postalCode && form.country &&
    form.cardNumber && form.expiry && form.cvc

  if (loading) return <div style={s.page}><Navbar /><div style={{ padding: 48, textAlign: 'center' }}>Loading…</div></div>

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.container}>
        <h1 style={s.heading}>Checkout</h1>

        <div style={s.split}>
          <div>
            <div style={s.section}>
              <h2 style={s.sectionHeading}>Shipping address</h2>
              <div style={s.inputGroup}>
                <label style={s.label}>Full name</label>
                <input style={s.input} value={form.name} onChange={handleChange('name')} />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Address line 1</label>
                <input style={s.input} value={form.line1} onChange={handleChange('line1')} />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Address line 2 (optional)</label>
                <input style={s.input} value={form.line2} onChange={handleChange('line2')} />
              </div>
              <div style={{ ...s.row, ...s.inputGroup }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>City</label>
                  <input style={s.input} value={form.city} onChange={handleChange('city')} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Postal code</label>
                  <input style={s.input} value={form.postalCode} onChange={handleChange('postalCode')} />
                </div>
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Country</label>
                <select style={s.select} value={form.country} onChange={handleChange('country')}>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Australia</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div style={s.section}>
              <h2 style={s.sectionHeading}>Payment</h2>
              <div style={s.inputGroup}>
                <label style={s.label}>Card number</label>
                <input style={s.input} placeholder="1234 5678 9012 3456" value={form.cardNumber} onChange={handleChange('cardNumber')} maxLength={19} />
              </div>
              <div style={{ ...s.row, ...s.inputGroup }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Expiry</label>
                  <input style={s.input} placeholder="MM/YY" value={form.expiry} onChange={handleChange('expiry')} maxLength={5} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>CVC</label>
                  <input style={s.input} placeholder="123" value={form.cvc} onChange={handleChange('cvc')} maxLength={4} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={s.summaryCard}>
              <h2 style={s.summaryHeading}>Order summary</h2>
              {cart?.items.map((item) => (
                <div key={item.id} style={s.summaryRow}>
                  <span>{item.productName ?? item.productId} × {item.quantity}</span>
                  <span>${((item.subtotal ?? item.unitPrice * item.quantity)).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
                <div style={s.summaryRow}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div style={s.summaryRow}><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
                <div style={s.summaryRow}><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              </div>
              <div style={s.summaryTotal}><span>Total</span><span>${total.toFixed(2)}</span></div>

              {error && <div style={s.error}>{error}</div>}

              <button
                style={formValid ? s.placeBtn : s.disabledBtn}
                disabled={!formValid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Placing order…' : 'Place order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
