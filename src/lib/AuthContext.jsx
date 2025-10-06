import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getSession, getUser, onAuthStateChange } from '../lib/supabase'
import { getUserRole } from './supabase/tables/roles'

const AuthContext = createContext({
  session: null,
  user: null,
  userData: null,
  userRole: null,
  isLoading: true,
  isAuthenticated: false,
  sessionChecked: false,
  hasRole: () => false,
})

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    session: null,
    user: null,
    userData: null,
    userRole: null,
    isLoading: true,
    isAuthenticated: false,
    sessionChecked: false,
    hasRole: (roles) => hasRoleCheck(roles, state.userRole),
  })
  
  // Function to check if user has one of the specified roles
  const hasRoleCheck = (requiredRoles, userRole) => {
    console.log(`hasRoleCheck: Checking if '${userRole}' is in [${Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles}]`);
    
    // No roles required means access is granted
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('hasRoleCheck: No roles required, access granted');
      return true;
    }
    
    // No role means access is denied
    if (!userRole) {
      console.log('hasRoleCheck: User has no role, access denied');
      return false;
    }
    
    // Manager has access to everything
    if (userRole === 'manager') {
      console.log('hasRoleCheck: User is manager, access granted to everything');
      return true;
    }
    
    // Check if user's role is in the required roles array
    const hasAccess = Array.isArray(requiredRoles) 
      ? requiredRoles.includes(userRole)
      : requiredRoles === userRole;
    
    console.log(`hasRoleCheck: User role '${userRole}' ${hasAccess ? 'matches' : 'does not match'} required roles`);
    return hasAccess;
  }

  useEffect(() => {
    // Debug info for session persistence
    console.log('AUTH PROVIDER INITIALIZED - Current path:', window.location.pathname)
    let sessionCheckTimeout
    
    async function loadUserSession() {
      try {
        console.log('Loading user session...')
        // Get initial session
        const { data: { session }, error: sessionError } = await getSession()
        
        if (sessionError) {
          console.error('Error retrieving session:', sessionError)
        }
        
        // Get user if session exists
        let userData = null
        let user = null
        
        if (session) {
          console.log('Session found:', session.user.email, 'Expires:', new Date(session.expires_at * 1000).toLocaleString())
          const { data: { user: authUser }, error: userError } = await getUser()
          
          if (userError) {
            console.error('Error retrieving user:', userError)
          }
          
          user = authUser
          
          if (user) {
            console.log('User data loaded:', user.email)
            // Get user data from the database
            const { data: userRecord, error: userDataError } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single()
              
            if (userDataError) {
              console.error('Error loading user data:', userDataError)
            }
            
            userData = userRecord
            console.log('User data loaded:', userData)
          }
        } else {
          console.log('No active session found')
        }
        
        // Get user role
        let userRole = null;
        if (user) {
          try {
            // First try to get role directly from userData if available
            if (userData?.role) {
              userRole = userData.role;
              console.log('User role loaded directly from userData:', userRole);
            } else {
              // Fall back to getUserRole function
              const roleData = await getUserRole(user.id);
              userRole = roleData?.name || null;
              console.log('User role loaded from getUserRole:', userRole);
            }
          } catch (roleError) {
            console.error('Error loading user role:', roleError);
          }
        }
        
        setState(prevState => ({
          ...prevState,
          session,
          user,
          userData,
          userRole,
          isLoading: false,
          isAuthenticated: !!session,
          sessionChecked: true,
          // Make sure hasRole always has access to the latest userRole
          hasRole: (roles) => hasRoleCheck(roles, userRole),
        }))
      } catch (error) {
        console.error('Error loading user session:', error)
        setState({
          session: null,
          user: null,
          userData: null,
          userRole: null,
          isLoading: false,
          isAuthenticated: false,
          sessionChecked: true,
        })
      }
    }
    
    // Set a maximum time for session check
    sessionCheckTimeout = setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          console.warn('Session check timeout - forcing completion')
          return {
            ...prev,
            isLoading: false,
            sessionChecked: true,
          }
        }
        return prev
      })
    }, 5000) // 5 seconds max waiting time
    
    loadUserSession()
    
    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log(`Auth state changed - Event: ${event}`)
      
      setState(prevState => ({
        ...prevState,
        session,
        isAuthenticated: !!session,
        isLoading: false,
        sessionChecked: true,
      }))
      
      // Load user information when session changes
      if (session?.user) {
        console.log(`Loading user data for: ${session.user.email}`)
        
        // Load user information from users table
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data: userData, error: userDataError }) => {
            if (userDataError) {
              console.error('Error loading user data after auth change:', userDataError)
            } else {
              console.log('User data loaded after auth change:', userData)
              
              // Load user role
              let userRole = null;
              try {
                // First try to get role directly from userData if available
                if (userData?.role) {
                  userRole = userData.role;
                  console.log('User role loaded directly from userData after auth change:', userRole);
                } else {
                  // Fall back to getUserRole function
                  const roleData = await getUserRole(session.user.id);
                  userRole = roleData?.name || null;
                  console.log('User role loaded from getUserRole after auth change:', userRole);
                }
              } catch (roleError) {
                console.error('Error loading user role after auth change:', roleError);
              }
              
              setState(prevState => ({
                ...prevState,
                userData,
                user: session.user,
                userRole,
                // Update hasRole function with new userRole
                hasRole: (roles) => hasRoleCheck(roles, userRole),
              }))
            }
          })
      }
    })
    
    return () => {
      if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout)
      if (subscription) {
        console.log('Unsubscribing from auth state changes')
        subscription.unsubscribe()
      }
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
