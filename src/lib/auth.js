import { supabase } from './supabase'

export function getToken() {
  const session = JSON.parse(localStorage.getItem('sb-dvarinlmaibtdozdqiju-auth-token'))
  return session?.access_token || null
}

export function setToken(token) {
  // This function is kept for compatibility, but actual token storage 
  // is handled by Supabase Auth
  if (token) localStorage.setItem('token', token) // Legacy support
}

export function clearToken() {
  // This is handled by supabase.auth.signOut(), but kept for compatibility
  localStorage.removeItem('token') // Legacy support
}

export function authHeaders() {
  // No longer needed for Supabase, kept for compatibility
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}


