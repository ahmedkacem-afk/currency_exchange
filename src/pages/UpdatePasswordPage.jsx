import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { KeyIcon } from '../components/Icons'

export default function UpdatePasswordPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { show } = useToast()
  const { session } = useAuth()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!password) {
      setError(t('updatePassword.passwordRequired', 'Password is required'))
      return
    }
    
    if (password.length < 6) {
      setError(t('updatePassword.passwordLength', 'Password must be at least 6 characters'))
      return
    }
    
    if (password !== confirmPassword) {
      setError(t('updatePassword.passwordMismatch', 'Passwords do not match'))
      return
    }
    
    setError('')
    setLoading(true)
      try {
      const { error } = await supabase.auth.updateUser({ 
        password
      })
      
      if (error) throw error
      
      // Clear form fields after success
      setPassword('')
      setConfirmPassword('')
      
      show(t('updatePassword.success', 'Password updated successfully'), 'success')
      navigate('/')
      
    } catch (err) {
      console.error('Update password error:', err)
      setError(err.message || t('updatePassword.error', 'Failed to update password'))
      show(err.message || t('updatePassword.error', 'Failed to update password'), 'error')
    } finally {
      setLoading(false)
    }
  }
    return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-xl shadow ring-1 ring-gray-100 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-full">
            <KeyIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">{t('appTitle')}</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t('updatePassword.title', 'Change Password')}
            </h1>
          </div>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1">{t('updatePassword.newPassword', 'New Password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('updatePassword.passwordPlaceholder', 'Enter new password')}
              className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">{t('updatePassword.confirmPassword', 'Confirm Password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('updatePassword.confirmPasswordPlaceholder', 'Confirm new password')}
              className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
            />
          </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={loading}
              className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 py-2 rounded-md disabled:opacity-70"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md disabled:opacity-70"
            >
              {loading 
                ? t('updatePassword.updating', 'Updating...') 
                : t('updatePassword.submit', 'Update Password')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
