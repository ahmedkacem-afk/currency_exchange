import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getSession, getUser, onAuthStateChange } from '../lib/supabase'

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    async function loadUserSession() {
      try {
        // Get initial session
        const { data: { session } } = await getSession()
        
        // Get user if session exists
        let profile = null
        let user = null
        
        if (session) {
          const { data: { user: authUser } } = await getUser()
          user = authUser
          
          // Get user profile from the database
          const { data: userProfile } = await supabase
            .from('users')
            .select('id, role, name, email')
            .eq('id', user.id)
            .single()
            
          profile = userProfile
        }
        
        setState({
          session,
          user,
          profile,
          isLoading: false,
          isAuthenticated: !!session,
        })
      } catch (error) {
        console.error('Error loading user session:', error)
        setState({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }
    
    loadUserSession()
    
    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setState(prevState => ({
        ...prevState,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      }))
      
      // Load user profile when session changes
      if (session?.user) {
        supabase
          .from('users')
          .select('id, role, name, email')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setState(prevState => ({
              ...prevState,
              profile: data,
              user: session.user,
            }))
          })
      }
    })
    
    return () => {
      subscription?.unsubscribe()
    }
  }, [])
  
  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
