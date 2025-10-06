/**
 * Supabase Session Refresh
 * 
 * This module handles refreshing the Supabase session automatically
 * to prevent unauthorized errors due to expired sessions.
 */

import { supabase } from './supabase/client';

/**
 * Sets up an automatic session refresh mechanism
 * This should be called when the app initializes
 */
export function setupSessionRefresh() {
  // Initial session check
  refreshSession();
  
  // Set up periodic refresh every 10 minutes (600000 ms)
  // This is much shorter than the token expiration time
  const intervalId = setInterval(refreshSession, 600000);
  
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Refreshes the Supabase session if needed
 */
export async function refreshSession() {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // If session exists, check if it's close to expiring
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const timeUntilExpirySecs = Math.floor((expiresAt - now) / 1000);
      
      console.log(`Session check: Expires in ${timeUntilExpirySecs} seconds`);
      
      // If the session expires in less than 5 minutes (300 seconds), refresh it
      if (timeUntilExpirySecs < 300) {
        console.log('Session expiring soon, refreshing...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Error refreshing session:', error);
        } else {
          console.log('Session refreshed successfully, new expiry:', 
            new Date(data.session.expires_at * 1000).toLocaleString());
        }
      }
    }
  } catch (error) {
    console.error('Error checking or refreshing session:', error);
  }
}

export default setupSessionRefresh;