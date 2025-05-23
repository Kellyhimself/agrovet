export type SaleFormData = {
  product_id: string
  customer_id: string | null
  quantity: number
  total_price: number
  payment_method: string
  sale_date: string
  product_name?: string
  customer_name?: string
  items?: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit: string
    quantity_per_unit: number
    price_per_unit: number
    total_price: number
  }>
}

export type Product = {
  id: string
  name: string
  description: string | null
  category: string | null
  purchase_price: number
  selling_price: number
  quantity: number
  shop_id: string
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  shop_id: string
  created_at: string
  updated_at: string
} 