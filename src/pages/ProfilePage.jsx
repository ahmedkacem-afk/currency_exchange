import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const { t } = useI18n()
  const { user, userData, session } = useAuth()
  const { show } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  
  useEffect(() => {
    if (userData) {
      setFormData(prevData => ({
        ...prevData,
        name: userData.name || '',
        email: userData.email || user?.email || '',
      }))
    }
  }, [userData, user])
  
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    // Validate form
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = t('profile.nameRequired', 'Name is required')
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = t('profile.passwordLength', 'Password must be at least 6 characters')
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('profile.passwordMismatch', 'Passwords do not match')
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setLoading(true)
    
    try {
      // Update profile information
      const updates = {
        name: formData.name,
        updated_at: new Date().toISOString(),
      }
      
      const { error: profileError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
      
      if (profileError) throw profileError
      
      // Update password if provided
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        })
        
        if (passwordError) throw passwordError
      }
      
      show(t('profile.updateSuccess', 'Profile updated successfully'), 'success')
      
      // Clear password fields after successful update
      setFormData(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }))
      
    } catch (error) {
      console.error('Error updating profile:', error)
      show(error.message || t('profile.updateError', 'Error updating profile'), 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">{t('profile.title', 'Profile Settings')}</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.name', 'Name')}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600"
            />
            {errors.name && <p className="mt-1 text-red-600 text-sm">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.email', 'Email')}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              disabled
              className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">{t('profile.emailChangeDisabled', 'Email cannot be changed')}</p>
          </div>
          
          <div className="border-t pt-5 mt-5">
            <h2 className="text-lg font-medium mb-3">{t('profile.changePassword', 'Change Password')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.newPassword', 'New Password')}</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600"
                />
                {errors.newPassword && <p className="mt-1 text-red-600 text-sm">{errors.newPassword}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.confirmPassword', 'Confirm Password')}</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600"
                />
                {errors.confirmPassword && <p className="mt-1 text-red-600 text-sm">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md disabled:opacity-70"
            >
              {loading ? t('profile.updating', 'Updating...') : t('profile.saveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
