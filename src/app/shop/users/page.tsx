'use client'

import { useAuth } from '@/components/AuthContext'
import { useShop } from '@/components/ShopContext'
import ShopUsers from '@/components/shop/ShopUsers'

export default function ShopUsersPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { shop, userRole, isLoading: isShopLoading } = useShop()

  // Show loading state while contexts are initializing
  if (isAuthLoading || isShopLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Loading...
          </h2>
        </div>
      </div>
    )
  }

  // Check authentication
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Please Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You must be signed in to access this page
          </p>
        </div>
      </div>
    )
  }

  // Check shop ownership
  if (!shop || userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Only shop owners can manage users
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ShopUsers />
      </div>
    </div>
  )
} 