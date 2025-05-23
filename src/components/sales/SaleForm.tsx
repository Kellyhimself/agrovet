'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOffline } from '@/lib/offline-context'
import { offlineStorage } from '@/lib/offline'
import { Product, Customer, SaleFormData } from '@/types'

interface SaleFormProps {
  shopId: string
  onSubmit: (formData: SaleFormData) => Promise<void>
  isLoading: boolean
  formData: SaleFormData
  onFormDataChange: (formData: SaleFormData) => void
  selectedProduct: Product | null
  onSelectedProductChange: (product: Product | null) => void
  localStock: Record<string, number>
  onLocalStockChange: (stock: Record<string, number>) => void
}

type CartItem = {
  product_id: string
  product_name: string
  quantity: number
  unit: string
  quantity_per_unit: number
  price_per_unit: number
  total_price: number
}

export default function SaleForm({
  shopId,
  onSubmit,
  isLoading,
  formData,
  onFormDataChange,
  selectedProduct,
  onSelectedProductChange,
  localStock,
  onLocalStockChange
}: SaleFormProps) {
  const { isOnline } = useOffline()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentQuantity, setCurrentQuantity] = useState<number>(1)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: async () => {
      if (!isOnline) {
        const offlineProducts = await offlineStorage.getOfflineProducts()
        return offlineProducts
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('name')

      if (error) throw error
      return data as Product[]
    }
  })

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!isOnline) {
        const offlineCustomers = await offlineStorage.getOfflineCustomers()
        setCustomers(offlineCustomers)
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shopId)
        .order('name')

      if (error) {
        return
      }

      setCustomers(data as Customer[])
    }

    fetchCustomers()
  }, [shopId, isOnline, supabase])

  // Update total price when product or quantity changes
  useEffect(() => {
    if (selectedProduct) {
      const total = selectedProduct.selling_price * formData.quantity
      onFormDataChange({ ...formData, total_price: total })
    }
  }, [selectedProduct, formData.quantity])

  const handleAddToCart = () => {
    if (!selectedProduct) return

    const existingItem = cart.find(item => item.product_id === selectedProduct.id)
    
    if (existingItem) {
      // Update existing item quantity
      setCart(cart.map(item => 
        item.product_id === selectedProduct.id 
          ? {
              ...item,
              quantity: item.quantity + currentQuantity,
              total_price: (item.quantity + currentQuantity) * item.price_per_unit
            }
          : item
      ))
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: currentQuantity,
        unit: selectedProduct.unit,
        quantity_per_unit: selectedProduct.quantity_per_unit,
        price_per_unit: selectedProduct.selling_price,
        total_price: currentQuantity * selectedProduct.selling_price
      }
      setCart([...cart, newItem])
    }

    // Reset only the quantity input and selected product
    setCurrentQuantity(1)
    onSelectedProductChange(null)
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const handleUpdateCartItemQuantity = (productId: string, newQuantity: number) => {
    setCart(cart.map(item => 
      item.product_id === productId 
        ? {
            ...item,
            quantity: newQuantity,
            total_price: newQuantity * item.price_per_unit
          }
        : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return

    // Calculate total price for all items
    const totalPrice = cart.reduce((sum, item) => sum + item.total_price, 0)

    // Add product and customer names to form data
    const formDataWithNames = {
      ...formData,
      total_price: totalPrice,
      customer_name: formData.customer_id 
        ? customers.find(c => c.id === formData.customer_id)?.name 
        : undefined,
      items: cart
    }

    try {
      await onSubmit(formDataWithNames)
      // Clear cart after successful submission
      setCart([])
      // Reset form data
      onFormDataChange({
        ...formData,
        product_id: '',
        quantity: 1,
        total_price: 0
      })
    } catch (error) {
      // Silent error handling
    }
  }

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId) || null
    onSelectedProductChange(product)
    onFormDataChange({ ...formData, product_id: productId })
  }

  const handleQuantityChange = (quantity: number) => {
    onFormDataChange({ ...formData, quantity })
  }

  const handleCustomerChange = (customerId: string | null) => {
    onFormDataChange({ ...formData, customer_id: customerId })
  }

  const handlePaymentMethodChange = (method: string) => {
    onFormDataChange({ ...formData, payment_method: method })
  }

  const handleDateChange = (date: string) => {
    onFormDataChange({ ...formData, sale_date: date })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Column - Product Selection and Details */}
        <div className="flex-1 space-y-2">
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              id="product"
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-900 text-sm"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id} className="text-xs sm:text-sm">
                  {product.name} | {product.quantity_per_unit} {product.unit} | KES {product.selling_price.toFixed(2)} | Stock: {isOnline ? product.quantity : localStock[product.id] || 0}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1 text-xs text-gray-500">
                Available stock: {isOnline ? selectedProduct.quantity : localStock[selectedProduct.id] || 0}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="quantity"
                min="1"
                max={selectedProduct ? (isOnline ? selectedProduct.quantity : localStock[selectedProduct.id] || 0) : 1}
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-900 text-sm"
              />
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedProduct}
                className="mt-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors text-sm"
              >
                Add to Cart
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
              Customer <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <select
              id="customer"
              value={formData.customer_id || ''}
              onChange={(e) => handleCustomerChange(e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-900 text-sm"
            >
              <option value="">No customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="payment_method"
              value={formData.payment_method}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-900 text-sm"
              required
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <div>
            <label htmlFor="sale_date" className="block text-sm font-medium text-gray-700">
              Sale Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="sale_date"
              value={formData.sale_date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-900 text-sm"
              required
            />
          </div>
        </div>

        {/* Right Column - Cart */}
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Cart Items</h3>
            {cart.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No items in cart</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product_id} className="bg-white p-2 rounded-lg shadow-sm">
                    <div className="flex flex-row items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.product_name}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product_id)}
                            className="text-red-600 hover:text-red-800 text-xs ml-2 flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">{item.quantity_per_unit} {item.unit} per unit</p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartItemQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                              className="text-gray-500 hover:text-gray-700 text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs text-gray-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartItemQuantity(item.product_id, item.quantity + 1)}
                              className="text-gray-500 hover:text-gray-700 text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-emerald-600 flex-shrink-0 ml-2">
                        KES {item.total_price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">Total</span>
                    <span className="text-sm font-medium text-emerald-600">
                      KES {cart.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button - Full Width */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || cart.length === 0}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors text-sm"
        >
          {isLoading ? 'Recording Sale...' : isOnline ? 'Record Sale' : 'Record Offline Sale'}
        </button>
      </div>
    </form>
  )
} 