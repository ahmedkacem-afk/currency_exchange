/**
 * Test User Role System
 * 
 * This script tests various aspects of the role system:
 * - Lists all available roles
 * - Checks current user's role
 * - Verifies user has required roles
 */

import supabase from './src/lib/supabase/client.js';
import { getAllRoles, getUserRole, hasAnyRole } from './src/lib/supabase/tables/roles.js';

async function testRoleSystem() {
  try {
    console.log('=== TESTING ROLE SYSTEM ===');
    
    // Check if user is authenticated
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session?.user) {
      console.error('Error: No authenticated user found. Please log in first.');
      return;
    }
    
    const userId = sessionData.session.user.id;
    console.log(`Authenticated user: ${sessionData.session.user.email} (${userId})`);
    
    // 1. Test getAllRoles
    console.log('\n--- Testing getAllRoles ---');
    try {
      const roles = await getAllRoles();
      console.log(`Found ${roles.length} roles:`);
      roles.forEach(role => console.log(`- ${role.name}: ${role.description}`));
    } catch (error) {
      console.error('Error getting roles:', error);
    }
    
    // 2. Test getUserRole
    console.log('\n--- Testing getUserRole ---');
    try {
      const userRole = await getUserRole(userId);
      console.log(`User role: ${userRole?.name || 'No role assigned'}`);
      
      // Check if user's profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileError) {
        console.error('Error getting user profile:', profileError);
      } else {
        console.log('User profile:', profile);
        
        if (profile.role_id) {
          // Get role details from ID
          const { data: roleDetails, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('id', profile.role_id)
            .single();
          
          if (roleError) {
            console.error('Error getting role details:', roleError);
          } else {
            console.log('Role details from profile.role_id:', roleDetails);
          }
        } else {
          console.log('Profile has no role_id assigned');
        }
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
    
    // 3. Test hasAnyRole
    console.log('\n--- Testing hasAnyRole ---');
    
    const rolesToCheck = ['manager', 'treasurer', 'cashier', 'dealings_executioner'];
    for (const role of rolesToCheck) {
      try {
        const hasRole = await hasAnyRole([role], userId);
        console.log(`Has ${role} role: ${hasRole}`);
      } catch (error) {
        console.error(`Error checking for ${role} role:`, error);
      }
    }
    
    console.log('\n=== ROLE SYSTEM TEST COMPLETED ===');
  } catch (error) {
    console.error('Error testing role system:', error);
  }
}

testRoleSystem()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Unhandled error:', err));