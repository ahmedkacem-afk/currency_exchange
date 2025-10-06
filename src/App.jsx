import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WithdrawalsPage from './pages/WithdrawalsPage.jsx'
import CreateEntitiesPage from './pages/CreateEntitiesPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import CashierPage from './pages/CashierPage.jsx'
import BuyCurrencyPage from './pages/BuyCurrencyPage.jsx'
import SellCurrencyPage from './pages/SellCurrencyPage.jsx'
import DealershipExecutionerPage from './pages/DealershipExecutionerPage.jsx'
import DebtManagementPage from './pages/DebtManagementPage.jsx'
import TreasurerPage from './pages/TreasurerPage.jsx'
import TreasurerDemoPage from './pages/TreasurerDemoPage.jsx'
import CustodyManagement from './pages/CustodyManagement.jsx'
import GiveCustody from './pages/GiveCustody.jsx'
import UserManagement from './pages/UserManagement.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import UpdatePasswordPage from './pages/UpdatePasswordPage.jsx'
import Layout from './components/Layout.jsx'
import RoleSystemDebug from './pages/RoleSystemDebug.jsx'
import { setupSessionRefresh } from './lib/sessionRefresh.js'

export default function App() {
  // Set up session refresh mechanism when app loads
  useEffect(() => {
    const cleanup = setupSessionRefresh();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

// Separate component to access auth context
function AppRoutes() {
  // Access auth state directly
  const authState = useAuth();
  
  // Enhanced routing with persistent auth state
  return (
    <Layout>
      <Routes>
        {/* Public routes - always accessible */}
        <Route path="/login" element={
          authState?.isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Public demo route - accessible without login */}
        <Route path="/treasurer-demo" element={<TreasurerDemoPage />} />
        
        {/* Routes accessible to any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/withdrawals" element={<WithdrawalsPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/role-debug" element={<RoleSystemDebug />} />
        </Route>
        
        {/* Manager-only routes */}
        <Route element={<ProtectedRoute requiredRoles={["manager"]} />}>
          <Route path="/create" element={<CreateEntitiesPage />} />
          <Route path="/user-management" element={<UserManagement />} />
        </Route>
        
        {/* Cashier routes - accessible by manager and cashier roles */}
        <Route element={<ProtectedRoute requiredRoles={["manager", "cashier"]} />}>
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/cashier/buy" element={<BuyCurrencyPage />} />
          <Route path="/cashier/sell" element={<SellCurrencyPage />} />
        </Route>
        
        {/* Treasurer routes - accessible by manager and treasurer roles */}
        <Route element={<ProtectedRoute requiredRoles={["manager", "treasurer"]} />}>
          <Route path="/treasurer" element={<TreasurerPage />} />
          <Route path="/custody-management" element={<CustodyManagement />} />
          <Route path="/give-custody" element={<GiveCustody />} />
        </Route>
        
        {/* Dealings Executioner routes - accessible by manager and dealings_executioner roles */}
        <Route element={<ProtectedRoute requiredRoles={["manager", "dealings_executioner"]} />}>
          <Route path="/dealership-executioner" element={<DealershipExecutionerPage />} />
          <Route path="/debt-management" element={<DebtManagementPage />} />
        </Route>
        
        {/* Catch-all route - attempt to route to the requested page if authenticated */}
        <Route path="*" element={
          authState?.isLoading ? (
            // Show loading spinner while checking auth
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
              <div className="mt-4 text-gray-600">Loading your session...</div>
            </div>
          ) : authState?.isAuthenticated ? (
            // If authenticated, go to dashboard
            <Navigate to="/" replace />
          ) : (
            // If not authenticated, go to login with the current path as state
            <Navigate 
              to="/login" 
              replace 
              state={{ from: window.location.pathname }} 
            />
          )
        } />
      </Routes>
    </Layout>
  );
}



