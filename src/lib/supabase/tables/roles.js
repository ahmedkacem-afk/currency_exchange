/**
 * User Role API
 * 
 * This module handles all database operations related to user roles
 */

import supabase, { handleApiError } from '../client';

/**
 * Get all available roles
 * 
 * @returns {Promise<Array>} - List of roles
 */
export async function getAllRoles() {
  try {
    console.log('Roles API: Fetching all roles...');
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    console.log(`Roles API: Found ${data?.length || 0} roles`);
    return data || [];
  } catch (error) {
    console.error('Roles API: Error in getAllRoles:', error);
    throw handleApiError(error, 'Get All Roles');
  }
}

/**
 * Get a role by ID
 * 
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} - Role object
 */
export async function getRoleById(roleId) {
  try {
    console.log(`Roles API: Fetching role with ID ${roleId}...`);
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Roles API: Error in getRoleById:', error);
    throw handleApiError(error, 'Get Role By ID');
  }
}

/**
 * Get a role by name
 * 
 * @param {string} roleName - Role name
 * @returns {Promise<Object>} - Role object
 */
export async function getRoleByName(roleName) {
  try {
    console.log(`Roles API: Fetching role with name ${roleName}...`);
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', roleName)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Roles API: Error in getRoleByName:', error);
    throw handleApiError(error, 'Get Role By Name');
  }
}

/**
 * Assign a role to a user
 * 
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} - Updated profile
 */
export async function assignRoleToUser(userId, roleId) {
  try {
    console.log(`Roles API: Assigning role ${roleId} to user ${userId}...`);
    
    // Get current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }
    
    // Check if current user has manager role
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role, role_id')
      .eq('id', currentUser.id)
      .single();
    
    if (!currentUserData) {
      throw new Error('Current user not found');
    }
    
    // Check if the current user has manager role, either directly or via role_id
    let isManager = false;
    
    // Check direct role field first
    if (currentUserData.role === 'manager') {
      isManager = true;
    } 
    // Check role_id if available
    else if (currentUserData.role_id) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', currentUserData.role_id)
        .single();
        
      isManager = roleData?.name === 'manager';
    }
    
    if (!isManager) {
      throw new Error('Only managers can assign roles');
    }
    
    // Update user with new role
    const { data, error } = await supabase
      .from('users')
      .update({ role_id: roleId })
      .eq('id', userId)
      .select('*')
      .single();
      
    if (error) throw error;
    
    console.log(`Roles API: Successfully assigned role to user:`, data);
    return data;
  } catch (error) {
    console.error('Roles API: Error in assignRoleToUser:', error);
    throw handleApiError(error, 'Assign Role To User');
  }
}

/**
 * Get user role
 * 
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} - User role
 */
export async function getUserRole(userId = null) {
  try {
    console.log('Roles API: Getting user role...');
    
    // Get current user if userId not provided
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;
      
      if (!currentUser) {
        console.error('Roles API: No authenticated user found');
        throw new Error('No authenticated user found');
      }
      
      userId = currentUser.id;
    }
    
    console.log(`Roles API: Fetching user for ID: ${userId}`);
    
    // Get user with role info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*') // Select all fields for debugging
      .eq('id', userId)
      .single();
    
    console.log(`Roles API: User query result:`, user);  
      
    if (userError) {
      console.error(`Roles API: Error fetching user:`, userError);
      throw userError;
    }
    
    if (!user) {
      console.error(`Roles API: No user found for ID: ${userId}`);
      return { name: null, id: null };
    }
    
    // Check for direct role string in the user record first
    if (user.role) {
      console.log(`Roles API: Found direct role string: ${user.role} for user ID: ${userId}`);
      return { name: user.role, id: null };
    }
    
    // If no direct role, check for role_id reference
    if (!user.role_id) {
      console.warn(`Roles API: User exists but has no role or role_id for user ID: ${userId}`);
      return { name: null, id: null };
    }
    
    console.log(`Roles API: Found role_id: ${user.role_id}, fetching role details`);
    
    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', user.role_id)
      .single();
      
    if (roleError) {
      console.error(`Roles API: Error fetching role details:`, roleError);
      throw roleError;
    }
    
    if (!role) {
      console.error(`Roles API: No role found with ID: ${user.role_id}`);
      return { name: null, id: null };
    }
    
    console.log(`Roles API: User role found:`, role);
    return role;
  } catch (error) {
    console.error('Roles API: Error in getUserRole:', error);
    throw handleApiError(error, 'Get User Role');
  }
}

/**
 * Check if user has any of the specified roles
 * 
 * @param {Array<string>} roles - Array of role names to check
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<boolean>} - True if user has any of the roles
 */
export async function hasAnyRole(roles = [], userId = null) {
  try {
    if (!Array.isArray(roles) || roles.length === 0) {
      return true; // No roles specified, so any role is allowed
    }
    
    const userRole = await getUserRole(userId);
    
    if (!userRole || !userRole.name) {
      return false; // User has no role
    }
    
    // Special case: Manager role has access to everything
    if (userRole.name === 'manager') {
      return true;
    }
    
    return roles.includes(userRole.name);
  } catch (error) {
    console.error('Roles API: Error in hasAnyRole:', error);
    return false;
  }
}