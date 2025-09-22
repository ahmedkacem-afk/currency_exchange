/**
 * Database Entity Helper Functions
 * 
 * This module provides utility functions for working with database entities
 * to ensure consistent handling of UUIDs and timestamps.
 */

import { generateUUID } from './uuid';

/**
 * Prepares a new entity by adding required fields like ID
 * 
 * @param {Object} data - The entity data 
 * @returns {Object} - Entity data with UUID added
 */
export function prepareNewEntity(data) {
  return {
    ...data,
    id: generateUUID(),
  };
}

/**
 * Prepares an entity for update
 * 
 * @param {Object} data - The entity update data
 * @returns {Object} - Entity data ready for update
 */
export function prepareEntityUpdate(data) {
  return {
    ...data
  };
}

/**
 * Formats a Supabase error message for display
 * 
 * @param {Error} error - The error object from Supabase
 * @returns {string} - A user-friendly error message
 */
export function formatErrorMessage(error) {
  if (!error) return 'Unknown error';
  
  // Check if it's a database constraint error
  if (error.code === '23505') {
    return 'This record already exists.';
  }
  
  // Check if it's a foreign key violation
  if (error.code === '23503') {
    return 'This operation references a record that doesn\'t exist.';
  }
  
  return error.message || 'An error occurred while processing your request.';
}
