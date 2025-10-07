/**
 * Test implementation for shouldCreateUser option
 * 
 * This file demonstrates how to use the shouldCreateUser option to 
 * create a user in auth without affecting the current session.
 */
import { supabase } from './lib/supabase';

/**
 * This function demonstrates the approach requested by the user
 * to use auth.signUp with shouldCreateUser: false
 */
async function testAuthSignupWithoutSessionChange() {
  try {
    const email = 'test@example.com'; // Replace with actual email
    const password = 'password123';   // Replace with actual password
    const name = 'Test User';         // Replace with actual name
    
    console.log('Attempting to create auth user with shouldCreateUser: false option');
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: null,
        shouldCreateUser: false // This is the key option that prevents session change
      }
    });
    
    if (error) {
      console.error('Error creating auth user:', error);
      return;
    }
    
    console.log('Auth user created successfully:', data);
    
    // The current session should not be affected
    const { data: session } = await supabase.auth.getSession();
    console.log('Current session is still active:', !!session?.session);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Uncomment to run the test
// testAuthSignupWithoutSessionChange();

export { testAuthSignupWithoutSessionChange };