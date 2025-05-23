'use client'

import { useOffline } from '@/lib/offline-context'
import { useState, useEffect } from 'react'

export function OfflineToggle() {
  const { isOnline } = useOffline()
  const [isDev, setIsDev] = useState(false)
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false)

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development')
  }, [])

  const toggleOffline = () => {
    if (navigator.onLine) {
      // Simulate going offline
      setIsSimulatedOffline(true)
      // Override navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      })
      window.dispatchEvent(new Event('offline'))
    } else {
      // Simulate going online
      setIsSimulatedOffline(false)
      // Restore navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true
      })
      window.dispatchEvent(new Event('online'))
    }
  }

  if (!isDev) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={toggleOffline}
        className={`px-4 py-2 rounded-lg shadow-lg ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        } text-white`}
      >
        {isOnline ? 'Simulate Offline' : 'Simulate Online'}
      </button>
    </div>
  )
} 