/**
 * Fixed version of createUser with simplified auth.signUp options
 */
import { supabase } from './supabase';
import { generateUUID } from './uuid';
import { formatErrorMessage } from './entityHelpers';

/**
 * Creates a user without affecting the current session
 * 
 * @param {Object} payload User data including email, password, etc.
 * @returns {Promise<Object>} Created user data
 */
export async function createUserFixed(payload) {
  const { name, email, phone, password, role = 'user' } = payload;
  
  try {
    console.log('Creating user with role:', role);
    
    // First, get the role_id from the roles table
    let roleId = null;
    if (role) {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', role)
        .single();
      
      if (roleError) {
        console.error('Error fetching role:', roleError);
        throw new Error(`Role '${role}' not found. Please choose a valid role.`);
      } else {
        roleId = roleData.id;
        console.log(`Found role ID for ${role}:`, roleId);
      }
    } else {
      throw new Error('A role must be selected when creating a user.');
    }
    
    // Try the user's requested approach - use auth.signUp with shouldCreateUser: false
    // This should create the auth record without triggering session changes
    try {
      console.log('Creating auth user with shouldCreateUser: false to prevent session issues');
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: null,
          shouldCreateUser: false // This prevents session changes
        }
      });
      
      if (authError) {
        console.warn('Warning: Failed to create auth user with shouldCreateUser: false option:', authError);
        console.log('Continuing with database-only user creation');
      } else {
        console.log('Auth user created successfully with shouldCreateUser: false');
      }
    } catch (authError) {
      console.warn('Error creating auth user:', authError);
      console.log('Continuing with database-only user creation');
    }
    
    // Extract first and last name
    const firstName = name.split(' ')[0] || '';
    const lastName = name.split(' ').slice(1).join(' ') || '';
    
    // Generate our own UUID for this user
    const userId = generateUUID();
    
    // Create the user record in the database
    console.log('Creating user record in database with ID:', userId);
    
    const userData = {
      id: userId,
      email,
      name,
      phone,
      role,
      role_id: roleId,
      first_name: firstName,
      last_name: lastName,
      is_email_verified: true,
      auth_linked: true
    };
    
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, role')
      .single();
    
    if (userError) {
      console.error('Error creating user record:', userError);
      throw userError;
    }
    
    console.log('User record created successfully:', userRecord.id);
    
    // For treasurer role, create a treasury wallet
    let hasCustody = false;
    let custodyId = null;
    let treasuryWallet = null;
    
    if (role === 'treasurer') {
      try {
        console.log('Creating treasury wallet for treasurer user...', name);
        // Import the createTreasuryWallet function directly
        const { createTreasuryWallet } = await import('./supabase/tables/wallet_custody_helpers');
        
        // Create treasury wallet with user's name
        treasuryWallet = await createTreasuryWallet(userId, name);
        
        if (treasuryWallet) {
          console.log('Treasury wallet created successfully:', treasuryWallet.id);
          hasCustody = true;
        }
      } catch (treasuryError) {
        console.error('Failed to create treasury wallet:', treasuryError);
        // Non-critical error, continue with user creation
      }
    }
    
    // Format and return the user data
    const formattedUser = {
      id: userId,
      name,
      email,
      phone,
      role,
      firstName,
      lastName,
      hasCustody,
      custodyId,
      treasuryWallet: treasuryWallet ? {
        id: treasuryWallet.id,
        name: treasuryWallet.name
      } : null,
      needsEmailVerification: true,
      authLinked: true
    };
    
    return {
      user: formattedUser,
      message: 'User created successfully.'
    };
    
  } catch (error) {
    console.error('Error creating user:', error);
    
    try {
      console.error('Error details:', JSON.stringify(error, null, 2));
    } catch (e) {
      console.error('Could not stringify error:', e);
    }
    
    // Handle specific error cases
    if (error.message?.includes('already registered') || 
        error.message?.includes('already in use') ||
        (error.code === '23505')) {
      throw new Error('This email is already registered');
    }
    
    if (error.message?.includes('network') || 
        error.message?.includes('connection')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // For authentication 500 errors, provide a more specific message
    if (error.status === 500 && error.message?.includes('auth')) {
      throw new Error('Authentication service error. Please try again later or contact support.');
    }
    
    // Use our error formatter for other cases
    throw new Error(formatErrorMessage(error));
  }
}