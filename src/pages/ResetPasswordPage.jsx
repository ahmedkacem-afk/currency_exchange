import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { show } = useToast()
  
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email) {
      setError(t('resetPassword.emailRequired', 'Email is required'))
      return
    }
    
    setError('')
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      
      if (error) throw error
      
      setIsSubmitted(true)
      show(t('resetPassword.emailSent', 'Password reset link sent! Check your email.'), 'success')
      
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err.message || t('resetPassword.error', 'Failed to send reset link'))
      show(err.message || t('resetPassword.error', 'Failed to send reset link'), 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-xl shadow ring-1 ring-gray-100 p-6">
        <div className="mb-5">
          <div className="text-sm text-gray-500">{t('appTitle')}</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('resetPassword.title', 'Reset Password')}
          </h1>
        </div>
        
        {isSubmitted ? (
          <div className="text-center p-4">
            <div className="text-emerald-600 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-medium mb-3">
              {t('resetPassword.checkEmail', 'Check Your Email')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('resetPassword.instructions', 'We\'ve sent a password reset link to your email address.')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md"
            >
              {t('resetPassword.backToLogin', 'Back to Login')}
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="text-gray-600 mb-4">
              {t('resetPassword.enterEmail', 'Enter your email address and we\'ll send you a link to reset your password.')}
            </p>
            
            <div>
              <label className="block text-sm mb-1">{t('resetPassword.email', 'Email Address')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
              />
              {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
            </div>
            
            <button
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md disabled:opacity-70"
            >
              {loading 
                ? t('resetPassword.sending', 'Sending...') 
                : t('resetPassword.sendLink', 'Send Reset Link')}
            </button>
            
            <div className="text-center mt-4">
              <a href="/login" className="text-emerald-600 hover:text-emerald-700">
                {t('resetPassword.backToLogin', 'Back to Login')}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
