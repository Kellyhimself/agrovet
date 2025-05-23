'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useOffline } from '@/lib/offline-context'
import { offlineStorage } from '@/lib/offline'
import { toast } from 'sonner'
import { Customer } from '@/types'

type CustomerFormData = {
  name: string
  phone: string | null
  preferences: string | null
}

export default function EditCustomerPage({ params }: { params: { id: string } }) {
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

  // Fetch customer data
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', params.id],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')
      if (!isOnline) {
        const offlineCustomers = await offlineStorage.getOfflineCustomers(shop.id)
        return offlineCustomers.find(c => c.id === params.id)
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', params.id)
        .eq('shop_id', shop.id)
        .single()

      if (error) throw error
      return data as Customer
    }
  })

  // Update form data when customer is loaded
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        preferences: customer.preferences || ''
      })
    }
  }, [customer])

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!shop?.id) throw new Error('No shop found')

      const updatedCustomer = {
        name: data.name,
        phone: data.phone || null,
        preferences: data.preferences || null
      }

      if (!isOnline) {
        await offlineStorage.updateOfflineCustomer(params.id, updatedCustomer)
        return updatedCustomer
      }

      const { error } = await supabase
        .from('customers')
        .update(updatedCustomer)
        .eq('id', params.id)
        .eq('shop_id', shop.id)

      if (error) throw error
      return updatedCustomer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      toast.success('Customer updated successfully')
      router.push('/customers')
    },
    onError: (error) => {
      toast.error('Failed to update customer')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateMutation.mutateAsync(formData)
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Customer not found</h1>
          <p className="mt-2 text-sm text-gray-700">
            The customer you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.back()}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Edit Customer</h1>
          <p className="mt-2 text-sm text-gray-700">
            Update customer information.
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
              disabled={updateMutation.isPending}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 