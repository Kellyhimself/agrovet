'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

type Product = {
  id: string
  name: string
  category: string | null
  quantity: number
  price: number
  shop_id: string
  created_at: string
  barcode: string | null
  expiry_date: string | null
  is_regulated: boolean | null
  purchase_price: number | null
  selling_price: number | null
  unit: string | null
  quantity_per_unit: number | null
}

type SortOption = 'name' | 'price_asc' | 'price_desc' | 'quantity' | 'expiry'

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const { shop, isLoading: isShopLoading } = useShop()
  const { isLoading: isAuthLoading } = useAuth()
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch products with TanStack Query
  const { data: products = [], isLoading: isProductsLoading, error: queryError } = useQuery({
    queryKey: ['products', shop?.id, selectedCategory, sortBy, searchQuery],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')

      let query = supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      // Apply sorting
      switch (sortBy) {
        case 'name':
          query = query.order('name', { ascending: true })
          break
        case 'price_asc':
          query = query.order('selling_price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('selling_price', { ascending: false })
          break
        case 'quantity':
          query = query.order('quantity', { ascending: false })
          break
        case 'expiry':
          query = query.order('expiry_date', { ascending: true })
          break
      }

      const { data, error } = await query
      if (error) throw error
      return data as Product[]
    },
    enabled: !!shop?.id && !isAuthLoading && !isShopLoading
  })

  // Get unique categories for filter
  const predefinedCategories = ['fertilizer', 'seed', 'veterinary', 'pesticide', 'other']
  const existingCategories = products.map((p: Product) => p.category).filter(Boolean)
  const allCategories = ['all', ...new Set([...predefinedCategories, ...existingCategories])] as string[]

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
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Products</h1>
        <Link
          href="/products/new"
          className="bg-emerald-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-emerald-700 text-sm sm:text-base w-full sm:w-auto text-center transition-colors"
        >
          Add Product
        </Link>
      </div>

      {/* Search, Filters and Sort */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 sm:items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="category" className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">Category:</label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
          >
            {allCategories.map((category: string) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
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
            <option value="name">Name</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="quantity">Quantity</option>
            <option value="expiry">Expiry Date</option>
          </select>
        </div>
      </div>

      {queryError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          Error loading products: {queryError.message}
        </div>
      )}

      {isProductsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500 text-sm sm:text-base">No products found. Add your first product!</p>
        </div>
      ) : (
        <>
          {/* Table view for md screens and up */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.barcode && (
                        <div className="text-xs text-gray-500">Barcode: {product.barcode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${product.category === 'fertilizer' ? 'bg-green-100 text-green-800' : 
                          product.category === 'seed' ? 'bg-blue-100 text-blue-800' :
                          product.category === 'veterinary' ? 'bg-purple-100 text-purple-800' :
                          product.category === 'pesticide' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        product.quantity <= 5 ? 'text-red-600' : 
                        product.quantity <= 10 ? 'text-yellow-600' : 
                        'text-gray-900'
                      }`}>
                        {product.quantity} × {product.quantity_per_unit} {product.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        KES {product.purchase_price?.toFixed(2) || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-emerald-600">
                        KES {product.selling_price?.toFixed(2) || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${product.is_regulated ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {product.is_regulated ? 'Regulated' : 'Unregulated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for small screens */}
          <div className="md:hidden space-y-4">
            {products.map((product: Product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                    {product.barcode && (
                      <p className="text-xs text-gray-500">Barcode: {product.barcode}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full 
                    ${product.category === 'fertilizer' ? 'bg-green-100 text-green-800' : 
                      product.category === 'seed' ? 'bg-blue-100 text-blue-800' :
                      product.category === 'veterinary' ? 'bg-purple-100 text-purple-800' :
                      product.category === 'pesticide' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : 'Uncategorized'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className={`font-medium ${
                      product.quantity <= 5 ? 'text-red-600' : 
                      product.quantity <= 10 ? 'text-yellow-600' : 
                      'text-gray-900'
                    }`}>
                      {product.quantity} × {product.quantity_per_unit} {product.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Purchase Price</p>
                    <p className="text-gray-900">KES {product.purchase_price?.toFixed(2) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Selling Price</p>
                    <p className="text-emerald-600 font-medium">KES {product.selling_price?.toFixed(2) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expiry Date</p>
                    <p className="text-gray-900">{product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : '-'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full 
                    ${product.is_regulated ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {product.is_regulated ? 'Regulated' : 'Unregulated'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-emerald-600 hover:text-emerald-900 text-sm"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
} 