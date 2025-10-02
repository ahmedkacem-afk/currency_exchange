/**
 * Supabase Utilities
 * 
 * Utility functions for working with Supabase data
 */

/**
 * Formats a Supabase error into a user-friendly message
 * 
 * @param {Error} error - The error object from Supabase
 * @param {string} context - Optional context for where the error occurred
 * @returns {string} - Formatted error message
 */
export function formatErrorMessage(error, context = '') {
  if (!error) return 'Unknown error occurred'
  
  const contextPrefix = context ? `[${context}] ` : ''
  
  // Check for specific database error codes
  if (error.code === '23505') {
    return `${contextPrefix}This record already exists.`
  }
  
  if (error.code === '23503') {
    return `${contextPrefix}This operation references a record that doesn't exist.`
  }
  
  // Auth errors
  if (error.message?.includes('Email not confirmed')) {
    return `${contextPrefix}Please check your email to confirm your account before logging in.`
  }
  
  if (error.message?.includes('Invalid login credentials')) {
    return `${contextPrefix}Invalid email or password.`
  }
  
  // Return the original message or a generic one
  return `${contextPrefix}${error.message || 'An error occurred while processing your request.'}`
}

/**
 * Validates email format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates that a password meets requirements
 * 
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
export function validatePassword(password) {
  const minLength = 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  const isValid = 
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber
    
  const errors = []
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`)
  }
  
  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!hasNumber) {
    errors.push('Password must contain at least one number')
  }
  
  // Special character is recommended but not required
  if (!hasSpecialChar) {
    errors.push('Consider adding a special character for stronger security')
  }
  
  return {
    isValid,
    errors,
    strength: calculatePasswordStrength(password)
  }
}

/**
 * Calculates password strength on a scale of 0-100
 * 
 * @param {string} password - Password to evaluate
 * @returns {number} - Strength score (0-100)
 */
function calculatePasswordStrength(password) {
  if (!password) return 0
  
  let score = 0
  
  // Length contribution (up to 25 points)
  score += Math.min(25, password.length * 2)
  
  // Character variety contribution
  if (/[A-Z]/.test(password)) score += 10
  if (/[a-z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15
  
  // Bonus for mixing character types
  let typesCount = 0
  if (/[A-Z]/.test(password)) typesCount++
  if (/[a-z]/.test(password)) typesCount++
  if (/[0-9]/.test(password)) typesCount++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) typesCount++
  
  if (typesCount >= 3) score += 10
  if (typesCount === 4) score += 10
  
  // Penalty for repeating characters
  const repeats = password.match(/(.)\1+/g)
  if (repeats) {
    score -= Math.min(20, repeats.length * 5)
  }
  
  return Math.max(0, Math.min(100, score))
}