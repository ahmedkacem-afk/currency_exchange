/**
 * Migration to add user roles - Direct Database Version
 * 
 * This script connects directly to the database to run migrations
 * without requiring environment variables from Vite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@supabase/supabase-js';
const { createClient } = pkg;

// Get the directory name using fileURLToPath
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded configuration - replace with your actual values
const SUPABASE_URL = 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY'; // Replace with your key

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  try {
    console.log('Running user roles migration...');
    console.log(`Using Supabase URL: ${SUPABASE_URL}`);

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', '005_user_roles_fixed.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log(`SQL file loaded from: ${sqlFilePath}`);
    console.log(`SQL file size: ${sql.length} characters`);
    
    // Split the SQL into statements for direct execution
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Direct database query function
    async function executeSQL(sqlStatement) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlStatement + ';' });
        
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
    
    // Execute each statement
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i+1}/${statements.length}: ${stmt.substring(0, 50)}...`);
      
      const success = await executeSQL(stmt);
      if (success) successCount++;
    }
    
    console.log(`Migration completed. ${successCount}/${statements.length} statements executed successfully.`);
    
    // Verify the roles table exists and contains the expected roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');
      
    if (rolesError) {
      console.error('Error verifying roles table:', rolesError);
    } else {
      console.log(`Found ${roles?.length || 0} roles in the database:`);
      roles?.forEach(role => console.log(`- ${role.name}: ${role.description}`));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error };
  }
}

runMigration()
  .then(result => {
    if (result.success) {
      console.log('Migration script completed successfully');
      process.exit(0);
    } else {
      console.error('Migration script failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in migration script:', error);
    process.exit(1);
  });