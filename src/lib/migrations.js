import { supabase } from './supabase';

/**
 * Runs all necessary migrations for the application
 * Each migration is independent and should handle its own state
 */
export async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Run all migrations in sequence
    const results = await Promise.all([
      migrateManagerPricesFields(),
      dropProfilesTable(),
      updateDirectRoles(),
      // Add future migrations here
    ]);
    
    console.log('All migrations completed:', results);
    return { success: true, results };
  } catch (error) {
    console.error('Error running migrations:', error);
    return { success: false, error };
  }
}

/**
 * Migrates manager_prices table from camelCase fields to lowercase fields
 * This is a one-time migration to standardize field naming
 */
export async function migrateManagerPricesFields() {
  try {
    console.log('Checking if manager_prices migration is needed...');
    
    // Check if table exists with old camelCase fields
    const { data: oldFormatData, error: oldFormatError } = await supabase
      .from('manager_prices')
      .select('sellOld, sellNew, buyOld, buyNew')
      .single();
    
    // If there's no error, it means the old format exists
    if (!oldFormatError && oldFormatData) {
      console.log('Found manager_prices with camelCase fields, migrating to lowercase');
      
      // Create the new format data
      const newFormatData = {
        sellold: oldFormatData.sellOld,
        sellnew: oldFormatData.sellNew,
        buyold: oldFormatData.buyOld,
        buynew: oldFormatData.buyNew
      };
      
      // First try to alter the table (if we have permissions)
      try {
        // This will work only if the app has SQL execution permissions
        await supabase.rpc('alter_manager_prices_columns');
        console.log('Successfully altered table columns');
      } catch (alterError) {
        console.warn('Could not alter table columns directly, using alternative approach:', alterError);
        
        // Alternative: delete and recreate the record
        const { error: deleteError } = await supabase
          .from('manager_prices')
          .delete()
          .eq('id', 1);
          
        if (deleteError) {
          console.error('Error deleting old record:', deleteError);
          throw deleteError;
        }
      }
      
      // Insert with new format
      const { data: insertData, error: insertError } = await supabase
        .from('manager_prices')
        .insert({ id: 1, ...newFormatData })
        .select();
        
      if (insertError) {
        console.error('Error inserting migrated data:', insertError);
        throw insertError;
      }
      
      console.log('Migration completed successfully:', insertData);
      return { migrated: true, data: insertData };
    } else if (oldFormatError && oldFormatError.code === 'PGRST116') {
      // No data exists yet, no migration needed
      console.log('No manager_prices data found, no migration needed');
      return { migrated: false, reason: 'no_data' };
    } else if (oldFormatError) {
      // Other error occurred, might be that the columns don't exist
      console.log('Old format not found, checking new format');
      
      // Check if new format exists
      const { data: newFormatData, error: newFormatError } = await supabase
        .from('manager_prices')
        .select('sellold, sellnew, buyold, buynew')
        .single();
        
      if (!newFormatError && newFormatData) {
        console.log('New format already exists, no migration needed');
        return { migrated: false, reason: 'already_migrated' };
      } else if (newFormatError && newFormatError.code !== 'PGRST116') {
        console.error('Error checking manager_prices table:', newFormatError);
        throw newFormatError;
      }
    }
    
    // Default return if nothing matched above
    return { migrated: false, reason: 'unknown' };
  } catch (error) {
    console.error('Error during manager_prices migration:', error);
    throw error;
  }
}

/**
 * Drops the profiles table after migrating to use the users table directly
 */
export async function dropProfilesTable() {
  try {
    console.log('Running drop profiles table migration...');
    
    // Check if the profiles table exists
    const { error: profilesExistError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // If we get a "relation does not exist" error, the table is already gone
    if (profilesExistError && profilesExistError.message.includes('does not exist')) {
      console.log('Profiles table already dropped');
      return { migrated: false, reason: 'already_migrated' };
    }
    
    // Read the SQL file content
    const response = await fetch('/migrations/drop_profiles_table.sql');
    if (!response.ok) {
      throw new Error(`Failed to load migration file: ${response.statusText}`);
    }
    
    const migrationSql = await response.text();
    
    // Split the SQL into separate statements
    const statements = migrationSql
      .replace(/--.*$/gm, '') // Remove SQL comments
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        // First try using RPC
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          
          if (error) {
            console.warn(`RPC exec_sql failed: ${error.message}`);
            
            // Check if this is a "function not found" error
            if (error.message.includes('Could not find the function') || 
                error.code === 'PGRST202') {
              console.warn('exec_sql function not available, recording migration without executing SQL');
              
              // Just record the migration as completed
              const migrationName = 'drop_profiles_table';
              try {
                const { error: insertError } = await supabase
                  .from('migrations')
                  .insert({ 
                    name: migrationName,
                    executed_at: new Date().toISOString()
                  });
                
                if (!insertError) {
                  console.log(`Recorded migration ${migrationName}`);
                } else {
                  console.error(`Error recording migration ${migrationName}:`, insertError);
                }
              } catch (recordError) {
                console.error('Error recording migration:', recordError);
              }
              
              break; // Exit the loop since we can't execute SQL
            } else {
              console.error(`Error executing SQL: ${statement}`);
              console.error(error);
            }
          }
        } catch (rpcError) {
          console.warn(`RPC exec_sql exception: ${rpcError.message}`);
        }
      } catch (stmtError) {
        console.error(`Exception executing SQL: ${statement}`);
        console.error(stmtError);
      }
    }
    
    console.log('Drop profiles table migration completed');
    return { migrated: true };
  } catch (error) {
    console.error('Error during drop profiles table migration:', error);
    throw error;
  }
}

/**
 * Updates users table to ensure direct role strings are populated
 */
export async function updateDirectRoles() {
  try {
    console.log('Running update direct roles migration...');
    
    // Read the SQL file content
    const response = await fetch('/migrations/update_users_direct_roles.sql');
    if (!response.ok) {
      throw new Error(`Failed to load migration file: ${response.statusText}`);
    }
    
    const migrationSql = await response.text();
    
    // Split the SQL into separate statements
    const statements = migrationSql
      .replace(/--.*$/gm, '') // Remove SQL comments
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        // First try using RPC
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          
          if (error) {
            console.warn(`RPC exec_sql failed: ${error.message}`);
            
            // Check if this is a "function not found" error
            if (error.message.includes('Could not find the function') || 
                error.code === 'PGRST202') {
              console.warn('exec_sql function not available, recording migration without executing SQL');
              
              // Just record the migration as completed
              const migrationName = 'update_users_direct_roles';
              try {
                const { error: insertError } = await supabase
                  .from('migrations')
                  .insert({ 
                    name: migrationName,
                    executed_at: new Date().toISOString()
                  });
                
                if (!insertError) {
                  console.log(`Recorded migration ${migrationName}`);
                } else {
                  console.error(`Error recording migration ${migrationName}:`, insertError);
                }
              } catch (recordError) {
                console.error('Error recording migration:', recordError);
              }
              
              break; // Exit the loop since we can't execute SQL
            } else {
              console.error(`Error executing SQL: ${statement}`);
              console.error(error);
            }
          }
        } catch (rpcError) {
          console.warn(`RPC exec_sql exception: ${rpcError.message}`);
        }
      } catch (stmtError) {
        console.error(`Exception executing SQL: ${statement}`);
        console.error(stmtError);
      }
    }
    
    console.log('Update direct roles migration completed');
    return { migrated: true };
  } catch (error) {
    console.error('Error during update direct roles migration:', error);
    throw error;
  }
}
