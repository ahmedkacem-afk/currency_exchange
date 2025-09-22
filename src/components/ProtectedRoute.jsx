import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function ProtectedRoute({ requiredRole, requiredRoles }) {
  const { isAuthenticated, profile, isLoading } = useAuth()
  
  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    )
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Check if a specific role is required
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }
  
  // Check if user has one of the required roles
  if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    if (!requiredRoles.includes(profile?.role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }
  
  // If authenticated and meets role requirements, render the child routes
  return <Outlet />
}
