/**
 * Example implementation of user creation without session changes
 * 
 * This demonstrates the shouldCreateUser: false approach
 */
import { supabase } from './supabase';

/**
 * Creates a user in auth without affecting the current session
 * 
 * @param {Object} userData User data including email and password
 * @returns {Promise<Object>} Result of operation
 */
export async function createAuthUserWithoutSessionChange(userData) {
  const { email, password, name } = userData;
  
  try {
    console.log('Creating auth user with shouldCreateUser: false to prevent session issues');
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: null,
        shouldCreateUser: false // Don't create auth user automatically (prevent session change)
      }
    });
    
    if (error) {
      console.warn('Failed to create auth user with shouldCreateUser: false option:', error);
      return { success: false, error };
    }
    
    console.log('Auth user created successfully with shouldCreateUser: false');
    return { success: true, data };
  } catch (error) {
    console.error('Error creating auth user:', error);
    return { success: false, error };
  }
}

/**
 * Full user creation flow using the shouldCreateUser: false approach
 * 
 * @param {Object} userData User data
 * @returns {Promise<Object>} Created user
 */
export async function createUserWithoutSessionChange(userData) {
  const { email, password, name, role = 'user', phone } = userData;
  
  try {
    // Step 1: Create the user record in the database with custom UUID
    // ... your database user creation logic here ...
    
    // Step 2: Create auth user with shouldCreateUser: false to prevent session change
    const authResult = await createAuthUserWithoutSessionChange({
      email, 
      password, 
      name
    });
    
    if (!authResult.success) {
      console.warn('Auth user creation failed, but database user was created');
      // You may want to handle this case based on your requirements
    }
    
    // Return success message
    return {
      user: {
        email,
        name,
        role,
        // Add other fields as needed
      },
      message: 'User created successfully.'
    };
  } catch (error) {
    console.error('Error in user creation:', error);
    throw error;
  }
}