'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useAuth } from '@/components/AuthContext'
import SaleForm from '@/components/sales/SaleForm'
import Receipt from '@/components/sales/Receipt'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { useOffline } from '@/lib/offline-context'
import { offlineStorage } from '@/lib/offline'
import { v4 as uuidv4 } from 'uuid'
import { Product, SaleFormData, Customer } from '@/types'
import { toast } from 'sonner'

type CompletedSale = {
  id: string
  sale_date: string
  total_price: number
  payment_method: string
  quantity: number
  product?: {
    name: string
    category: string | null
  } | null
  customer?: {
    name: string
    phone: string | null
  } | null
  items: SaleFormData['items']
}

export default function NewSalePage() {
  const router = useRouter()
  const { shop, isLoading: isShopLoading } = useShop()
  const { isLoading: isAuthLoading } = useAuth()
  const { isOnline } = useOffline()
  const queryClient = useQueryClient()
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<SaleFormData>({
    product_id: '',
    customer_id: null,
    quantity: 1,
    total_price: 0,
    payment_method: 'cash',
    sale_date: new Date().toISOString().split('T')[0],
  })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [localStock, setLocalStock] = useState<Record<string, number>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch products and initialize local stock
  const { data: products = [] } = useQuery({
    queryKey: ['products', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return []
      if (!isOnline) {
        const offlineProducts = await offlineStorage.getOfflineProducts(shop.id)
        return offlineProducts
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name')

      if (error) throw error
      return data as Product[]
    }
  })

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return []
      if (!isOnline) {
        const offlineCustomers = await offlineStorage.getOfflineCustomers(shop.id)
        return offlineCustomers
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name')

      if (error) throw error
      return data as Customer[]
    }
  })

  // Memoize the initial stock calculation
  const initialStock = useMemo(() => {
    const stock: Record<string, number> = {}
    products.forEach(product => {
      stock[product.id] = product.quantity
    })
    return stock
  }, [products])

  // Update local stock only when products change
  useEffect(() => {
    if (products.length > 0) {
      const stock: Record<string, number> = {}
      products.forEach(product => {
        stock[product.id] = product.quantity
      })
      setLocalStock(stock)
    }
  }, [products])

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (formData: SaleFormData) => {
      console.log('Starting sale mutation with formData:', formData)
      if (!shop?.id) throw new Error('No shop found')

      if (!isOnline) {
        console.log('Processing offline sale')
        // For offline sales, create a sale for each item in the cart
        if (!formData.items) {
          throw new Error('No items in cart')
        }
        const sales = formData.items.map(item => {
          const saleId = uuidv4()
          return {
            id: saleId,
            shop_id: shop.id,
            product_id: item.product_id,
            customer_id: formData.customer_id || null,
            quantity: item.quantity,
            total_price: item.total_price,
            payment_method: formData.payment_method,
            sale_date: formData.sale_date,
          synced: false
          }
        })

        // Save each sale to offline storage
        for (const sale of sales) {
          await offlineStorage.saveOfflineSale(sale)
        }
        
        // Return the first sale for UI purposes
        const firstSale = sales[0]
        return {
          ...firstSale,
          items: formData.items,
          product: products.find(p => p.id === firstSale.product_id) 
            ? {
                name: products.find(p => p.id === firstSale.product_id)!.name,
                category: products.find(p => p.id === firstSale.product_id)!.category || null
              }
            : null,
          customer: formData.customer_id && customers.find(c => c.id === formData.customer_id)
            ? {
                name: customers.find(c => c.id === formData.customer_id)!.name,
                phone: customers.find(c => c.id === formData.customer_id)!.phone || null
              }
            : null
        }
      }

      // Online flow
      console.log('Processing online sale')
      try {
        // Create a sale for each item in the cart
        if (!formData.items) {
          throw new Error('No items in cart')
        }
        const sales = await Promise.all(formData.items.map(async (item) => {
          const saleId = uuidv4()
          const saleData = {
            id: saleId,
            shop_id: shop.id,
            product_id: item.product_id,
            customer_id: formData.customer_id || null,
            quantity: item.quantity,
            total_price: item.total_price,
            payment_method: formData.payment_method,
            sale_date: formData.sale_date
          }

          // Insert the sale
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert(saleData)
          .select(`
            *,
            product:products(name, category),
            customer:customers(name, phone)
          `)
          .single()

        if (saleError) {
          console.error('Error inserting sale:', saleError)
          throw saleError
        }

        // Update product quantity
        const { data: newQuantity, error: rpcError } = await supabase
          .rpc('decrement_quantity', {
              p_product_id: item.product_id,
              p_quantity: item.quantity
          })

        if (rpcError) {
          console.error('Error updating quantity:', rpcError)
          throw rpcError
        }

        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
            .eq('id', item.product_id)

        if (updateError) {
          console.error('Error updating product:', updateError)
          throw updateError
        }

          return sale
        }))

        console.log('Online sync completed successfully')
        // Return the first sale for UI purposes with all items
        return {
          ...sales[0],
          items: formData.items
        } as CompletedSale
      } catch (error) {
        console.error('Error in online sync:', error)
        throw error
      }
    }
  })

  const handleSubmit = async (formData: SaleFormData) => {
    setIsSubmitting(true)
    try {
      let result;
      
      if (!isOnline) {
        // For offline sales, construct the completed sale data immediately
        if (!shop?.id) throw new Error('No shop found')
        
        const saleId = uuidv4()
        const saleData = {
          id: saleId,
          shop_id: shop.id,
          product_id: formData.product_id,
          customer_id: formData.customer_id || null,
          quantity: formData.quantity,
          total_price: formData.total_price,
          payment_method: formData.payment_method,
          sale_date: formData.sale_date
        }

        // Save to offline storage
        await offlineStorage.saveOfflineSale(saleData)
        
        // Construct the completed sale data for UI
        result = {
          ...saleData,
          items: formData.items,
          product: products.find(p => p.id === formData.product_id) 
            ? {
                name: products.find(p => p.id === formData.product_id)!.name,
                category: products.find(p => p.id === formData.product_id)!.category || null
              }
            : null,
          customer: formData.customer_id && customers.find(c => c.id === formData.customer_id)
            ? {
                name: customers.find(c => c.id === formData.customer_id)!.name,
                phone: customers.find(c => c.id === formData.customer_id)!.phone || null
              }
            : null
        }
      } else {
        // Online flow remains the same
        result = await createSaleMutation.mutateAsync(formData)
      }

      // Update local stock for offline sales
      if (!isOnline) {
        const newLocalStock = { ...localStock }
        const product = products.find(p => p.id === formData.product_id)
        if (product) {
          newLocalStock[product.id] = (newLocalStock[product.id] || product.quantity) - formData.quantity
          setLocalStock(newLocalStock)
        }
      }

      // Set the completed sale
      setCompletedSale(result)

      // Reset form state
      setFormData({
        product_id: '',
        customer_id: null,
        quantity: 1,
        total_price: 0,
        payment_method: 'cash',
        sale_date: new Date().toISOString().split('T')[0]
      })
      setSelectedProduct(null)

      // Invalidate queries
      if (shop?.id) {
        queryClient.invalidateQueries({ queryKey: ['products', shop.id] })
        queryClient.invalidateQueries({ queryKey: ['sales', shop.id] })
      }

      // Reset submitting state
      setIsSubmitting(false)

      // Show success message
      toast.success(isOnline ? 'Sale recorded successfully' : 'Sale recorded offline')
    } catch {
      setIsSubmitting(false)
      toast.error('Failed to record sale')
    }
  }

  const handleFormDataChange = (newFormData: SaleFormData) => {
    setFormData(newFormData)
  }

  const handleSelectedProductChange = (product: Product | null) => {
    setSelectedProduct(product)
  }

  const handleLocalStockChange = (stock: Record<string, number>) => {
    setLocalStock(stock)
  }

  const handleNewSale = () => {
    console.log('Recording another sale')
    setCompletedSale(null)
    setIsSubmitting(false)
    // Reset form state
    setFormData({
      product_id: '',
      customer_id: null,
      quantity: 1,
      total_price: 0,
      payment_method: 'cash',
      sale_date: new Date().toISOString().split('T')[0],
    })
    setSelectedProduct(null)
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

  // Show receipt if sale is completed
  if (completedSale) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-600">
              {isOnline 
                ? "The sale has been recorded successfully."
                : "The sale has been recorded offline and will be synced when you're back online."}
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <Receipt sale={completedSale} shop={shop} />
            </div>
            <div className="lg:w-48 flex flex-col gap-4">
              <button
                onClick={handleNewSale}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm transition-colors"
              >
                Record Another Sale
              </button>
              <button
                onClick={() => router.push('/sales')}
                className="w-full bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm transition-colors"
              >
                Back to Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 py-5">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 bg-gray-100 p-4 rounded-lg">
          <h1 className="text-2xl font-bold text-emerald-700 mb-2">Record New Sale</h1>
          <p className="text-emerald-600">
            {isOnline 
              ? "Enter the details of the sale below."
              : "You are offline. The sale will be synced when you're back online."}
          </p>
        </div>
        <SaleForm
          shopId={shop.id}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          formData={formData}
          onFormDataChange={handleFormDataChange}
          selectedProduct={selectedProduct}
          onSelectedProductChange={handleSelectedProductChange}
          localStock={localStock}
          onLocalStockChange={handleLocalStockChange}
        />
      </div>
    </div>
  )
} 