/**
 * Quick Role Fix Script
 * 
 * This script fixes role issues by directly assigning manager role to the current user
 */

import { supabase } from './src/lib/supabase';

async function fixUserRole() {
  try {
    console.log('Starting role fix process...');
    
    // Step 1: Check if we have an authenticated user
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return false;
    }
    
    if (!sessionData?.session?.user) {
      console.error('No authenticated user found. Please log in first.');
      return false;
    }
    
    const userId = sessionData.session.user.id;
    console.log(`Current user: ${sessionData.session.user.email} (${userId})`);
    
    // Step 2: Check if the roles table exists and has the manager role
    const { data: managerRole, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'manager')
      .single();
      
    if (roleError) {
      console.error('Error getting manager role:', roleError);
      console.log('Attempting to create roles table and manager role...');
      
      // Try to create the roles table and manager role
      const { error: createError } = await supabase.rpc('exec_sql', { 
        sql: `
          CREATE TABLE IF NOT EXISTS public.roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          INSERT INTO public.roles (name, description)
          VALUES ('manager', 'Has access to all system features and functionalities')
          ON CONFLICT (name) DO NOTHING;
        `
      });
      
      if (createError) {
        console.error('Error creating roles table:', createError);
        return false;
      }
      
      // Check again for manager role
      const { data: newRole, error: newRoleError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', 'manager')
        .single();
        
      if (newRoleError || !newRole) {
        console.error('Failed to create manager role:', newRoleError);
        return false;
      }
      
      console.log('Successfully created manager role:', newRole);
      managerRole = newRole;
    }
    
    if (!managerRole) {
      console.error('Manager role not found and could not be created');
      return false;
    }
    
    console.log('Found manager role:', managerRole);
    
    // Step 3: Check if the profiles table exists and has a record for the current user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // If no profile exists, create one
    if (profileError || !profile) {
      console.log('No profile found for current user, creating one...');
      
      // Create profiles table if it doesn't exist
      const { error: tableError } = await supabase.rpc('exec_sql', { 
        sql: `
          CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            first_name VARCHAR,
            last_name VARCHAR,
            email VARCHAR,
            role_id UUID REFERENCES public.roles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (tableError) {
        console.error('Error creating profiles table:', tableError);
        return false;
      }
      
      // Create profile for current user
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: sessionData.session.user.email,
          role_id: managerRole.id
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating profile:', createError);
        return false;
      }
      
      console.log('Successfully created profile with manager role:', newProfile);
      return true;
    }
    
    // Step 4: Update existing profile with manager role
    console.log('Updating existing profile with manager role...');
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ role_id: managerRole.id })
      .eq('user_id', userId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return false;
    }
    
    console.log('Successfully updated profile with manager role:', updatedProfile);
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the fix
fixUserRole()
  .then(success => {
    if (success) {
      console.log('Role fix completed successfully!');
      console.log('Please restart your application for changes to take effect.');
    } else {
      console.error('Role fix failed!');
    }
  })
  .catch(error => {
    console.error('Fatal error during role fix:', error);
  });