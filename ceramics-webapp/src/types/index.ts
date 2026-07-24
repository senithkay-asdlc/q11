export interface Product {
  id: string
  name: string
  description?: string
  category: string
  price: number
  imageUrls?: string[]
  stockQuantity: number
  createdAt?: string
  updatedAt?: string
}

export interface ProductInput {
  name: string
  description?: string
  category: string
  price: number
  imageUrls?: string[]
  stockQuantity: number
}

export interface CartItem {
  id: string
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
  subtotal?: number
}

export interface Cart {
  id: string
  items: CartItem[]
  total: number
  updatedAt?: string
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode: string
  country: string
  phone?: string
}

export interface CheckoutRequest {
  shippingAddress: ShippingAddress
  paymentMethodToken: string
}

export interface OrderItem {
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Order {
  id: string
  status: 'pending' | 'confirmed' | 'failed'
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  shippingAddress?: ShippingAddress
  paymentReference?: string
  createdAt?: string
}

export interface ApiError {
  code: number
  message: string
  description?: string
  moreInfo?: string
}

export interface PaginatedResponse<T> {
  count: number
  next?: string | null
  previous?: string | null
  data: T[]
}
