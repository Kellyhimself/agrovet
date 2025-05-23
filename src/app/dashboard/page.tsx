'use client'

import Link from 'next/link'
import { useShop } from '@/components/ShopContext'
import { createBrowserClient } from '@supabase/ssr'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { shop, userRole } = useShop()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch Quick Stats
  const { data: quickStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['quick-stats', shop?.id],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')

      // Get low stock items (less than 10 units)
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from('products')
        .select('id')
        .eq('shop_id', shop.id)
        .lt('quantity', 10)

      if (lowStockError) throw lowStockError

      // Get expiring soon items (within 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      
      const { data: expiringItems, error: expiringError } = await supabase
        .from('products')
        .select('id')
        .eq('shop_id', shop.id)
        .lt('expiry_date', thirtyDaysFromNow.toISOString())
        .gt('expiry_date', new Date().toISOString())

      if (expiringError) throw expiringError

      // Get today's sales
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: todaySales, error: salesError } = await supabase
        .from('sales')
        .select('total_price')
        .eq('shop_id', shop.id)
        .gte('sale_date', `${today}T00:00:00`)
        .lte('sale_date', `${today}T23:59:59`)

      if (salesError) throw salesError

      const totalSales = todaySales?.reduce((sum, sale) => sum + sale.total_price, 0) || 0

      return {
        lowStockCount: lowStockItems?.length || 0,
        expiringCount: expiringItems?.length || 0,
        todaySales: totalSales
      }
    },
    enabled: !!shop?.id
  })

  // Fetch low stock items
  const { data: lowStockItems, isLoading: isLowStockLoading } = useQuery({
    queryKey: ['low-stock-items', shop?.id],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')
      const { data, error } = await supabase
        .from('products')
        .select('id, name, quantity')
        .eq('shop_id', shop.id)
        .lt('quantity', 10)
        .order('quantity', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!shop?.id && !isStatsLoading
  })

  // Fetch expiring soon items
  const { data: expiringItems, isLoading: isExpiringLoading } = useQuery({
    queryKey: ['expiring-items', shop?.id],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data, error } = await supabase
        .from('products')
        .select('id, name, expiry_date')
        .eq('shop_id', shop.id)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString())
        .order('expiry_date', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!shop?.id && !isStatsLoading
  })

  // Fetch today's sales
  const { data: todaySales, isLoading: isTodaySalesLoading } = useQuery({
    queryKey: ['today-sales', shop?.id],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')
      const today = format(new Date(), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('sales')
        .select('total_price')
        .eq('shop_id', shop.id)
        .gte('sale_date', `${today}T00:00:00`)
        .lte('sale_date', `${today}T23:59:59`)

      if (error) throw error
      return data
    },
    enabled: !!shop?.id && !isStatsLoading
  })

  // Calculate today's total sales
  const todayTotalSales = todaySales?.reduce((sum, sale) => sum + sale.total_price, 0) || 0

  // Show loading state while auth or shop data is loading
  if (isStatsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 bg-white p-4 rounded-lg shadow-sm">
        Welcome to {shop?.name || 'Agrovet'} Management System
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/products"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Inventory</h2>
          <p className="text-gray-600">Manage your products, track stock levels, and monitor expiry dates.</p>
        </Link>

        {userRole === 'employee' ? (
          <div className="relative group bg-white p-6 rounded-lg shadow-md">
            <div className="absolute inset-0 bg-gray-50/50 rounded-lg"></div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900/50">Sales</h2>
            <p className="text-gray-600/50">Record sales, generate reports, and track payments.</p>
            <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm rounded px-2 py-1 -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              Access restricted to owners and managers
            </div>
          </div>
        ) : (
          <Link
            href="/sales"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Sales</h2>
            <p className="text-gray-600">Record sales, generate reports, and track payments.</p>
          </Link>
        )}

        <Link
          href="/customers"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Customers</h2>
          <p className="text-gray-600">Manage customer information and track purchase history.</p>
        </Link>

        <Link
          href="/compliance"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Compliance</h2>
          <p className="text-gray-600">Track regulated products and generate compliance reports.</p>
        </Link>
      </div>

      <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800">Low Stock Items</h3>
            {isLowStockLoading ? (
              <div className="animate-pulse h-8 bg-blue-100 rounded"></div>
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-600">{lowStockItems?.length || 0}</p>
                {lowStockItems && lowStockItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {lowStockItems.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-sm text-gray-600">
                        {item.name} ({item.quantity} left)
                      </p>
                    ))}
                    {lowStockItems.length > 3 && (
                      <p className="text-sm text-emerald-600">+{lowStockItems.length - 3} more items</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-800">Expiring Soon</h3>
            {isExpiringLoading ? (
              <div className="animate-pulse h-8 bg-yellow-100 rounded"></div>
            ) : (
              <>
                <p className="text-2xl font-bold text-yellow-600">{expiringItems?.length || 0}</p>
                {expiringItems && expiringItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {expiringItems.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-sm text-gray-600">
                        {item.name} (expires {format(new Date(item.expiry_date!), 'MMM dd')})
                      </p>
                    ))}
                    {expiringItems.length > 3 && (
                      <p className="text-sm text-emerald-600">+{expiringItems.length - 3} more items</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-800">Today's Sales</h3>
            {isTodaySalesLoading ? (
              <div className="animate-pulse h-8 bg-green-100 rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-green-600">
                KES {todayTotalSales.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      <p>Let&apos;s get started!</p>
    </div>
  )
} 