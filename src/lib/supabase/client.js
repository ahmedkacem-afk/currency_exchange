/**
 * Supabase Client
 * 
 * This module initializes and exports the Supabase client instance.
 * It serves as the core connection to the Supabase backend.
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.')
} else {
  console.log('Supabase credentials loaded successfully')
}

/**
 * The Supabase client instance
 * Used for all interactions with the Supabase backend
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Handles API errors and formats them consistently
 * 
 * @param {Error} error - The error from Supabase
 * @param {String} context - Optional context for where the error occurred
 * @returns {Error} - A formatted error
 */
/**
 * Safely validate and sanitize a JSON object to ensure it can be properly sent to Supabase
 * 
 * @param {any} data - The data to sanitize
 * @returns {Object|null} - Sanitized data or null if invalid
 */
export function sanitizeJsonData(data) {
  if (data === null || data === undefined) return '{}';
  
  try {
    // If it's already a string, assume it's properly formatted JSON
    if (typeof data === 'string') {
      // Validate that it's valid JSON by parsing it
      JSON.parse(data);
      return data;
    }
    
    // Convert objects to JSON strings
    return JSON.stringify(data);
  } catch (err) {
    console.error('Failed to sanitize JSON data:', err);
    return '{}';
  }
}

export function handleApiError(error, context = '') {
  const contextPrefix = context ? `[${context}] ` : ''
  
  if (!error) return new Error(`${contextPrefix}Unknown error occurred`)
  
  // Log the error for debugging
  console.error(`${contextPrefix}Supabase Error:`, error)
  
  // Check for specific error types
  if (error.code === '23505') {
    return new Error(`${contextPrefix}This record already exists`)
  }
  
  if (error.code === '23503') {
    return new Error(`${contextPrefix}This operation references a record that doesn't exist`)
  }
  
  // Handle JSON syntax errors
  if (error.code === '22P02' && error.message?.includes('input syntax for type json')) {
    return new Error(`${contextPrefix}Invalid JSON format in request`)
  }
  
  // Return the original error message or a generic one
  return new Error(
    `${contextPrefix}${error.message || 'An error occurred while processing your request'}`
  )
}

export default supabase