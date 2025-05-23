'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { ShopUser, ShopWithUsers } from '@/types/shop'
import { useAuth } from './AuthContext'

type ShopContextType = {
  shop: ShopWithUsers | null
  isLoading: boolean
  error: string | null
  refreshShop: () => Promise<void>
  userRole: ShopUser['role'] | null
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopWithUsers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<ShopUser['role'] | null>(null)
  const { user } = useAuth()

  const supabase = getSupabaseClient()

  const fetchShopData = async () => {
    if (!user) {
      setShop(null)
      setUserRole(null)
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select(`
          *,
          users:shop_users(*)
        `)
        .eq('users.user_id', user.id)
        .single()

      if (shopError) {
        console.error('Error fetching shop:', shopError)
        setShop(null)
        setUserRole(null)
        setError(shopError.message)
      } else {
        setShop(shopData)
        // Set the user's role
        const currentUser = shopData.users.find((u: ShopUser) => u.user_id === user.id)
        setUserRole(currentUser?.role || null)
        setError(null)
      }
    } catch (error) {
      console.error('Error in fetchShopData:', error)
      setShop(null)
      setUserRole(null)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShopData()
  }, [fetchShopData])

  const refreshShop = async () => {
    await fetchShopData()
  }

  // Don't render children until initial shop check is complete
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <ShopContext.Provider value={{ shop, isLoading, error, refreshShop, userRole }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider')
  }
  return context
} 