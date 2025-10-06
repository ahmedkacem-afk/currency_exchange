import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useEffect, useState } from 'react'

export function ProtectedRoute({ requiredRole, requiredRoles }) {
  const { isAuthenticated, userRole, isLoading, session, hasRole, user } = useAuth()
  const [delayedLoading, setDelayedLoading] = useState(true)
  
  // Use a slight delay to avoid flash of unauthorized content
  // This gives auth state time to load properly when accessing direct URLs
  useEffect(() => {
    let timer;
    
    if (!isLoading) {
      // Small delay to ensure auth is fully checked
      timer = setTimeout(() => {
        setDelayedLoading(false)
      }, 500)
    } else {
      setDelayedLoading(true)
    }
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isLoading, isAuthenticated, session])
  
  // Show loading state while authentication is being checked
  if (isLoading || delayedLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    )
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login')
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }
  
  // Merge requiredRole and requiredRoles into a single array for checking
  let rolesToCheck = [];
  
  if (requiredRole) {
    rolesToCheck.push(requiredRole);
  }
  
  if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    rolesToCheck = [...rolesToCheck, ...requiredRoles];
  }
  
  // Check if user has the required role(s)
  if (rolesToCheck.length > 0) {
    console.log(`ProtectedRoute: Checking if user role '${userRole}' is in required roles [${rolesToCheck.join(', ')}]`);
    console.log(`ProtectedRoute: User information:`, { 
      userRole, 
      userId: user?.id,
      hasRoleFunction: !!hasRole,
      sessionPresent: !!session
    });
    
    // Check for potential issues
    if (!userRole) {
      console.error(`ProtectedRoute: ERROR - User role is NULL or UNDEFINED. This likely means the role was not properly loaded from the database.`);
      console.error(`ProtectedRoute: SUGGESTION - Check if users table has a role or role_id for this user and if getUserRole is working correctly.`);
    }
    
    const hasRequiredRole = hasRole(rolesToCheck);
    console.log(`ProtectedRoute: Has required role: ${hasRequiredRole}`);
    
    if (!hasRequiredRole) {
      console.log(`ProtectedRoute: Access denied - User role '${userRole}' not in required roles [${rolesToCheck.join(', ')}]`);
      console.log(`ProtectedRoute: To fix this issue, make sure the user has one of these roles in the users table.`);
      return <Navigate to="/unauthorized" replace />;
    } else {
      console.log(`ProtectedRoute: Access granted - User role '${userRole}' authorized`);
    }
  }
  
  // If authenticated and meets role requirements, render the child routes
  return <Outlet />
}
