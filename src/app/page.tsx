'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function HomePage() {
  const [isChecking, setIsChecking] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkUserAndShop = async () => {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          // If no user, redirect to auth
          window.location.href = '/auth'
          return
        }

        // Check if user has a shop
        const { data: shopUser, error: shopError } = await supabase
          .from('shop_users')
          .select('shop_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (shopError) {
          console.error('Error checking shop membership:', shopError)
          window.location.href = '/auth'
          return
        }

        if (shopUser) {
          // If user has a shop, redirect to dashboard
          window.location.href = '/dashboard'
        } else {
          // If user has no shop, redirect to registration
          window.location.href = '/shop/register'
        }
      } catch (error) {
        console.error('Error in auth check:', error)
        window.location.href = '/auth'
      } finally {
        setIsChecking(false)
      }
    }

    checkUserAndShop()
  }, [supabase])

  if (!isChecking) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  )
}
