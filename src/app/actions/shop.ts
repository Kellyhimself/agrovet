'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function inviteShopUser(email: string, shopId: string, role: string) {
  try {
    console.log('Starting inviteShopUser with:', { email, shopId, role })
    
    const supabase = getSupabaseServerClient()

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Current session:', { sessionId: session?.user?.id, error: sessionError })
    
    if (sessionError) throw sessionError
    if (!session) {
      throw new Error('Unauthorized')
    }

    // Check if the current user is a shop owner
    const { data: shopUser, error: shopError } = await supabase
      .from('shop_users')
      .select('role')
      .eq('shop_id', shopId)
      .eq('user_id', session.user.id)
      .single()

    console.log('Shop owner check:', { shopUser, error: shopError })
    
    if (shopError) throw shopError
    if (!shopUser || shopUser.role !== 'owner') {
      throw new Error('Unauthorized')
    }

    // Check if user is already a member of the shop using the view
    const { data: existingMembership, error: checkError } = await supabase
      .from('shop_users_with_emails')
      .select('*')
      .eq('shop_id', shopId)
      .eq('email', email)
      .maybeSingle()

    console.log('Existing membership check:', { existingMembership, error: checkError })
    
    if (checkError) throw checkError
    if (existingMembership) {
      throw new Error('This user is already a member of this shop')
    }

    // Check if user exists and get their ID
    console.log('Checking user existence for email:', email)
    const { data: userData, error: userError } = await supabase
      .rpc('get_user_id_by_email', { user_email: email })

    console.log('User existence check result:', { userData, error: userError })

    if (userError) throw userError

    if (!userData || !Array.isArray(userData) || userData.length === 0 || !userData[0].user_id) {
      console.log('User not found in database')
      return {
        error: 'User not found. Please ask them to sign up first, then try inviting them again.'
      }
    }

    // Add user to shop
    console.log('Adding user to shop:', { userId: userData[0].user_id, shopId, role })
    const { error: addError } = await supabase
      .from('shop_users')
      .insert([{
        shop_id: shopId,
        user_id: userData[0].user_id,
        role: role
      }])

    console.log('Add user result:', { error: addError })

    if (addError) throw addError

    // Revalidate the shop users page
    revalidatePath('/shop/users')

    return { success: true }
  } catch (error) {
    console.error('Error in inviteShopUser:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return { 
      error: error instanceof Error ? error.message : 'An error occurred while inviting user'
    }
  }
} 