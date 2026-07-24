import { env } from '../env'
import type {
  Cart,
  CartItem,
  CheckoutRequest,
  Order,
  PaginatedResponse,
  Product,
  ProductInput,
} from '../types'

type TokenGetter = () => string | null | undefined

let getToken: TokenGetter = () => null

export function setTokenGetter(getter: TokenGetter) {
  getToken = getter
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = env.CERAMICS_API_URL.replace(/\/$/, '')
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${base}${path}`, { ...options, headers })

  if (!res.ok) {
    let errBody: { message?: string } = {}
    try {
      errBody = await res.json()
    } catch {
      // ignore
    }
    throw new Error(errBody.message ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ─── Products ───────────────────────────────────────────────────────────────

export function listProducts(params?: {
  q?: string
  category?: string
  limit?: number
  offset?: number
}): Promise<PaginatedResponse<Product>> {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.category) qs.set('category', params.category)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request<PaginatedResponse<Product>>(`/products${query}`)
}

export function getProduct(productId: string): Promise<Product> {
  return request<Product>(`/products/${productId}`)
}

export function createProduct(input: ProductInput): Promise<Product> {
  return request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProduct(productId: string, input: ProductInput): Promise<Product> {
  return request<Product>(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteProduct(productId: string): Promise<void> {
  return request<void>(`/products/${productId}`, { method: 'DELETE' })
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export function getCart(): Promise<Cart> {
  return request<Cart>('/cart')
}

export function addCartItem(input: { productId: string; quantity: number }): Promise<Cart> {
  return request<Cart>('/cart/items', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return request<Cart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

export function removeCartItem(itemId: string): Promise<void> {
  return request<void>(`/cart/items/${itemId}`, { method: 'DELETE' })
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export function checkout(payload: CheckoutRequest): Promise<Order> {
  return request<Order>('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function listOrders(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Order>> {
  const qs = new URLSearchParams()
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request<PaginatedResponse<Order>>(`/orders${query}`)
}

export function getOrder(orderId: string): Promise<Order> {
  return request<Order>(`/orders/${orderId}`)
}

// re-export CartItem for convenience
export type { CartItem }
