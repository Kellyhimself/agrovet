'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function CheckEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get the correct redirect URL based on environment
  const getRedirectUrl = () => {
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      return 'https://agrovet.veylor360.com'
    }
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  }

  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }
    }
    getEmail()
  }, [supabase.auth])

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-emerald-900 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-emerald-50 mb-4">
              Check your email
            </h2>
            <p className="text-emerald-200 mb-4">
              We&apos;ve sent a magic link to{' '}
              <span className="font-medium text-emerald-50">{email}</span>
            </p>
            <p className="text-sm text-emerald-300 mb-6">
              Click the link in the email to continue. The link will expire in 24 hours.
              {process.env.NODE_ENV === 'production' && (
                <span className="block mt-2">
                  You will be redirected to {getRedirectUrl()}
                </span>
              )}
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/auth')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-emerald-50 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Back to sign in
              </button>
              <button
                onClick={() => router.push('/auth?mode=signup')}
                className="w-full flex justify-center py-2 px-4 border border-emerald-700 rounded-md shadow-sm text-sm font-medium text-emerald-50 bg-emerald-800 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Create new account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 