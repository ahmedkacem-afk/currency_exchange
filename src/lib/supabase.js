import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.')
} else {
  console.log('Supabase credentials loaded: URL exists:', !!supabaseUrl, 'Key exists:', !!supabaseAnonKey)
}

// Fallback to hardcoded values if environment variables are not available
const finalUrl = supabaseUrl 
const finalKey = supabaseAnonKey 
export const supabase = createClient(finalUrl, finalKey)

// Authentication helpers
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function getUser() {
  return supabase.auth.getUser()
}

export function getSession() {
  return supabase.auth.getSession()
}

// Session monitoring
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
