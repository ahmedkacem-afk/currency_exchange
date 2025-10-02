import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WithdrawalsPage from './pages/WithdrawalsPage.jsx'
import CreateEntitiesPage from './pages/CreateEntitiesPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import UpdatePasswordPage from './pages/UpdatePasswordPage.jsx'
import Layout from './components/Layout.jsx'



export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/withdrawals" element={<WithdrawalsPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
              </Route>
              
              {/* Admin and manager routes */}
              <Route element={<ProtectedRoute requiredRoles={["admin", "manager"]} />}>
                <Route path="/create" element={<CreateEntitiesPage />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  )
}



