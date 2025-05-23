'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { offlineStorage } from '@/lib/offline'
import CreditSalesList from '@/components/sales/CreditSalesList'
import Receipt from '@/components/sales/Receipt'

// Define the offline sale type inline since AgrovetDB is not exported
type OfflineSale = {
  id: string
  shop_id: string
  product_id: string
  customer_id: string | null
  quantity: number
  total_price: number
  payment_method: string
  sale_date: string
  synced: boolean
}

type Sale = {
  id: string
  product_id: string
  customer_id: string | null
  quantity: number
  total_price: number
  payment_method: string
  sale_date: string
  shop_id: string
  synced?: boolean
  product?: {
    name: string
    category: string | null
  }
  customer?: {
    name: string
    phone: string | null
  }
  items?: Array<{
    product_name: string
    quantity: number
    price_per_unit: number
    total_price: number
  }>
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export default function SalesPage() {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [syncFilter, setSyncFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState<string | null>(null)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'credit'>('all')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const { shop, isLoading: isShopLoading } = useShop()
  const { isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch sales with TanStack Query
  const { data: sales = [], isLoading: isSalesLoading, error: queryError } = useQuery({
    queryKey: ['sales', shop?.id, selectedPaymentMethod, sortBy, searchQuery, syncFilter, dateRange],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')

      // Get online sales
      let query = supabase
        .from('sales')
        .select(`
          *,
          product:products(name, category),
          customer:customers(name, phone)
        `)
        .eq('shop_id', shop.id)

      // Apply payment method filter
      if (selectedPaymentMethod !== 'all') {
        query = query.eq('payment_method', selectedPaymentMethod)
      }

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('product.name', `%${searchQuery}%`)
      }

      // Apply date range filter
      if (dateRange.start) {
        query = query.gte('sale_date', dateRange.start)
      }
      if (dateRange.end) {
        query = query.lte('sale_date', dateRange.end)
      }

      // Apply sorting
      switch (sortBy) {
        case 'date_desc':
          query = query.order('sale_date', { ascending: false })
          break
        case 'date_asc':
          query = query.order('sale_date', { ascending: true })
          break
        case 'amount_desc':
          query = query.order('total_price', { ascending: false })
          break
        case 'amount_asc':
          query = query.order('total_price', { ascending: true })
          break
      }

      const { data: onlineSales, error } = await query
      if (error) throw error

      // Get offline sales
      const offlineSales = await offlineStorage.getOfflineSales(shop.id)
      
      // Combine and filter sales based on sync status
      let allSales = [
        ...(onlineSales || []).map(sale => ({ ...sale, synced: true })),
        ...offlineSales.map((sale: OfflineSale) => ({ 
          ...sale, 
          synced: false,
          id: `offline_${sale.id}` // Prefix offline sales IDs to ensure uniqueness
        }))
      ]

      // Apply sync filter
      if (syncFilter !== 'all') {
        allSales = allSales.filter(sale => 
          syncFilter === 'synced' ? sale.synced : !sale.synced
        )
      }

      return allSales as Sale[]
    },
    enabled: !!shop?.id && !isAuthLoading && !isShopLoading
  })

  const handleDelete = async (saleId: string) => {
    try {
      setIsDeleting(saleId)
      if (saleId.startsWith('offline_')) {
        // Delete from offline storage
        const offlineId = saleId.replace('offline_', '')
        const db = await offlineStorage.init()
        const tx = db.transaction('offlineSales', 'readwrite')
        await tx.store.delete(offlineId)
        await tx.done
      } else {
        // Delete from online database
        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('id', saleId)
        if (error) throw error
      }
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    } catch (error) {
      console.error('Error deleting sale:', error)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteAllUnsynced = async () => {
    try {
      setIsDeletingAll(true)
      await offlineStorage.deleteUnsyncedSales()
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    } catch (error) {
      console.error('Error deleting all unsynced sales:', error)
    } finally {
      setIsDeletingAll(false)
    }
  }

  const handleRetrySync = async (saleId: string) => {
    try {
      setIsRetrying(saleId)
      if (saleId.startsWith('offline_')) {
        const offlineId = saleId.replace('offline_', '')
        // Get the offline sale
        const offlineSales = await offlineStorage.getOfflineSales(shop?.id || '')
        const saleToSync = offlineSales.find(s => s.id === offlineId)
        
        if (saleToSync) {
          // Attempt to sync the sale
          const { error } = await supabase
            .from('sales')
            .insert({
              id: offlineId,
              shop_id: saleToSync.shop_id,
              product_id: saleToSync.product_id,
              customer_id: saleToSync.customer_id,
              quantity: saleToSync.quantity,
              total_price: saleToSync.total_price,
              payment_method: saleToSync.payment_method,
              sale_date: saleToSync.sale_date
            })
          
          if (error) throw error
          
          // If sync successful, mark as synced in offline storage
          await offlineStorage.markSaleAsSynced(offlineId)
        }
      }
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    } catch (error) {
      console.error('Error retrying sync:', error)
    } finally {
      setIsRetrying(null)
    }
  }

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale)
  }

  const handleCloseModal = () => {
    setSelectedSale(null)
  }

  // Show loading state while auth or shop data is loading
  if (isAuthLoading || isShopLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if no shop is found
  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">No shop found. Please ensure you are logged in and have a registered shop.</span>
          </div>
          <button
            onClick={() => router.push('/shop/register')}
            className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            Register Shop
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/sales/reports"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            View Reports
          </Link>
          <Link
            href="/sales/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            New Sale
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`${
              activeTab === 'all'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            All Sales
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={`${
              activeTab === 'credit'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Credit Sales
          </button>
        </nav>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 sm:items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search sales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="date_start" className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">From:</label>
          <input
            type="date"
            id="date_start"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="date_end" className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">To:</label>
          <input
            type="date"
            id="date_end"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="payment_method" className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">Payment Method:</label>
          <select
            id="payment_method"
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="credit">Credit</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sync_status" className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">Sync Status:</label>
          <select
            id="sync_status"
            value={syncFilter}
            onChange={(e) => setSyncFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
          >
            <option value="all">All Sales</option>
            <option value="synced">Synced</option>
            <option value="unsynced">Unsynced</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">Sort by:</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
          >
            <option value="date_desc">Date: Newest First</option>
            <option value="date_asc">Date: Oldest First</option>
            <option value="amount_desc">Amount: High to Low</option>
            <option value="amount_asc">Amount: Low to High</option>
          </select>
        </div>

        {syncFilter === 'unsynced' && (
          <button
            onClick={handleDeleteAllUnsynced}
            disabled={isDeletingAll}
            className="ml-auto bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isDeletingAll ? 'Deleting...' : 'Delete All Unsynced'}
          </button>
        )}
      </div>

      {queryError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          Error loading sales: {queryError.message}
        </div>
      )}

      {isSalesLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading sales...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500 text-sm sm:text-base">No sales found. Record your first sale!</p>
        </div>
      ) : (
        <>
          {/* Table view for md screens and up */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale: Sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </div>
                    {!sale.synced && (
                      <div className="text-xs text-yellow-600 font-medium">Pending Sync</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {sale.items ? (
                        sale.items.reduce((sum, item) => sum + item.quantity, 0)
                      ) : (
                        sale.quantity
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      KES {sale.items ? 
                        sale.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2) : 
                        sale.total_price.toFixed(2)
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.payment_method}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.customer?.name || 'Walk-in'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewSale(sale)}
                      className="text-emerald-600 hover:text-emerald-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {/* Card view for small screens */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {sales.map((sale: Sale) => (
              <div key={sale.id} className="bg-white shadow rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900">
                      {new Date(sale.sale_date).toLocaleDateString()}
                  </span>
                </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="text-gray-900">
                      {sale.items ? 
                        sale.items.reduce((sum, item) => sum + item.quantity, 0) : 
                        sale.quantity
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total:</span>
                    <span className="text-gray-900">
                      KES {sale.items ? 
                        sale.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2) : 
                        sale.total_price.toFixed(2)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Payment:</span>
                    <span className="text-gray-900">{sale.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Customer:</span>
                    <span className="text-gray-900">{sale.customer?.name || 'Walk-in'}</span>
                  </div>
                  {!sale.synced && (
                    <div className="text-xs text-yellow-600 font-medium">Pending Sync</div>
                  )}
                  <div className="pt-2">
                    <button
                      onClick={() => handleViewSale(sale)}
                      className="text-emerald-600 hover:text-emerald-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sale Details Modal */}
          {selectedSale && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Sale Details</h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <Receipt sale={selectedSale} shop={shop} />
                </div>
              </div>
            </div>
          )}
        </>
          )}
        </>
      ) : (
        <CreditSalesList />
      )}
    </div>
  )
} 