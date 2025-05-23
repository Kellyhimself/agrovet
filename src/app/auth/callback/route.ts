import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

// Helper function to get base URL based on environment
function getBaseUrl(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    return 'https://agrovet.veylor360.com'
  }
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  console.log('Auth callback route started')
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const baseUrl = getBaseUrl(request)

  // Handle expired or invalid links
  if (error === 'access_denied' && errorDescription?.includes('expired')) {
    console.log('Magic link expired, redirecting to auth page with error')
    const authUrl = new URL('/auth', baseUrl)
    authUrl.searchParams.set('error', 'link_expired')
    authUrl.searchParams.set('message', 'Your magic link has expired. Please request a new one.')
    return NextResponse.redirect(authUrl)
  }

  if (!code) {
    console.log('No code provided in callback, redirecting to auth page')
    return NextResponse.redirect(new URL('/auth', baseUrl))
  }

  try {
    console.log('Creating response and Supabase client')
    // Create a new response with the correct base URL
    const response = NextResponse.redirect(new URL('/', baseUrl))
    
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove: (name, options) => {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    console.log('Exchanging code for session')
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('Session error:', sessionError)
      const authUrl = new URL('/auth', baseUrl)
      authUrl.searchParams.set('error', 'session_error')
      authUrl.searchParams.set('message', 'Failed to create session. Please try again.')
      return NextResponse.redirect(authUrl)
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User error:', userError)
      return NextResponse.redirect(new URL('/auth', baseUrl))
    }
    
    console.log('User authenticated:', { id: user.id, email: user.email })

    // Check if user has a shop
    console.log('Checking if user has a shop...')
    const { data: shopUser, error: shopError } = await supabase
      .from('shop_users')
      .select('shop_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (shopError) {
      console.error('Error checking shop status:', shopError)
      return NextResponse.redirect(new URL('/auth', baseUrl))
    }

    // Update redirect URL based on shop status
    const redirectUrl = shopUser ? '/dashboard' : '/shop/register'
    console.log('Shop status check result:', {
      hasShop: !!shopUser,
      shopId: shopUser?.shop_id,
      redirectingTo: redirectUrl
    })
    
    response.headers.set('Location', new URL(redirectUrl, baseUrl).toString())
    console.log('Redirecting user to:', redirectUrl)

    return response
  } catch (err) {
    console.error('Unexpected error in auth callback:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    })
    const authUrl = new URL('/auth', baseUrl)
    authUrl.searchParams.set('error', 'unexpected_error')
    authUrl.searchParams.set('message', 'An unexpected error occurred. Please try again.')
    return NextResponse.redirect(authUrl)
  }
} 