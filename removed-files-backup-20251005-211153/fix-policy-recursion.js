/**
 * Quick Policy Fix Script
 * 
 * This script fixes the infinite recursion issue in the RLS policies
 * without needing to run the full migration
 */

import { createClient } from '@supabase/supabase-js';

// =====================================
// REPLACE THESE WITH YOUR ACTUAL VALUES
// =====================================
const SUPABASE_URL = 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY_HERE'; // Replace with your service key

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSQL(sql) {
  try {
    console.log(`Executing SQL: ${sql.substring(0, 50)}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
    
    if (error) {
      console.error('SQL execution error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('SQL execution exception:', error);
    return false;
  }
}

async function fixPolicyRecursion() {
  try {
    console.log('Fixing infinite recursion in RLS policies...');
    
    // 1. Create a view for manager IDs to avoid recursion
    console.log('Step 1: Creating manager_ids view...');
    const createViewSQL = `
    CREATE OR REPLACE VIEW manager_ids AS
    SELECT user_id FROM profiles 
    JOIN roles ON profiles.role_id = roles.id 
    WHERE roles.name = 'manager';
    `;
    
    await executeSQL(createViewSQL);
    
    // 2. Drop existing policies if they exist
    console.log('Step 2: Dropping existing policies...');
    const dropPoliciesSQL = `
    DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
    DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
    DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
    DROP POLICY IF EXISTS roles_select_policy ON public.roles;
    DROP POLICY IF EXISTS roles_insert_update_delete_policy ON public.roles;
    `;
    
    await executeSQL(dropPoliciesSQL);
    
    // 3. Create fixed policies using the view
    console.log('Step 3: Creating fixed policies...');
    const createPoliciesSQL = `
    -- Only allow authenticated users to view their own profiles or managers to view all
    CREATE POLICY profiles_select_policy ON public.profiles 
        FOR SELECT USING (
            -- Users can view their own profile
            auth.uid() = user_id OR 
            -- Or if the user is a manager (using the view to avoid recursion)
            auth.uid() IN (SELECT user_id FROM manager_ids)
        );

    -- Only allow users to insert their own profile or managers to insert any
    CREATE POLICY profiles_insert_policy ON public.profiles 
        FOR INSERT WITH CHECK (
            -- Users can insert their own profile
            auth.uid() = user_id OR 
            -- Or if the user is a manager (using the view to avoid recursion)
            auth.uid() IN (SELECT user_id FROM manager_ids)
        );

    -- Only allow users to update their own profile or managers to update any
    CREATE POLICY profiles_update_policy ON public.profiles 
        FOR UPDATE USING (
            -- Users can update their own profile
            auth.uid() = user_id OR 
            -- Or if the user is a manager (using the view to avoid recursion)
            auth.uid() IN (SELECT user_id FROM manager_ids)
        );

    -- Everyone can view roles
    CREATE POLICY roles_select_policy ON public.roles 
        FOR SELECT USING (true);

    -- Only managers can modify roles
    CREATE POLICY roles_insert_update_delete_policy ON public.roles 
        USING (
            -- Only if the user is a manager (using the view to avoid recursion)
            auth.uid() IN (SELECT user_id FROM manager_ids)
        );
    `;
    
    await executeSQL(createPoliciesSQL);
    
    // 4. Verify the view exists
    console.log('Step 4: Verifying manager_ids view...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT * FROM manager_ids LIMIT 10;`
    });
    
    if (error) {
      console.error('Error verifying manager_ids view:', error);
    } else {
      console.log('manager_ids view created successfully.');
      if (data && data.length > 0) {
        console.log(`Found ${data.length} manager(s):`, data);
      } else {
        console.log('No managers found in view.');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Policy fix error:', error);
    return false;
  }
}

// Run the fix
fixPolicyRecursion()
  .then(success => {
    if (success) {
      console.log('RLS policy fix completed successfully!');
      console.log('Please restart your application for changes to take effect.');
    } else {
      console.error('RLS policy fix failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error during policy fix:', error);
    process.exit(1);
  });