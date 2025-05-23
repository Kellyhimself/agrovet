import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useShop } from '@/components/ShopContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import CreditPaymentModal from './CreditPaymentModal'
import { format } from 'date-fns'

type CreditSale = {
  sale_id: string
  customer_name: string
  customer_phone: string | null
  product_name: string
  sale_amount: string | number
  total_paid: string | number
  remaining_balance: string | number
  credit_paid: boolean
  sale_date: string
}

type CreditPayment = {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  notes: string | null
}

export default function CreditSalesList() {
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const { shop } = useShop()
  const queryClient = useQueryClient()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch credit sales
  const { data: creditSales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ['credit-sales', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return []
      const { data, error } = await supabase
        .from('credit_sales_with_payments')
        .select('*')
        .eq('shop_id', shop.id)
        .order('sale_date', { ascending: false })

      if (error) throw error
      console.log('Credit sales data:', data) // Debug log
      return data as CreditSale[]
    }
  })

  // Fetch payment history for selected sale
  const { data: paymentHistory = [], isLoading: isPaymentHistoryLoading } = useQuery({
    queryKey: ['credit-payments', selectedSale?.sale_id],
    queryFn: async () => {
      if (!selectedSale?.sale_id) return []
      const { data, error } = await supabase
        .from('credit_payments')
        .select('*')
        .eq('sale_id', selectedSale.sale_id)
        .order('payment_date', { ascending: false })

      if (error) throw error
      return data as CreditPayment[]
    },
    enabled: !!selectedSale
  })

  const handleRecordPayment = (sale: CreditSale) => {
    setSelectedSale(sale)
    setIsPaymentModalOpen(true)
  }

  const handlePaymentRecorded = () => {
    // Refetch credit sales and payment history
    queryClient.invalidateQueries({ queryKey: ['credit-sales', shop?.id] })
    if (selectedSale) {
      queryClient.invalidateQueries({ queryKey: ['credit-payments', selectedSale.sale_id] })
    }
  }

  if (isSalesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Credit Sales Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {creditSales.map((sale) => {
                console.log('Sale data:', sale) // Debug log
                console.log('Remaining balance:', sale.remaining_balance) // Debug log
                return (
                  <tr key={sale.sale_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sale.customer_name}</div>
                      {sale.customer_phone && (
                        <div className="text-sm text-gray-500">{sale.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sale.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">KES {Number(sale.sale_amount).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">KES {Number(sale.total_paid).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">KES {Number(sale.remaining_balance).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.credit_paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.credit_paid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRecordPayment(sale)}
                        disabled={Number(sale.remaining_balance) === 0}
                        className={`text-emerald-600 hover:text-emerald-900 ${
                          Number(sale.remaining_balance) === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-500">Customer</div>
              <div className="font-medium text-gray-900">{selectedSale.customer_name}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-500">Product</div>
              <div className="font-medium text-gray-900">{selectedSale.product_name}</div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="font-medium text-gray-900">KES {Number(selectedSale.sale_amount).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Paid</div>
                <div className="font-medium text-gray-900">KES {Number(selectedSale.total_paid).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Remaining Balance</div>
                <div className="font-medium text-gray-900">KES {Number(selectedSale.remaining_balance).toFixed(2)}</div>
              </div>
            </div>

            {isPaymentHistoryLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Payment History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            KES {payment.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Payment Modal */}
      {selectedSale && (
        <CreditPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          sale={selectedSale}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
} 