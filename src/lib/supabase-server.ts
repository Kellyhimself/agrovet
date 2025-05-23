import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

let supabaseServerInstance: ReturnType<typeof createServerClient> | null = null

export const getSupabaseServerClient = () => {
  if (!supabaseServerInstance) {
    const cookieStore = cookies()
    supabaseServerInstance = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            return cookieStore.get(name)?.value
          },
          set: (name, value, options) => {
            cookieStore.set(name, value, options)
          },
          remove: (name, options) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )
  }
  return supabaseServerInstance
} 