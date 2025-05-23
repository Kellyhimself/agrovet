import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

type AuthFormProps = {
  mode: 'signup' | 'login'
  onSuccess?: () => void
}

export default function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  // Get the correct redirect URL based on environment
  const getRedirectUrl = () => {
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      return 'https://agrovet.veylor360.com/auth/callback'
    }
    return `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'signup') {
        // Sign up with email and phone using magic link
        const { error: signUpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: {
              phone: phone || null,
              is_signup: true
            },
            emailRedirectTo: getRedirectUrl()
          }
        })
        if (signUpError) throw signUpError
        setMessage('Check your email for the magic link to complete signup')
        onSuccess?.()
      } else {
        // Login with email using magic link
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: getRedirectUrl()
          }
        })
        if (signInError) throw signInError
        setMessage('Check your email for the magic link to login')
        onSuccess?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Remove non-digits
    if (value.length <= 10) { // Limit to 10 digits
      setPhone(value)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-emerald-200">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-emerald-700 bg-emerald-800 text-emerald-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 placeholder-emerald-400"
          placeholder="Enter your email"
        />
      </div>

      {mode === 'signup' && (
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-emerald-200">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={handlePhoneChange}
            pattern="[0-9]{10}"
            maxLength={10}
            className="mt-1 block w-full rounded-md border-emerald-700 bg-emerald-800 text-emerald-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 placeholder-emerald-400"
            placeholder="e.g., 0748306871"
          />
          <p className="mt-1 text-sm text-emerald-300">
            We&apos;ll use this to contact you about your business
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {message && (
        <div className="text-emerald-400 text-sm">{message}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-emerald-50 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : mode === 'signup' ? 'Sign Up' : 'Login'}
      </button>
    </form>
  )
} 