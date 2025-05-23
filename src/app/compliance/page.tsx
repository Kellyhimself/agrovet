'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useOffline } from '@/lib/offline-context'
import { offlineStorage } from '@/lib/offline'
import { format } from 'date-fns'

type RegulatedProduct = {
  id: string
  name: string
  category: string
  quantity: number
  expiry_date: string
  regulation_status: string
  sales: {
    id: string
    quantity: number
    sale_date: string
    customer_name: string | null
  }[]
}

export default function CompliancePage() {
  const { shop } = useShop()
  const { isOnline } = useOffline()
  const [dateRange, setDateRange] = useState({
    start: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: products, isLoading } = useQuery({
    queryKey: ['regulated-products', shop?.id, dateRange],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')
      if (!isOnline) {
        const offlineProducts = await offlineStorage.getOfflineProducts(shop.id)
        return offlineProducts.filter(p => p.regulation_status === 'regulated')
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          quantity,
          expiry_date,
          regulation_status,
          sales (
            id,
            quantity,
            sale_date,
            customer:customers (name)
          )
        `)
        .eq('shop_id', shop.id)
        .eq('regulation_status', 'regulated')
        .gte('expiry_date', dateRange.start)
        .lte('expiry_date', dateRange.end)

      if (error) throw error

      // Transform the data to match the expected format
      return data.map(product => ({
        ...product,
        sales: product.sales.map(sale => ({
          ...sale,
          customer_name: sale.customer?.name || null
        }))
      })) as RegulatedProduct[]
    }
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Compliance Tracking</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track sales of regulated products and ensure compliance with regulations.
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {products?.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      Quantity: {product.quantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      Expires: {format(new Date(product.expiry_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {product.sales.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sales History</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                              Date
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Quantity
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Customer
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {product.sales.map((sale) => (
                            <tr key={sale.id}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                                {format(new Date(sale.sale_date), 'MMM d, yyyy')}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                {sale.quantity}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                {sale.customer_name || 'Anonymous'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">No sales recorded in this period.</p>
                )}
              </div>
            ))}

            {products?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No regulated products found in this period.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 