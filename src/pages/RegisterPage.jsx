import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { show } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  
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
      newErrors.name = t('register.nameRequired', 'Name is required')
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('register.emailRequired', 'Email is required')
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('register.emailInvalid', 'Email is invalid')
    }
    
    if (!formData.password) {
      newErrors.password = t('register.passwordRequired', 'Password is required')
    } else if (formData.password.length < 6) {
      newErrors.password = t('register.passwordLength', 'Password must be at least 6 characters')
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('register.passwordMismatch', 'Passwords do not match')
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setLoading(true)
    
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      })
      
      if (authError) throw authError
      
      // Step 2: Insert user profile data
      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              name: formData.name,
              role: 'user', // Default role
              created_at: new Date().toISOString(),
            }
          ])
        
        if (profileError) throw profileError
      }
      
      show(t('register.success', 'Registration successful! Please check your email for verification.'), 'success')
      
      // Redirect to login page after successful registration
      navigate('/login')
      
    } catch (error) {
      console.error('Registration error:', error)
      show(error.message || t('register.error', 'Error during registration'), 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-xl shadow ring-1 ring-gray-100 p-6">
        <div className="mb-5">
          <div className="text-sm text-gray-500">{t('appTitle')}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('register.title', 'Create Account')}</h1>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1">{t('register.name', 'Full Name')}</label>
            <input
              name="name"
              type="text"
              placeholder={t('register.namePlaceholder', 'Enter your full name')}
              className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
          </div>
          
          <div>
            <label className="block text-sm mb-1">{t('register.email', 'Email Address')}</label>
            <input
              name="email"
              type="email"
              placeholder={t('register.emailPlaceholder', 'Enter your email')}
              className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <div className="text-red-600 text-sm mt-1">{errors.email}</div>}
          </div>
          
          <div>
            <label className="block text-sm mb-1">{t('register.password', 'Password')}</label>
            <input
              name="password"
              type="password"
              placeholder={t('register.passwordPlaceholder', 'Create a password')}
              className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <div className="text-red-600 text-sm mt-1">{errors.password}</div>}
          </div>
          
          <div>
            <label className="block text-sm mb-1">{t('register.confirmPassword', 'Confirm Password')}</label>
            <input
              name="confirmPassword"
              type="password"
              placeholder={t('register.confirmPasswordPlaceholder', 'Confirm your password')}
              className="w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && <div className="text-red-600 text-sm mt-1">{errors.confirmPassword}</div>}
          </div>
          
          <button
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md disabled:opacity-70"
          >
            {loading ? t('register.processing', 'Processing...') : t('register.submit', 'Create Account')}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-gray-600">
              {t('register.alreadyHaveAccount', 'Already have an account?')} {' '}
              <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                {t('register.signIn', 'Sign In')}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
