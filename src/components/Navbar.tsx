'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import { useShop } from './ShopContext'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { shop, userRole } = useShop()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth')
  }

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    // Handle touch events outside the menu
    const handleTouchOutside = (event: TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleTouchOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleTouchOutside)
    }
  }, [])

  // Handle menu item clicks
  const handleMenuItemClick = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-emerald-900 text-emerald-50 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold">
            Agrovet
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {shop ? (
                  <>
                    <Link href="/products" className="hover:text-emerald-200">
                      Inventory
                    </Link>
                    {userRole === 'employee' ? (
                      <div className="relative group">
                        <span 
                          className="text-emerald-200/50 cursor-not-allowed"
                          title="Sales access is restricted to owners and managers"
                        >
                          Sales
                        </span>
                        <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm rounded px-2 py-1 -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                          Access restricted to owners and managers
                        </div>
                      </div>
                    ) : (
                      <Link href="/sales" className="hover:text-emerald-200">
                        Sales
                      </Link>
                    )}
                    <Link href="/customers" className="hover:text-emerald-200">
                      Customers
                    </Link>
                    <Link href="/compliance" className="hover:text-emerald-200">
                      Compliance
                    </Link>
                    {userRole === 'owner' && (
                      <Link href="/shop/users" className="hover:text-emerald-200">
                        Users
                      </Link>
                    )}
                  </>
                ) : null}
                <Link href="/shop/register" className="hover:text-emerald-200">
                  Create Shop
                </Link>
                <button
                  onClick={handleSignOut}
                  className="hover:text-emerald-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth" 
                  className="hover:text-emerald-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="bg-emerald-600 text-emerald-50 px-4 py-2 rounded-md hover:bg-emerald-700"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-emerald-800 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div ref={menuRef} className="md:hidden py-4 space-y-2">
            {user ? (
              <>
                {shop ? (
                  <>
                    <Link
                      href="/products"
                      onClick={handleMenuItemClick}
                      className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                    >
                      Inventory
                    </Link>
                    {userRole === 'employee' ? (
                      <div className="relative">
                        <span 
                          className="block w-full text-left px-4 py-2 text-emerald-200/50 cursor-not-allowed"
                          title="Sales access is restricted to owners and managers"
                        >
                          Sales
                        </span>
                      </div>
                    ) : (
                      <Link
                        href="/sales"
                        onClick={handleMenuItemClick}
                        className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                      >
                        Sales
                      </Link>
                    )}
                    <Link
                      href="/customers"
                      onClick={handleMenuItemClick}
                      className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                    >
                      Customers
                    </Link>
                    <Link
                      href="/compliance"
                      onClick={handleMenuItemClick}
                      className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                    >
                      Compliance
                    </Link>
                    {userRole === 'owner' && (
                      <Link
                        href="/shop/users"
                        onClick={handleMenuItemClick}
                        className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                      >
                        Users
                      </Link>
                    )}
                  </>
                ) : null}
                <Link
                  href="/shop/register"
                  onClick={handleMenuItemClick}
                  className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                >
                  Create Shop
                </Link>
                <button
                  onClick={() => {
                    handleSignOut()
                    handleMenuItemClick()
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  onClick={handleMenuItemClick}
                  className="block w-full text-left px-4 py-2 hover:bg-emerald-800 rounded-md"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  onClick={handleMenuItemClick}
                  className="block w-full text-left px-4 py-2 bg-emerald-600 text-emerald-50 rounded-md hover:bg-emerald-700"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
} 