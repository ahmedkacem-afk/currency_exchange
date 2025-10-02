/**
 * Users API
 * 
 * This module handles all database operations related to users
 */

import supabase, { handleApiError } from './client'

/**
 * Gets a user profile by ID
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User profile
 */
export async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone')
      .eq('id', userId)
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    throw handleApiError(error, 'Get User')
  }
}

/**
 * Gets a user profile by email
 * 
 * @param {string} email - User email
 * @returns {Promise<Object>} - User profile
 */
export async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone')
      .eq('email', email)
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    throw handleApiError(error, 'Get User By Email')
  }
}

/**
 * Updates a user profile
 * 
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated user profile
 */
export async function updateUserProfile(userId, updates) {
  try {
    // Don't allow updating id or email through this function
    const { id, email, ...safeUpdates } = updates
    
    const { data, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', userId)
      .select('id, name, email, role, phone')
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    throw handleApiError(error, 'Update User Profile')
  }
}

/**
 * Gets all users (admin function)
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object[]>} - Array of user profiles
 */
export async function getAllUsers({ limit = 100, offset = 0 } = {}) {
  try {
    const { data, error, count } = await supabase
      .from('users')
      .select('id, name, email, role, phone', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true })
      
    if (error) throw error
    
    return {
      users: data,
      total: count || 0
    }
  } catch (error) {
    throw handleApiError(error, 'Get All Users')
  }
}

export default {
  getUserById,
  getUserByEmail,
  updateUserProfile,
  getAllUsers
}