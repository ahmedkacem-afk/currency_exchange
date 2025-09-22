/**
 * UUID Generation Utilities
 * 
 * This module provides functions for generating and validating UUIDs
 * Used for creating IDs for database tables that require UUIDs
 */

/**
 * Generates a UUID v4
 * Uses native crypto.randomUUID() if available, falls back to manual implementation
 * @returns {string} A UUID v4 string
 */
export function generateUUID() {
  // Use native crypto.randomUUID() if available (modern browsers and Node.js)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Checks if a string is a valid UUID
 * @param {string} str - The string to validate
 * @returns {boolean} True if the string is a valid UUID, false otherwise
 */
export function isValidUUID(str) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
}
