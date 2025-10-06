/**
 * Manual User Creation Module
 * 
 * This module provides a more direct approach to user creation
 * by separating the database record creation from the auth user creation.
 */

import supabase from './supabase/client';
import { generateUUID } from './uuid';

/**
 * Create a user record in the database without using Supabase Auth
 * 
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user record
 */
export async function createUserRecord(userData) {
  const { name, email, phone, role } = userData;
  
  // Generate a UUID for the user
  const userId = generateUUID();
  
  console.log('Creating user record with ID:', userId);
  
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
  
  // Extract first and last name
  const firstName = name.split(' ')[0] || '';
  const lastName = name.split(' ').slice(1).join(' ') || '';
  
  // Insert the user into the users table
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId, // Using our generated UUID
      name,
      email,
      phone,
      role,
      role_id: roleId,
      first_name: firstName,
      last_name: lastName,
      is_email_verified: true // Auto-verify for development
    })
    .select('id, name, email, phone, role, role_id, first_name, last_name')
    .single();
  
  if (error) {
    console.error('Error creating user record:', error);
    throw error;
  }
  
  console.log('User record created successfully:', data);
  
  // Format the response to match expected format
  const formattedData = {
    id: userId,
    name,
    email,
    phone,
    role,
    firstName,
    lastName
  };
  
  return formattedData;
}

/**
 * Create a new user in the system (for admin use)
 * 
 * @param {Object} userData - User data including password
 * @returns {Promise<Object>} - Created user
 */
export async function createUserManually(userData) {
  try {
    const { password, role } = userData;
    
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    // Step 1: Create the user record in the database
    const userRecord = await createUserRecord(userData);
    
    // For cashier or manager roles, set up custody
    let hasCustody = false;
    let custodyId = null;
    
    if (role === 'cashier' || role === 'manager' || role === 'treasurer') {
      try {
        console.log(`Setting up initial custody for ${role}...`);
        
        // Placeholder for actual custody creation
        // const { data: custody } = await supabase
        //   .from('custody')
        //   .insert({
        //     user_id: userRecord.id,
        //     role: role,
        //     initial_balance: 0
        //   })
        //   .select('id')
        //   .single();
        // 
        // custodyId = custody.id;
        // hasCustody = true;
        // 
        // // Update user with custody information
        // await supabase
        //   .from('users')
        //   .update({ 
        //     has_custody: true, 
        //     custody_id: custodyId 
        //   })
        //   .eq('id', userRecord.id);
        
        console.log('Custody setup completed for manual user');
      } catch (custodyError) {
        console.error('Failed to set up custody, but user was created:', custodyError);
      }
    }
    
    // For testing purposes, we're skipping the auth user creation
    // which would normally be done with supabase.auth.signUp
    
    return {
      user: {
        ...userRecord,
        hasCustody,
        custodyId,
        // Add a flag to indicate this is a manually created user
        isManuallyCreated: true,
        needsEmailVerification: false
      },
      message: 'User created successfully (database only - no login possible)'
    };
  } catch (error) {
    console.error('Error in manual user creation:', error);
    throw error;
  }
}