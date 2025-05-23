'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'
import { PostgrestError } from '@supabase/supabase-js'

export default function ShopRegistration() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    agrovet_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to create a shop')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Creating shop with data:', {
        name: formData.name,
        agrovet_id: formData.agrovet_id,
        user_id: user.id
      })

      // First, check if a shop with this agrovet_id already exists
      const { data: existingShop, error: checkError } = await supabase
        .from('shops')
        .select('id')
        .eq('agrovet_id', formData.agrovet_id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking existing shop:', checkError)
        throw checkError
      }

      if (existingShop) {
        throw new Error('A shop with this Agrovet ID already exists')
      }

      // Create the shop using the database function
      const { data: result, error: createError } = await supabase
        .rpc('create_shop_with_owner', {
          p_shop_name: formData.name,
          p_agrovet_id: formData.agrovet_id,
          p_user_id: user.id
        })

      if (createError) {
        console.error('Shop creation error:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        })
        throw new Error(createError.message || 'Failed to create shop')
      }

      if (!result) {
        throw new Error('Failed to create shop: No data returned')
      }

      console.log('Shop created successfully:', result)
      router.push('/dashboard')
    } catch (err) {
      console.error('Error in shop registration:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err instanceof PostgrestError ? {
          message: err.message,
          details: err.details,
          hint: err.hint,
          code: err.code
        } : undefined
      })
      
      setError(err instanceof Error ? err.message : 'Failed to create shop. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Shop</CardTitle>
          <CardDescription>
            Set up your shop to start managing your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your shop name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agrovet_id">Agrovet ID</Label>
              <Input
                id="agrovet_id"
                name="agrovet_id"
                value={formData.agrovet_id}
                onChange={handleChange}
                placeholder="Enter your agrovet ID"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Shop...
                </>
              ) : (
                'Create Shop'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 