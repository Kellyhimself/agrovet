'use client'

import { useState } from 'react'
import { ShopFormData } from '@/types/shop'

type ShopRegistrationFormProps = {
  onSubmit: (data: ShopFormData) => Promise<void>
  isLoading?: boolean
}

export default function ShopRegistrationForm({ onSubmit, isLoading }: ShopRegistrationFormProps) {
  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    agrovet_id: '',
    location: '',
    phone: '',
    business_type: 'agrovet',
    opening_hours: '',
    description: ''
  })

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with data:', formData)
    setError(null)

    try {
      await onSubmit(formData)
    } catch (err) {
      console.error('Form submission error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during registration')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    console.log(`Form field changed - ${name}:`, value)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Shop Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your shop name"
        />
      </div>

      <div>
        <label htmlFor="agrovet_id" className="block text-sm font-medium text-gray-700">
          Agrovet ID
        </label>
        <input
          type="text"
          id="agrovet_id"
          name="agrovet_id"
          value={formData.agrovet_id}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your Agrovet ID"
        />
        <p className="mt-1 text-sm text-gray-500">
          This ID will be used to identify your shop in the system
        </p>
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your shop location"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your phone number"
        />
      </div>

      <div>
        <label htmlFor="business_type" className="block text-sm font-medium text-gray-700">
          Business Type
        </label>
        <select
          id="business_type"
          name="business_type"
          value={formData.business_type}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="agrovet">Agrovet</option>
          <option value="veterinary">Veterinary</option>
          <option value="farm_supplies">Farm Supplies</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="opening_hours" className="block text-sm font-medium text-gray-700">
          Opening Hours
        </label>
        <input
          type="text"
          id="opening_hours"
          name="opening_hours"
          value={formData.opening_hours}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Mon-Fri: 8AM-6PM, Sat: 9AM-4PM"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Describe your shop and services"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? 'Registering...' : 'Register Shop'}
      </button>
    </form>
  )
} 