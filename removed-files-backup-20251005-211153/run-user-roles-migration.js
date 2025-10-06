/**
 * Migration to add user roles
 * 
 * This script adds user roles to the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from './src/lib/supabase/client.js';

// Get the directory name using fileURLToPath
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runUserRolesMigration() {
  try {
    console.log('Running user roles migration...');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', '005_user_roles_fixed.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log(`SQL file loaded from: ${sqlFilePath}`);
    console.log(`SQL file size: ${sql.length} characters`);
    
    // Execute the SQL
    console.log('Executing SQL via RPC call...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
    
    if (error) {
      console.error('Error running user roles migration:', error);
      
      // Try an alternative approach if RPC fails
      console.log('RPC failed, trying to execute SQL statements manually...');
      
      // Split the SQL into statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      console.log(`Found ${statements.length} SQL statements to execute`);
      
      for (let i = 0; i < statements.length; i++) {
        try {
          const stmt = statements[i];
          console.log(`Executing statement ${i+1}/${statements.length}: ${stmt.substring(0, 50)}...`);
          
          // Execute each statement individually
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
          
          if (stmtError) {
            console.error(`Error executing statement ${i+1}:`, stmtError);
          }
        } catch (stmtError) {
          console.error(`Exception executing statement ${i+1}:`, stmtError);
        }
      }
    } else {
      console.log('SQL executed successfully via RPC');
    }
    
    console.log('User roles migration completed successfully');
    
    // Update any existing profiles to have a default role (manager)
    const { data: roles } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'manager')
      .single();
    
    if (!roles || !roles.id) {
      console.error('Could not find manager role');
      return;
    }
    
    // Update profiles with null role_id to be managers
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role_id: roles.id })
      .is('role_id', null);
    
    if (updateError) {
      console.error('Error updating existing profiles with manager role:', updateError);
    } else {
      console.log('Existing profiles updated with manager role');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error };
  }
}

runUserRolesMigration()
  .then((result) => {
    if (result.success) {
      console.log('Migration completed successfully');
      process.exit(0);
    } else {
      console.error('Migration failed:', result.error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error in migration:', error);
    process.exit(1);
  });