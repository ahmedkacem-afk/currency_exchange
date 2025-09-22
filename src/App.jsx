import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useLocation, NavLink } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WithdrawalsPage from './pages/WithdrawalsPage.jsx'
import CreateEntitiesPage from './pages/CreateEntitiesPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import { I18nProvider, useI18n } from './i18n/I18nProvider.jsx'
import Button from './components/Button.jsx'
import { MenuIcon, UserIcon, LogoutIcon, KeyIcon } from './components/Icons.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { supabase } from './lib/supabase.js'
import RegisterPage from './pages/RegisterPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import UpdatePasswordPage from './pages/UpdatePasswordPage.jsx'

function Layout({ children }) {
  const { t, lang, toggleLang, dir } = useI18n()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { session, isAuthenticated, profile } = useAuth()

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang])

  const isLogin = location.pathname === '/login'
  const isAuthed = isAuthenticated

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900">
      <header className="bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to={isAuthed ? '/' : '/login'} className="font-semibold tracking-tight">{t('appTitle')}</Link>
          <div className="flex items-center gap-3">
            {isAuthed && !isLogin && (
              <>
                <nav className="hidden md:flex gap-2 text-sm">
                  <NavLink to="/" end className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.dashboard')}</NavLink>
                  <NavLink to="/withdrawals" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.withdrawals')}</NavLink>
                  <NavLink to="/create" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.create')}</NavLink>
                </nav>
                <div className="hidden md:block relative group">
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
                    <span className="text-sm truncate max-w-[100px]">{profile?.name || t('nav.account')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-100 invisible opacity-0 transform translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                    <div className="py-1">
                      <NavLink to="/update-password" className={({ isActive }) => `flex items-center gap-1.5 px-4 py-2 text-sm ${isActive ? 'bg-gray-100 text-emerald-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <KeyIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="inline-block">{t('nav.changePassword', 'Change Password')}</span>
                      </NavLink>
                      <button 
                        onClick={async () => {
                          await supabase.auth.signOut();
                          window.location.href = '/login';
                        }}
                        className="w-full text-left flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogoutIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="inline-block">{t('nav.logout', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button className="md:hidden p-2 rounded hover:bg-gray-100" onClick={() => setOpen(o => !o)} aria-label="Menu">
                  <MenuIcon />
                </button>
              </>
            )}
            <Button variant="outline" onClick={toggleLang} className="h-9 px-3">{lang === 'en' ? 'ع' : 'EN'}</Button>
          </div>
        </div>
        {isAuthed && !isLogin && (
          <>
            {/* Overlay */}
            <div className={`fixed inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:hidden z-10`} onClick={() => setOpen(false)} />
            {/* Side drawer */}
            <div className={`fixed top-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} h-full w-64 bg-white shadow-xl z-20 transform transition-transform md:hidden ${open ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}`}>
              <div className="p-4">
                {profile && (
                  <div className="mb-4 pb-3 border-b border-gray-100">
                    <div className="font-medium text-sm">{profile.name}</div>
                    <div className="text-xs text-gray-500">{profile.email}</div>
                  </div>
                )}
                <nav className="flex flex-col gap-2 text-sm">
                  <NavLink onClick={() => setOpen(false)} to="/" end className={({ isActive }) => `px-3 py-2 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.dashboard')}</NavLink>
                  <NavLink onClick={() => setOpen(false)} to="/withdrawals" className={({ isActive }) => `px-3 py-2 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.withdrawals')}</NavLink>
                  <NavLink onClick={() => setOpen(false)} to="/create" className={({ isActive }) => `px-3 py-2 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.create')}</NavLink>
                  <NavLink onClick={() => setOpen(false)} to="/update-password" className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>
                    <KeyIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="inline-block">{t('nav.changePassword', 'Change Password')}</span>
                  </NavLink>
                  
                  <button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = '/login';
                    }}
                    className="mt-2 w-full flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 bg-white text-gray-800 text-left hover:bg-gray-50"
                  >
                    <LogoutIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="inline-block">{t('nav.logout', 'Sign Out')}</span>
                  </button>
                </nav>
              </div>
            </div>
          </>
        )}
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  )
}



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



