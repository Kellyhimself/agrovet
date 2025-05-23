'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Product, ProductFormData } from '@/types/product'
import ProductForm from '@/components/products/ProductForm'
import { use } from 'react'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { shop, isLoading: isShopLoading } = useShop()
  const { isLoading: isAuthLoading } = useAuth()
  const resolvedParams = use(params)
  const queryClient = useQueryClient()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch product with TanStack Query
  const { data: product, isLoading: isProductLoading, error: queryError } = useQuery({
    queryKey: ['product', resolvedParams.id, shop?.id],
    queryFn: async () => {
      if (!shop?.id) throw new Error('No shop found')

      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('shop_id', shop.id)
        .single()

      if (error) throw error
      if (!products) throw new Error('Product not found or you do not have permission to access it')
      
      return products as Product
    },
    enabled: !!shop?.id && !isAuthLoading && !isShopLoading
  })

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      if (!shop?.id) throw new Error('No shop found')

      const updateData = {
        ...formData,
        shop_id: shop.id
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', resolvedParams.id)
        .eq('shop_id', shop.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      router.push('/products')
    }
  })

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
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Register Shop
          </button>
        </div>
      </div>
    )
  }

  // Show loading state while product is loading
  if (isProductLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  // Show error if product query failed
  if (queryError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{queryError.message}</span>
          </div>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  // Show error if product not found
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center p-8">
            <p className="text-gray-600 mb-4">Product not found</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Products
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <ProductForm
            initialData={product}
            onSubmit={async (data) => {
              await updateProductMutation.mutateAsync(data)
            }}
            isLoading={updateProductMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
} 