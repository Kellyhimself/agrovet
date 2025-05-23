'use client'

import Link from 'next/link'
import { useShop } from '@/components/ShopContext'

export default function DashboardPage() {
  const { shop, userRole } = useShop()

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50">
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
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-800">Expiring Soon</h3>
            <p className="text-2xl font-bold text-yellow-600">0</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-800">Today's Sales</h3>
            <p className="text-2xl font-bold text-green-600">KES 0</p>
          </div>
        </div>
      </div>

      <p>Let&apos;s get started!</p>
    </div>
  )
} 