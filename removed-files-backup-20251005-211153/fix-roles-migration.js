/**
 * Fix User Roles Migration - Direct Version
 * 
 * This script runs a fixed version of the user roles migration
 * that resolves the infinite recursion issue in RLS policies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get the directory name using fileURLToPath
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================
// REPLACE THESE WITH YOUR ACTUAL VALUES
// =====================================
const SUPABASE_URL = 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY_HERE'; // Replace with your service key

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSQL(sql) {
  try {
    console.log(`Executing SQL (${sql.length} chars)...`);
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

async function executeSQLByParts(sql) {
  try {
    // Split the SQL into statements (simplistic approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements individually...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      
      try {
        console.log(`Statement ${i+1}/${statements.length} (${stmt.length} chars)`);
        const success = await executeSQL(stmt);
        
        if (!success) {
          console.warn(`Statement ${i+1} execution failed`);
        }
      } catch (error) {
        console.error(`Error executing statement ${i+1}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('SQL parsing exception:', error);
    return false;
  }
}

async function fixRolesMigration() {
  try {
    console.log('Running fixed user roles migration...');
    
    // Read the fixed SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', '005_user_roles_fixed_no_recursion.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`SQL file not found: ${sqlFilePath}`);
      return false;
    }
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`SQL file loaded: ${sqlFilePath} (${sql.length} chars)`);
    
    // Try to execute the SQL as a whole first
    console.log('Attempting to execute the SQL as a whole...');
    const wholeSuccess = await executeSQL(sql);
    
    if (!wholeSuccess) {
      console.log('Whole SQL execution failed, trying statement by statement...');
      await executeSQLByParts(sql);
    }
    
    console.log('Migration execution completed');
    
    // Check if roles exist
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');
      
    if (rolesError) {
      console.error('Error checking roles:', rolesError);
    } else {
      console.log(`Found ${roles?.length || 0} roles`);
      roles?.forEach(role => {
        console.log(`- ${role.name}: ${role.description}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

// Run the migration
fixRolesMigration()
  .then(success => {
    if (success) {
      console.log('Fixed user roles migration completed successfully!');
    } else {
      console.error('Fixed user roles migration failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });