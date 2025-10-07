// Run this script to fix the roles table and populate it with default roles
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables - try both default and development env files
dotenv.config();
dotenv.config({ path: './.env.development' });

// Get Supabase credentials from environment - try both standard and VITE prefixed variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase environment variables');
  console.log('Please ensure one of these variable sets is defined in your .env or .env.development file:');
  console.log('- SUPABASE_URL and SUPABASE_KEY');
  console.log('- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
console.log(`Connecting to Supabase at ${supabaseUrl.substring(0, 30)}...`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function createRolesTableIfNeeded() {
  try {
    console.log('Checking if roles table needs to be created...');
    
    // Check if we can access the roles table
    const { data, error } = await supabase.from('roles').select('name').limit(1);
    
    // If table doesn't exist, we'll get a specific error
    if (error && (error.code === 'PGRST204' || error.message.includes('does not exist'))) {
      console.log('Roles table does not exist or is inaccessible. Attempting to create...');
      
      // Try multiple approaches to create the table
      try {
        // First try using RPC if available
        console.log('Attempting to create table via RPC...');
        const { error: rpcError } = await supabase.rpc('exec_sql', {
          query: `
            CREATE TABLE IF NOT EXISTS public.roles (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT UNIQUE NOT NULL,
              description TEXT,
              permissions JSONB DEFAULT '{}'::jsonb,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
            );
          `
        });
        
        if (rpcError) {
          console.warn('RPC method failed:', rpcError.message);
          throw rpcError; // Try alternative approach
        } else {
          console.log('Successfully created roles table via RPC');
          return true;
        }
      } catch (createError) {
        // If RPC fails, try direct SQL approach using supabase function calls
        console.log('Attempting alternative approach to create table...');
        try {
          // Try to create the table by inserting a first role directly
          // This might work if the table exists but our initial select failed for other reasons
          console.log('Attempting to insert first role to auto-create table...');
          const { error: insertError } = await supabase
            .from('roles')
            .insert({
              name: 'manager',
              description: 'Manager with full access',
              permissions: { all: true, manage_users: true, manage_wallets: true, view_reports: true }
            });
          
          if (insertError && insertError.code !== '23505') { // Ignore if role already exists (23505 is duplicate key)
            console.warn('Direct insert approach failed:', insertError.message);
            
            // Provide guidance for manual table creation
            console.error('\n⚠️ AUTOMATIC TABLE CREATION FAILED ⚠️');
            console.log('\nPlease manually create the roles table in your Supabase project using SQL editor:');
            console.log(`
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Then create a basic role
INSERT INTO roles (name, description, permissions) VALUES 
('manager', 'Manager with full access', '{"all":true,"manage_users":true,"manage_wallets":true,"view_reports":true}'::jsonb);
            `);
            console.log('\nAfter creating the table manually, run this script again.');
            return false;
          } else {
            console.log('Successfully created the roles table with manager role');
            return true;
          }
        } catch (finalError) {
          console.error('All table creation approaches failed:', finalError);
          return false;
        }
      }
    } else if (error) {
      console.error('Unexpected error checking roles table:', error);
      return false;
    } else {
      console.log('Roles table already exists, proceeding with role management');
      return true;
    }
  } catch (error) {
    console.error('Unexpected error in createRolesTableIfNeeded:', error);
    return false;
  }
}

async function fixRolesTable() {
  try {
    console.log('Starting roles table fix script...');
    
    // First, ensure the table exists
    const tableExists = await createRolesTableIfNeeded();
    if (!tableExists) {
      console.log('Could not ensure roles table exists. Exiting.');
      return;
    }
    
    console.log('Ensuring all default roles exist...');
    
    // Default roles to add or update
    const defaultRoles = [
      { 
        name: 'manager', 
        description: 'Manager with full access', 
        permissions: { all: true, manage_users: true, manage_wallets: true, view_reports: true }
      },
      { 
        name: 'cashier', 
        description: 'Cashier with transaction operations', 
        permissions: { create_transactions: true, view_own_transactions: true }
      },
      { 
        name: 'treasurer', 
        description: 'Treasurer with cash custody operations', 
        permissions: { manage_treasury: true, view_custody: true }
      },
      { 
        name: 'validator', 
        description: 'Transaction validator', 
        permissions: { validate_transactions: true, view_transactions: true }
      },
      {
        name: 'admin',
        description: 'System administrator with all permissions',
        permissions: { all: true }
      }
    ];
    
    // Insert or update each role
    for (const role of defaultRoles) {
      try {
        console.log(`Ensuring role exists: ${role.name}`);
        const { data, error } = await supabase
          .from('roles')
          .upsert(role, { 
            onConflict: 'name',
            ignoreDuplicates: false // Update existing roles
          });
        
        if (error) {
          console.error(`Error upserting role ${role.name}:`, error);
          
          // Try insert if upsert fails
          try {
            console.log(`Trying direct insert for role: ${role.name}`);
            const { error: insertError } = await supabase.from('roles').insert(role);
            if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
              console.error(`Failed to insert role ${role.name}:`, insertError);
            } else if (!insertError) {
              console.log(`Successfully inserted role: ${role.name}`);
            }
          } catch (insertErr) {
            console.error(`Exception during insert of role ${role.name}:`, insertErr);
          }
        } else {
          console.log(`Successfully upserted role: ${role.name}`);
        }
      } catch (roleError) {
        console.error(`Exception while upserting role ${role.name}:`, roleError);
      }
    }
    
    // Get all roles to verify
    const { data: finalRoles, error: finalError } = await supabase.from('roles').select('*');
    
    if (finalError) {
      console.error('Error fetching final roles list:', finalError);
    } else {
      console.log('Current roles in database:');
      console.table(finalRoles || []);
    }
    
    console.log('Roles table fix script completed!');
  } catch (error) {
    console.error('Unexpected error during roles fix:', error);
  }
}

// Run the function
fixRolesTable()
  .catch(err => {
    console.error('Fatal error:', err);
  })
  .finally(() => {
    console.log('Script execution finished.');
  });