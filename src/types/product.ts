export type Product = {
  id: string
  name: string
  category: string
  quantity: number
  purchase_price: number
  selling_price: number
  expiry_date: string | null
  is_regulated: boolean
  barcode: string | null
  created_at: string
}

export type ProductFormData = {
  name: string
  category: string
  quantity: number
  quantity_per_unit: number
  purchase_price: number
  selling_price: number
  expiry_date: string | null
  is_regulated: boolean
  barcode: string | null
  unit: string
}

export type ProductCategory = 'fertilizer' | 'seed' | 'veterinary' | 'pesticide' | 'feeds' | 'equipment' | 'other' 