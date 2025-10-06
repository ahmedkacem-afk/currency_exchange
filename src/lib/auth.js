import { supabase } from './supabase'

// Get the token from localStorage - handles different Supabase storage key formats
export function getToken() {
  try {
    // Try to get the token from the new format
    const storageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    
    if (storageKeys.length) {
      const sessionStr = localStorage.getItem(storageKeys[0]);
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        return session?.access_token || null;
      }
    }
    
    // Fall back to the hardcoded key if needed
    const session = JSON.parse(localStorage.getItem('sb-dvarinlmaibtdozdqiju-auth-token'));
    return session?.access_token || null;
  } catch (error) {
    console.error('Error reading token from localStorage:', error);
    return null;
  }
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
  // No longer needed for Supabase, but kept for compatibility
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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

// Check if there is an active session
export async function checkSession() {
  const session = await getCurrentSession();
  return {
    isAuthenticated: !!session,
    session
  };
}


