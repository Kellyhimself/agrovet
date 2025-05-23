'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ShopUser, ShopUserRole } from '@/types/shop'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import { inviteShopUser } from '@/app/actions/shop'

// Define the type for the view data
type ShopUserWithEmail = ShopUser & {
  email: string | null
}

export default function ShopUsers() {
  const { shop, userRole } = useShop()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ShopUserRole>('employee')
  const [shopUsers, setShopUsers] = useState<ShopUserWithEmail[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch shop users
  useEffect(() => {
    if (!shop) return

    const fetchShopUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('shop_users_with_emails')
          .select('*')
          .eq('shop_id', shop.id)

        if (error) throw error
        setShopUsers(data || [])
      } catch (err) {
        console.error('Error fetching shop users:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch shop users')
      }
    }

    fetchShopUsers()
  }, [shop, supabase])

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop || !user) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await inviteShopUser(inviteEmail, shop.id, inviteRole)

      if ('error' in result) {
        throw new Error(result.error)
      }

      // Refresh the users list using the view
      const { data: updatedUsers, error: fetchError } = await supabase
        .from('shop_users_with_emails')
        .select('*')
        .eq('shop_id', shop.id)

      if (fetchError) throw fetchError
      setShopUsers(updatedUsers || [])

      // Reset form
      setInviteEmail('')
      setInviteRole('employee')
    } catch (err) {
      console.error('Error inviting user:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while inviting user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!shop) return

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('shop_users')
        .delete()
        .eq('shop_id', shop.id)
        .eq('user_id', userId)

      if (error) throw error

      // Update the local state
      setShopUsers(prevUsers => prevUsers.filter(u => u.user_id !== userId))
    } catch (err) {
      console.error('Error removing user:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while removing user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: ShopUserRole) => {
    if (!shop) return

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('shop_users')
        .update({ role: newRole })
        .eq('shop_id', shop.id)
        .eq('user_id', userId)

      if (error) throw error

      // Update the local state
      setShopUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId ? { ...u, role: newRole } : u
        )
      )
    } catch (err) {
      console.error('Error updating role:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while updating role')
    } finally {
      setIsLoading(false)
    }
  }

  if (!shop || userRole !== 'owner') {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Shop Users</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage users who have access to your shop
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleInviteUser} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as ShopUserRole)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Inviting...' : 'Invite User'}
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-900">Current Users</h3>
        <div className="mt-4 divide-y divide-gray-200">
          {shopUsers.map((shopUser) => (
            <div key={shopUser.id} className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {shopUser.email || shopUser.user_id}
                </p>
                <p className="text-sm text-gray-500">Role: {shopUser.role}</p>
              </div>
              <div className="flex space-x-2">
                <select
                  value={shopUser.role}
                  onChange={(e) => handleUpdateRole(shopUser.user_id, e.target.value as ShopUserRole)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
                <button
                  onClick={() => handleRemoveUser(shopUser.user_id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 