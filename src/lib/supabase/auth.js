/**
 * Supabase Authentication
 * 
 * This module handles authentication with Supabase including
 * signing in/out, session management, and user profiles.
 */

import supabase, { handleApiError } from './client'

/**
 * Signs in a user with email and password
 * 
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} - Auth session and user profile
 */
export async function signIn({ email, password }) {
  try {
    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    // Get the user profile from the users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, name, email')
      .eq('id', data.user.id)
      .single()
      
    if (profileError) throw profileError
    
    return {
      session: data.session,
      token: data.session.access_token,
      user: profile
    }
  } catch (error) {
    throw handleApiError(error, 'Authentication')
  }
}

/**
 * Signs out the current user
 * 
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    throw handleApiError(error, 'Sign Out')
  }
}

/**
 * Gets the current authenticated user
 * 
 * @returns {Promise<Object|null>} - Current user or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data?.user || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Gets the current session
 * 
 * @returns {Promise<Object|null>} - Current session or null
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data?.session || null
  } catch (error) {
    console.error('Error getting current session:', error)
    return null
  }
}

/**
 * Sets up a listener for auth state changes
 * 
 * @param {Function} callback - Called when auth state changes
 * @returns {Object} - Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * Creates a new user account
 *
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.name - User name
 * @param {string} [userData.role='user'] - User role
 * @returns {Promise<Object>} - New user object
 */
export async function createUser({ name, email, phone, password, role = 'user' }) {
  try {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store user metadata in the auth system
        data: {
          name,
          role
        }
      }
    })
    
    if (authError) throw authError
    
    // Then create the user profile in the database
    if (authData?.user) {
      const userData = {
        id: authData.user.id, // Use Auth user UUID
        name,
        email,
        phone: phone || null,
        role,
        // Password is only stored in Auth, not in the users table
      }
      
      // Insert user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .insert(userData)
        .select('id, name, email, role')
        .single()
        
      if (userError) throw userError
      
      return userProfile
    } else {
      throw new Error('User creation failed - no user returned from auth')
    }
  } catch (error) {
    throw handleApiError(error, 'User Creation')
  }
}

/**
 * Updates a user's password
 *
 * @param {string} newPassword - The new password
 * @returns {Promise<void>}
 */
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
  } catch (error) {
    throw handleApiError(error, 'Password Update')
  }
}

/**
 * Sends a password reset email
 *
 * @param {string} email - The email address to send reset to
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    })
    
    if (error) throw error
  } catch (error) {
    throw handleApiError(error, 'Password Reset')
  }
}

export default {
  signIn,
  signOut,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
  createUser,
  updatePassword,
  resetPassword
}