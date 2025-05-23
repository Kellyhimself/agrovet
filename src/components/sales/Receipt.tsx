'use client'

import { useRef, useEffect } from 'react'
import { format } from 'date-fns'

type ReceiptProps = {
  sale: {
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
    items?: Array<{
      product_name: string
      quantity: number
      unit: string
      quantity_per_unit: number
      price_per_unit: number
      total_price: number
    }>
  }
  shop: {
    name: string
    location: string
    phone: string
  }
}

export default function Receipt({ sale, shop }: ReceiptProps) {
  console.log('Receipt component rendering with sale:', JSON.stringify(sale, null, 2))
  console.log('Receipt component rendering with shop:', JSON.stringify(shop, null, 2))
  
  const receiptRef = useRef<HTMLDivElement>(null)

  // Add debug logging for component lifecycle
  useEffect(() => {
    console.log('Receipt component mounted')
    return () => console.log('Receipt component unmounted')
  }, [])

  // Add debug logging for prop changes
  useEffect(() => {
    console.log('Receipt props updated:', { sale, shop })
  }, [sale, shop])

  const handlePrint = () => {
    console.log('Print receipt triggered')
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      console.log('Failed to open print window')
      return
    }

    const receiptContent = receiptRef.current?.innerHTML
    if (!receiptContent) {
      console.log('No receipt content found')
      return
    }

    console.log('Generating print window content')
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0;
              padding: 10px;
            }
            .receipt {
              width: 100%;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .shop-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .shop-details {
              font-size: 12px;
              margin-bottom: 10px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .sale-details {
              font-size: 12px;
              margin-bottom: 10px;
            }
            .item {
              margin-bottom: 5px;
            }
            .total {
              font-weight: bold;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              margin-top: 20px;
            }
            @media print {
              body {
                width: 80mm;
                margin: 0;
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
    console.log('Print window closed')
  }

  // Ensure we have valid data for the receipt
  if (!sale || !shop) {
    console.log('Missing sale or shop data for receipt')
    return null
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div ref={receiptRef} className="receipt">
        <div className="header">
          <div className="shop-name">{shop.name}</div>
          <div className="shop-details">
            <div>{shop.location}</div>
            <div>Tel: {shop.phone}</div>
          </div>
        </div>

        <div className="divider" />

        <div className="sale-details">
          <div className="item">Receipt #: {sale.id.slice(0, 8)}</div>
          <div className="item">Date: {format(new Date(sale.sale_date), 'MMM dd, yyyy HH:mm')}</div>
          {sale.customer && (
            <div className="item">
              Customer: {sale.customer.name}
              {sale.customer.phone && ` (${sale.customer.phone})`}
            </div>
          )}
        </div>

        <div className="divider" />

        {sale.items ? (
          // Multiple items in cart
          <>
            {sale.items.map((item, index) => (
              <div key={index} className="item">
                <div>{item.product_name}</div>
                <div className="flex justify-between">
                  <span>{item.quantity} x KES {item.price_per_unit.toFixed(2)}</span>
                  <span>KES {item.total_price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </>
        ) : (
          // Single item
          <div className="item">
            <div>{sale.product?.name || 'Product'}</div>
            <div className="flex justify-between">
              <span>{sale.quantity} x KES {(sale.total_price / sale.quantity).toFixed(2)}</span>
              <span>KES {sale.total_price.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="divider" />

        <div className="total flex justify-between">
          <span>Total:</span>
          <span>KES {sale.items ? sale.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2) : sale.total_price.toFixed(2)}</span>
        </div>

        <div className="item">Payment: {sale.payment_method.toUpperCase()}</div>

        <div className="footer">
          <div>Thank you for your business!</div>
          <div>Please come again</div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm"
        >
          Print Receipt
        </button>
      </div>
    </div>
  )
} 