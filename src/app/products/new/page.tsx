'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { ProductFormData } from '@/types/product'
import ProductForm from '@/components/products/ProductForm'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function NewProductPage() {
  const router = useRouter()
  const { shop, isLoading: isShopLoading } = useShop()
  const { isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      if (!shop?.id) throw new Error('No shop found')

      const newProduct = {
        ...formData,
        shop_id: shop.id
      }

      const { error } = await supabase
        .from('products')
        .insert(newProduct)

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-medium text-gray-900 mb-2">Add New Product</h1>
        <div className="bg-white rounded-lg shadow-md p-3">
          <ProductForm
            onSubmit={async (data) => {
              await createProductMutation.mutateAsync(data)
            }}
            isLoading={createProductMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
} 