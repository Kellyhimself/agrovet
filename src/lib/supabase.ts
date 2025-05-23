import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            if (typeof document === 'undefined') return undefined
            const cookie = document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${name}=`))
            if (!cookie) return undefined
            // Return the raw cookie value without trying to parse it
            return decodeURIComponent(cookie.split('=')[1])
          },
          set: (name, value, options) => {
            if (typeof document === 'undefined') return
            let cookie = `${name}=${encodeURIComponent(value)}`
            if (options?.path) cookie += `; path=${options.path}`
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
            if (options?.domain) cookie += `; domain=${options.domain}`
            if (options?.secure) cookie += '; secure'
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
            document.cookie = cookie
          },
          remove: (name, options) => {
            if (typeof document === 'undefined') return
            document.cookie = `${name}=; max-age=0${options?.path ? `; path=${options.path}` : ''}`
          },
        },
      }
    )
  }
  return supabaseInstance
}

// Export a singleton instance
export const supabase = getSupabaseClient() 