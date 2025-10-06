/**
 * Utility functions for timestamp handling
 * 
 * This module provides consistent timestamp handling across the application
 */

/**
 * Creates a timestamp in the correct format for database storage
 * Uses Unix timestamp format (milliseconds since epoch)
 * 
 * @returns {number} Timestamp as milliseconds since epoch
 */
export function createTimestamp() {
  return Date.now();
}

/**
 * Formats a timestamp for display in the UI
 * 
 * @param {number|string|Date} timestamp - Timestamp value (could be Unix timestamp, ISO string, or Date object)
 * @param {Object} options - Display options
 * @param {string} options.format - Format style ('full', 'date', 'time', 'relative')
 * @param {string} options.locale - Locale for formatting (default: user's locale)
 * @returns {string} Formatted timestamp for display
 */
export function formatTimestamp(timestamp, options = {}) {
  const { format = 'full', locale = navigator.language } = options;
  
  // Convert input to a Date object
  let date;
  
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    // Assume it's a Unix timestamp in milliseconds
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    // Try parsing as ISO string first
    date = new Date(timestamp);
    
    // If invalid, try parsing as Unix timestamp
    if (isNaN(date.getTime()) && /^\d+$/.test(timestamp)) {
      date = new Date(parseInt(timestamp, 10));
    }
  } else {
    // Default to current time if input is invalid
    date = new Date();
  }
  
  // Format based on requested style
  switch (format) {
    case 'date':
      return date.toLocaleDateString(locale);
      
    case 'time':
      return date.toLocaleTimeString(locale);
      
    case 'relative':
      return getRelativeTimeString(date);
      
    case 'full':
    default:
      return date.toLocaleString(locale);
  }
}

/**
 * Gets a relative time string (e.g., "2 hours ago")
 * 
 * @param {Date} date - Date object to format
 * @returns {string} Relative time string
 */
function getRelativeTimeString(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}

/**
 * Parses a timestamp value to ensure it's in the correct format for database storage
 * 
 * @param {number|string|Date} timestamp - Timestamp value to parse
 * @returns {number} Unix timestamp in milliseconds
 */
export function parseTimestamp(timestamp) {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  if (typeof timestamp === 'string') {
    // Try parsing as ISO string first
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
    // Try parsing as numeric string
    if (/^\d+$/.test(timestamp)) {
      return parseInt(timestamp, 10);
    }
  }
  
  // Default to current time if parsing fails
  return Date.now();
}