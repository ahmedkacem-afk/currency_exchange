/**
 * Role System Diagnostic Tool
 * 
 * This script helps diagnose issues with the role system
 * by directly checking the database tables and relationships
 */

import { supabase } from './src/lib/supabase';

/**
 * Check if the roles table exists
 */
async function checkRolesTable() {
  console.log('Checking roles table...');
  
  try {
    // Try to query the roles table
    const { data, error } = await supabase
      .from('roles')
      .select('count(*)', { count: 'exact' });
      
    if (error) {
      console.error('Error checking roles table:', error);
      return false;
    }
    
    console.log(`Roles table exists with ${data?.count || 0} roles.`);
    return true;
  } catch (error) {
    console.error('Exception checking roles table:', error);
    return false;
  }
}

/**
 * Check if the profiles table exists
 */
async function checkProfilesTable() {
  console.log('Checking profiles table...');
  
  try {
    // Try to query the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact' });
      
    if (error) {
      console.error('Error checking profiles table:', error);
      return false;
    }
    
    console.log(`Profiles table exists with ${data?.count || 0} profiles.`);
    return true;
  } catch (error) {
    console.error('Exception checking profiles table:', error);
    return false;
  }
}

/**
 * Check if the profiles table has role_id column
 */
async function checkRoleIdColumn() {
  console.log('Checking role_id column in profiles table...');
  
  try {
    // Execute a raw SQL query to check the column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role_id';
      `
    });
      
    if (error) {
      console.error('Error checking role_id column:', error);
      return false;
    }
    
    const hasColumn = Array.isArray(data) && data.length > 0;
    console.log(`role_id column ${hasColumn ? 'exists' : 'does not exist'} in profiles table.`);
    
    if (hasColumn) {
      console.log('Column details:', data[0]);
    }
    
    return hasColumn;
  } catch (error) {
    console.error('Exception checking role_id column:', error);
    return false;
  }
}

/**
 * Get all roles in the system
 */
async function getAllRoles() {
  console.log('Getting all roles...');
  
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error getting roles:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} roles:`);
    data?.forEach(role => console.log(`- ${role.id}: ${role.name} (${role.description})`));
    
    return data || [];
  } catch (error) {
    console.error('Exception getting roles:', error);
    return [];
  }
}

/**
 * Get the current user's profile and role
 */
async function getCurrentUserProfile() {
  console.log('Getting current user profile...');
  
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }
    
    if (!sessionData?.session?.user) {
      console.error('No authenticated user found');
      return null;
    }
    
    const userId = sessionData.session.user.id;
    console.log(`Current user ID: ${userId}`);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (profileError) {
      console.error('Error getting profile:', profileError);
      return null;
    }
    
    if (!profile) {
      console.error('No profile found for current user');
      return null;
    }
    
    console.log('User profile found:', profile);
    
    // Get role if role_id exists
    if (profile.role_id) {
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', profile.role_id)
        .single();
        
      if (roleError) {
        console.error('Error getting role:', roleError);
      } else if (role) {
        console.log('User role:', role);
        return { ...profile, role };
      }
    } else {
      console.warn('Profile has no role_id');
    }
    
    return profile;
  } catch (error) {
    console.error('Exception getting user profile:', error);
    return null;
  }
}

/**
 * Assign manager role to current user
 */
async function assignManagerRole() {
  console.log('Assigning manager role to current user...');
  
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return false;
    }
    
    if (!sessionData?.session?.user) {
      console.error('No authenticated user found');
      return false;
    }
    
    const userId = sessionData.session.user.id;
    console.log(`Current user ID: ${userId}`);
    
    // Get manager role
    const { data: managerRole, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'manager')
      .single();
      
    if (roleError) {
      console.error('Error getting manager role:', roleError);
      return false;
    }
    
    if (!managerRole) {
      console.error('Manager role not found');
      return false;
    }
    
    console.log('Found manager role:', managerRole);
    
    // Update user's profile
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ role_id: managerRole.id })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return false;
    }
    
    console.log('Successfully assigned manager role to current user');
    return true;
  } catch (error) {
    console.error('Exception assigning manager role:', error);
    return false;
  }
}

/**
 * Run all diagnostic checks
 */
async function runDiagnostics() {
  try {
    console.log('=== ROLE SYSTEM DIAGNOSTICS ===');
    
    // Check table existence
    const hasRolesTable = await checkRolesTable();
    const hasProfilesTable = await checkProfilesTable();
    
    if (!hasRolesTable || !hasProfilesTable) {
      console.error('Critical tables missing. Need to run migration.');
      return;
    }
    
    // Check role_id column
    const hasRoleIdColumn = await checkRoleIdColumn();
    
    if (!hasRoleIdColumn) {
      console.error('role_id column missing in profiles table. Need to run migration.');
      return;
    }
    
    // Get all roles
    const roles = await getAllRoles();
    
    if (roles.length === 0) {
      console.error('No roles found. Need to run migration to create default roles.');
      return;
    }
    
    // Check current user profile and role
    const userProfile = await getCurrentUserProfile();
    
    // Offer to assign manager role if needed
    if (!userProfile?.role_id) {
      console.log('\nUser has no role assigned. Would you like to assign the manager role?');
      console.log('To assign manager role, uncomment the assignManagerRole() call below.\n');
      
      // Uncomment the next line to assign manager role
      // await assignManagerRole();
    }
    
    console.log('\n=== DIAGNOSTICS COMPLETE ===');
  } catch (error) {
    console.error('Error running diagnostics:', error);
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);