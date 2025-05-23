'use client'

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './AuthContext'
import { ShopProvider } from './ShopContext'
import { OfflineProvider } from '@/lib/offline-context'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ShopProvider>
          <OfflineProvider>
            {children}
          </OfflineProvider>
        </ShopProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
} 