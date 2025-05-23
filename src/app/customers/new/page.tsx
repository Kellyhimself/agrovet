'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useOffline } from '@/lib/offline-context'
import { offlineStorage } from '@/lib/offline'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

type CustomerFormData = {
  name: string
  phone: string | null
  preferences: string | null
}

export default function NewCustomerPage() {
  const router = useRouter()
  const { shop } = useShop()
  const { isOnline } = useOffline()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    preferences: ''
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!shop?.id) throw new Error('No shop found')

      const customerId = uuidv4()
      const customer = {
        id: customerId,
        shop_id: shop.id,
        name: data.name,
        phone: data.phone || null,
        preferences: data.preferences || null,
        created_at: new Date().toISOString()
      }

      if (!isOnline) {
        await offlineStorage.saveOfflineCustomer(customer)
        return customer
      }

      const { error } = await supabase
        .from('customers')
        .insert(customer)

      if (error) throw error
      return customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', shop?.id] })
      toast.success('Customer created successfully')
      router.push('/customers')
    },
    onError: (error) => {
      toast.error('Failed to create customer')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync(formData)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">New Customer</h1>
          <p className="mt-2 text-sm text-gray-700">
            Add a new customer to your shop.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl">
        <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="preferences" className="block text-sm font-medium text-gray-700">
              Preferences <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              id="preferences"
              rows={3}
              value={formData.preferences || ''}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              placeholder="Enter customer preferences, frequently bought products, etc."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 