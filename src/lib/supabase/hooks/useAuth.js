/**
 * useAuth Hook
 * 
 * Custom React hook for authentication functionality
 */

import { useState, useEffect, useCallback } from 'react'
import supabase from '../client'
import * as authService from '../auth'

/**
 * Hook that provides authentication state and functions
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user on initial render
  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true)
        const currentSession = await authService.getCurrentSession()
        setSession(currentSession)
        
        if (currentSession) {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
          
          // Get user profile from the database (users table)
          if (currentUser) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('id, role, name, email')
              .eq('id', currentUser.id)
              .single()
              
            setProfile(userProfile)
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUser()
    
    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (_event, changedSession) => {
        setSession(changedSession)
        setLoading(true)
        
        if (changedSession?.user) {
          setUser(changedSession.user)
          
          // Get updated profile
          const { data } = await supabase
            .from('users')
            .select('id, role, name, email')
            .eq('id', changedSession.user.id)
            .single()
            
          setProfile(data)
        } else {
          setUser(null)
          setProfile(null)
        }
        
        setLoading(false)
      }
    )
    
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true)
      const { user: newUser, session: newSession } = await authService.signIn({ 
        email, 
        password 
      })
      setUser(newUser)
      setSession(newSession)
      return { user: newUser, session: newSession }
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await authService.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    profile,
    session,
    isLoading: loading,
    isAuthenticated: !!session,
    login,
    logout
  }
}