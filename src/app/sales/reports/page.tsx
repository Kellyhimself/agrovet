'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

type SalesReport = {
  total_sales: number
  total_revenue: number
  total_profit: number
  profit_margin: number
  sales_by_payment_method: {
    cash: number
    mpesa: number
    credit: number
  }
  sales_by_date: {
    date: string
    total: number
    count: number
    profit: number
  }[]
  top_products: {
    id: string
    name: string
    total_sales: number
    total_revenue: number
    total_profit: number
    profit_margin: number
    quantity_sold: number
    inventory_turnover: number
  }[]
  top_customers: {
    id: string
    name: string
    total_purchases: number
    total_spent: number
    last_purchase: string
  }[]
  sales_by_hour: {
    hour: number
    total: number
    count: number
    profit: number
  }[]
  sales_by_category: {
    category: string
    total: number
    count: number
    profit: number
    profit_margin: number
  }[]
}

type SaleWithProduct = {
  sale_date: string
  total_price: number
  quantity: number
  product: {
    id: string
    name: string
    purchase_price: number
    quantity: number
  } | null
}

type SaleWithCustomer = {
  sale_date: string
  total_price: number
  customer: {
    id: string
    name: string
  } | null
}

export default function SalesReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'customers' | 'time'>('overview')
  const { shop, isLoading: isShopLoading } = useShop()
  const { isLoading: isAuthLoading } = useAuth()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch sales report data
  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: ['sales-report', shop?.id, dateRange],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')


      // Get total sales and revenue
      const { data: totals, error: totalsError } = await supabase
        .from('sales')
        .select('total_price, payment_method')
        .eq('shop_id', shop.id)
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)


      if (totalsError) {
        throw totalsError
      }

      if (!totals || totals.length === 0) {
        
        return null
      }

      // Calculate totals and payment method breakdown
      const sales_by_payment_method = {
        cash: 0,
        mpesa: 0,
        credit: 0
      }

      let total_revenue = 0
      totals.forEach(sale => {
        total_revenue += sale.total_price
        sales_by_payment_method[sale.payment_method as keyof typeof sales_by_payment_method] += sale.total_price
      })

      // Get daily sales breakdown
      const { data: dailySales, error: dailyError } = await supabase
        .from('sales')
        .select('sale_date, total_price')
        .eq('shop_id', shop.id)
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)
        .order('sale_date')

      if (dailyError) {
        throw dailyError
      }

      // Group sales by date
      const sales_by_date = dailySales?.reduce((acc: {
        date: string
        total: number
        count: number
        profit: number
      }[], sale) => {
        const date = sale.sale_date.split('T')[0]
        const existing = acc.find(item => item.date === date)
        
        if (existing) {
          existing.total += sale.total_price
          existing.count += 1
        } else {
          acc.push({
            date,
            total: sale.total_price,
            count: 1,
            profit: sale.total_price // For now, using total_price as profit since we don't have purchase_price
          })
        }
        return acc
      }, [])

      // Get top products
      const { data: topProducts, error: productsError } = await supabase
        .from('sales')
        .select(`
          sale_date,
          product:products(id, name, purchase_price, quantity),
          total_price,
          quantity
        `)
        .eq('shop_id', shop.id)
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)

      if (productsError) throw productsError

      // Process top products
      const productMap = new Map<string, {
        id: string
        name: string
        total_sales: number
        total_revenue: number
        total_profit: number
        quantity_sold: number
        initial_stock: number
      }>()

      topProducts?.forEach(sale => {
        if (!sale.product) return
        const existing = productMap.get(sale.product.id) || {
          id: sale.product.id,
          name: sale.product.name,
          total_sales: 0,
          total_revenue: 0,
          total_profit: 0,
          quantity_sold: 0,
          initial_stock: sale.product.quantity + sale.quantity
        }
        existing.total_sales += 1
        existing.total_revenue += sale.total_price
        existing.total_profit += sale.total_price - (sale.product.purchase_price * sale.quantity)
        existing.quantity_sold += sale.quantity
        productMap.set(sale.product.id, existing)
      })

      // Calculate profit margins and inventory turnover
      const processedProducts = Array.from(productMap.values()).map(product => ({
        ...product,
        profit_margin: (product.total_profit / product.total_revenue) * 100,
        inventory_turnover: product.quantity_sold / product.initial_stock
      }))

      // Get top customers
      const { data: topCustomers, error: customersError } = await supabase
        .from('sales')
        .select(`
          sale_date,
          customer:customers(id, name),
          total_price
        `)
        .eq('shop_id', shop.id)
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)
        .not('customer_id', 'is', null)

      if (customersError) throw customersError

      // Process top customers
      const customerMap = new Map<string, {
        id: string
        name: string
        total_purchases: number
        total_spent: number
        last_purchase: string
      }>()

      topCustomers?.forEach(sale => {
        if (!sale.customer) return
        const existing = customerMap.get(sale.customer.id) || {
          id: sale.customer.id,
          name: sale.customer.name,
          total_purchases: 0,
          total_spent: 0,
          last_purchase: sale.sale_date
        }
        existing.total_purchases += 1
        existing.total_spent += sale.total_price
        if (new Date(sale.sale_date) > new Date(existing.last_purchase)) {
          existing.last_purchase = sale.sale_date
        }
        customerMap.set(sale.customer.id, existing)
      })

      // Get sales by hour
      const { data: hourlySales, error: hourlyError } = await supabase
        .from('sales')
        .select(`
          sale_date,
          total_price,
          quantity,
          product:products(purchase_price)
        `)
        .eq('shop_id', shop.id)
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)

      if (hourlyError) throw hourlyError

      // Process hourly sales
      const sales_by_hour = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        total: 0,
        count: 0,
        profit: 0
      }))

      hourlySales?.forEach(sale => {
        const hour = new Date(sale.sale_date).getHours()
        sales_by_hour[hour].total += sale.total_price
        sales_by_hour[hour].profit += sale.total_price // Using total_price as profit for now
        sales_by_hour[hour].count += 1
      })

      // Get sales by category
      const { data: categorySales, error: categoryError } = await supabase
        .from('sales')
        .select(`
          total_price,
          quantity,
          product:products(category, purchase_price)
        `)
        .eq('shop_id', shop.id)
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)

      if (categoryError) throw categoryError

      // Process category sales
      const categoryMap = new Map<string, {
        category: string
        total: number
        count: number
        profit: number
      }>()

      categorySales?.forEach(sale => {
        const category = sale.product?.category || 'Uncategorized'
        const existing = categoryMap.get(category) || {
          category,
          total: 0,
          profit: 0,
          count: 0
        }
        existing.total += sale.total_price
        existing.profit += sale.total_price // Using total_price as profit for now
        existing.count += 1
        categoryMap.set(category, existing)
      })

      // Calculate category profit margins
      const processedCategories = Array.from(categoryMap.values()).map(category => ({
        ...category,
        profit_margin: (category.profit / category.total) * 100
      }))

      return {
        total_sales: totals?.length || 0,
        total_revenue,
        total_profit: total_revenue, // Using total_revenue as profit for now
        profit_margin: 100, // Using 100% as profit margin for now
        sales_by_payment_method,
        sales_by_date,
        top_products: processedProducts
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 10),
        top_customers: Array.from(customerMap.values())
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 10),
        sales_by_hour,
        sales_by_category: processedCategories
      } as SalesReport
    },
    enabled: !!shop?.id && !isAuthLoading && !isShopLoading
  })

  const handleExportCSV = () => {
    if (!report?.sales_by_date) return

    const headers = ['Date', 'Number of Sales', 'Total Revenue (KES)', 'Total Profit (KES)', 'Profit Margin']
    const rows = report.sales_by_date.map(day => [
      day.date,
      day.count,
      day.total.toFixed(2),
      day.profit.toFixed(2),
      ((day.profit / day.total) * 100).toFixed(1) + '%'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales-report-${dateRange.start}-to-${dateRange.end}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold text-emerald-700">Sales Reports</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border border-emerald-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-700"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border border-emerald-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-700"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`${
                activeTab === 'products'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`${
                activeTab === 'customers'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Customers
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`${
                activeTab === 'time'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Time Analysis
            </button>
          </nav>
        </div>
      </div>

      {isReportLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      ) : report ? (
        <div className="space-y-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{report.total_sales}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                  <p className="mt-1 text-2xl font-semibold text-emerald-600">
                    KES {report.total_revenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Total Profit</h3>
                  <p className="mt-1 text-2xl font-semibold text-emerald-600">
                    KES {report.total_profit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
                  <p className="mt-1 text-2xl font-semibold text-emerald-600">
                    {report.profit_margin.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-base font-medium text-gray-900 mb-3">Payment Method Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800">Cash</h4>
                    <p className="mt-1 text-xl font-semibold text-green-600">
                      KES {report.sales_by_payment_method.cash.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-800">M-Pesa</h4>
                    <p className="mt-1 text-xl font-semibold text-purple-600">
                      KES {report.sales_by_payment_method.mpesa.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800">Credit</h4>
                    <p className="mt-1 text-xl font-semibold text-blue-600">
                      KES {report.sales_by_payment_method.credit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Daily Sales Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Daily Sales</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Number of Sales
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.sales_by_date.map((day) => (
                        <tr key={day.date}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(day.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {day.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {day.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {day.profit.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            {((day.profit / day.total) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Top Products */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Top Products by Revenue</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity Sold
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Turnover
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.top_products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.quantity_sold}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {product.total_revenue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {product.total_profit.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            {product.profit_margin.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            {product.inventory_turnover.toFixed(2)}x
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Sales by Category</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Number of Sales
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.sales_by_category.map((category) => (
                        <tr key={category.category}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {category.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {category.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {category.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {category.profit.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            {category.profit_margin.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Customers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Number of Purchases
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Purchase
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.top_customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.total_purchases}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                          KES {customer.total_spent.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(customer.last_purchase), 'MMM dd, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Time Analysis Tab */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              {/* Hourly Sales Distribution */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Hourly Sales Distribution</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hour
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Number of Sales
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.sales_by_hour.map((hour) => (
                        <tr key={hour.hour}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {hour.hour}:00
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {hour.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {hour.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            KES {hour.profit.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                            {((hour.profit / hour.total) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">No sales data available for the selected date range.</p>
        </div>
      )}
    </div>
  )
} 