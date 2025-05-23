import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Define public routes that don't require authentication
  const publicRoutes = ['/auth', '/auth/check-email', '/auth/callback', '/shop/register', '/api']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // For callback route or API routes, just pass through
  if (request.nextUrl.pathname.startsWith('/auth/callback') || request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  if (isPublicRoute) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
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

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // If no user and not on auth page, redirect to auth
    if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // If we have a user, check for shop access
    if (user) {
      try {
        // Check if user has a shop
        const { data: shopUser, error: shopError } = await supabase
          .from('shop_users')
          .select('shop_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (shopError) {
          console.error('Error checking shop status:', shopError)
          return response
        }

        // If user has no shop and is not on the register page, redirect to register
        if (!shopUser && !request.nextUrl.pathname.startsWith('/shop/register')) {
          return NextResponse.redirect(new URL('/shop/register', request.url))
        }

        // If user has a shop and is on the register page, redirect to home
        if (shopUser && request.nextUrl.pathname.startsWith('/shop/register')) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      } catch (error) {
        console.error('Error in shop check:', error)
        return response
      }
    }

    return response
  } catch (error) {
    console.error('Error in middleware:', error)
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 