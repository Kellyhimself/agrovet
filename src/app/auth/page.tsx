'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default function AuthPage() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signup' | 'login'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const router = useRouter()

  const handleSuccess = () => {
    // The actual redirect will be handled by the auth callback
    // This is just for UX feedback
    router.push('/auth/check-email')
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-emerald-50">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-center text-sm text-emerald-200">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="font-medium text-emerald-400 hover:text-emerald-300"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="font-medium text-emerald-400 hover:text-emerald-300"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-emerald-900 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AuthForm mode={mode} onSuccess={handleSuccess} />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-emerald-900 text-emerald-200">
                  {mode === 'signup' ? 'Start your 30-day free trial' : 'Secure login'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 