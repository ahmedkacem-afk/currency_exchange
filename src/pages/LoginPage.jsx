import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { login } from '../lib/supabaseApi.js'
import { useToast } from '../components/Toast.jsx'

export default function LoginPage() {
  const { t, dir } = useI18n()
  const [email, setEmail] = useState('manager@example.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      show('Logged in successfully', 'success')
      navigate('/')
    } catch (e) {
      console.error('Login error:', e)
      setError(e.message || 'Invalid credentials')
      show(e.message || 'Invalid credentials', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-xl shadow ring-1 ring-gray-100 p-6">
        <div className="mb-5">
          <div className="text-sm text-gray-500">{t('appTitle')}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1">{t('login.email')}</label>
            <input placeholder="manager@example.com" className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('login.password')}</label>
            <input placeholder="password123" type="password" className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end mb-2">
            <a href="/reset-password" className="text-sm text-emerald-600 hover:text-emerald-800">
              {t('login.forgotPassword', 'Forgot password?')}
            </a>
          </div>
          <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md">
            {loading ? '...' : t('login.submit')}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-gray-600">
              {t('login.noAccount', "Don't have an account?")} {' '}
              <a href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
                {t('login.signUp', 'Sign Up')}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}


