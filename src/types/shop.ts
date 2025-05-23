export type Shop = {
  id: string
  name: string
  agrovet_id: string
  location: string
  phone: string
  business_type: 'agrovet' | 'veterinary' | 'farm_supplies' | 'other'
  opening_hours: string
  description: string
  subscription_status: 'trial' | 'active' | 'expired'
  trial_start_date: string
  subscription_end_date: string | null
  created_at: string
}

export type ShopFormData = Omit<Shop, 'id' | 'subscription_status' | 'trial_start_date' | 'subscription_end_date' | 'created_at'>

export type SubscriptionStatus = 'trial' | 'active' | 'expired'

export type ShopUserRole = 'owner' | 'manager' | 'employee'

export type ShopUser = {
  id: string
  shop_id: string
  user_id: string
  role: ShopUserRole
  created_at: string
}

export type ShopWithUsers = Shop & {
  users: ShopUser[]
} 