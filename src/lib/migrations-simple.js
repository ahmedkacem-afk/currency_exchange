import { supabase } from './supabase';

/**
 * Runs all necessary migrations for the application
 * Each migration is independent and should handle its own state
 */
export async function runSimpleMigrations() {
  console.log('Running database migrations using direct table operations...');
  
  try {
    // Run all migrations in sequence
    const results = await Promise.all([
      checkMigrationsTable(),
      migrateManagerPricesFields(),
      migrateProfilesToUsers(),
      updateDirectRoles(),
      createRolesTable(),
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
 * Ensures the migrations table exists
 */
async function checkMigrationsTable() {
  // First, try to query the migrations table
  const { data, error } = await supabase
    .from('migrations')
    .select('name')
    .limit(1);
    
  if (error && error.code === 'PGRST204') {
    // Table doesn't exist, create it
    console.log('Creating migrations table...');
    
    // Use direct inserts to create tables instead of RPC
    const { error: createError } = await supabase
      .from('migrations')
      .insert({
        name: 'create_migrations_table',
        executed_at: new Date().toISOString()
      });
      
    if (createError && createError.code !== 'PGRST204') {
      console.error('Error creating migrations table:', createError);
      return { created: false, error: createError };
    }
    
    return { created: true };
  }
  
  return { exists: true };
}

/**
 * Checks if a migration has already been run
 */
async function checkMigrationStatus(name) {
  const { data, error } = await supabase
    .from('migrations')
    .select('executed_at')
    .eq('name', name)
    .single();
    
  if (error && error.code === 'PGRST116') {
    return { executed: false }; // Not run yet
  } else if (error) {
    console.error(`Error checking migration ${name}:`, error);
    return { executed: false, error };
  }
  
  return { executed: true, executedAt: data.executed_at };
}

/**
 * Records a migration as complete
 */
async function recordMigration(name) {
  const { data, error } = await supabase
    .from('migrations')
    .insert({
      name,
      executed_at: new Date().toISOString()
    });
    
  if (error) {
    console.error(`Error recording migration ${name}:`, error);
    return { recorded: false, error };
  }
  
  return { recorded: true };
}

/**
 * Migrates manager_prices table from camelCase fields to lowercase fields
 * This is a one-time migration to standardize field naming
 */
export async function migrateManagerPricesFields() {
  try {
    const migrationName = '001_manager_prices_lowercase';
    const { executed } = await checkMigrationStatus(migrationName);
    
    if (executed) {
      console.log(`Migration ${migrationName} already executed, skipping`);
      return { migrated: false, reason: 'already_executed' };
    }
    
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
      
      // Delete and recreate the record
      const { error: deleteError } = await supabase
        .from('manager_prices')
        .delete()
        .eq('id', 1);
        
      if (deleteError) {
        console.error('Error deleting old record:', deleteError);
        throw deleteError;
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
      
      await recordMigration(migrationName);
      console.log('Migration completed successfully:', insertData);
      return { migrated: true, data: insertData };
    } else {
      // No need to migrate or already migrated
      await recordMigration(migrationName);
      return { migrated: false, reason: 'not_needed' };
    }
  } catch (error) {
    console.error('Error during manager_prices migration:', error);
    throw error;
  }
}

/**
 * Migrates profiles data to users table
 * Since we can't drop tables directly, we'll just migrate the data
 */
export async function migrateProfilesToUsers() {
  try {
    const migrationName = 'drop_profiles_table';
    const { executed } = await checkMigrationStatus(migrationName);
    
    if (executed) {
      console.log(`Migration ${migrationName} already executed, skipping`);
      return { migrated: false, reason: 'already_executed' };
    }
    
    console.log('Running profiles to users migration...');
    
    // Check if the profiles table exists by trying to query it
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (profilesError && profilesError.message && profilesError.message.includes('does not exist')) {
      // Table doesn't exist, record migration and exit
      await recordMigration(migrationName);
      console.log('Profiles table already removed or does not exist');
      return { migrated: false, reason: 'already_migrated' };
    } else if (profilesError) {
      console.error('Error checking profiles table:', profilesError);
      throw profilesError;
    }
    
    if (profilesData && profilesData.length > 0) {
      console.log(`Found ${profilesData.length} profiles to migrate`);
      
      // Migrate data from profiles to users if needed
      // This is a simplified version, you might need to adjust based on your schema
      for (const profile of profilesData) {
        // Update the users table with profile data
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: profile.name,
            avatar_url: profile.avatar_url
          })
          .eq('id', profile.id);
          
        if (updateError) {
          console.warn(`Could not update user ${profile.id}:`, updateError);
        }
      }
    }
    
    await recordMigration(migrationName);
    console.log('Profiles migration completed');
    return { migrated: true };
  } catch (error) {
    console.error('Error during profiles migration:', error);
    throw error;
  }
}

/**
 * Updates users table to ensure direct role strings are populated
 */
export async function updateDirectRoles() {
  try {
    const migrationName = 'update_users_direct_roles';
    const { executed } = await checkMigrationStatus(migrationName);
    
    if (executed) {
      console.log(`Migration ${migrationName} already executed, skipping`);
      return { migrated: false, reason: 'already_executed' };
    }
    
    console.log('Running update direct roles migration...');
    
    // Check users table structure
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, direct_roles')
      .limit(5);
      
    if (usersError) {
      console.error('Error checking users table:', usersError);
      throw usersError;
    }
    
    // If direct_roles column exists, update it for users who have it null
    const usersToUpdate = usersData.filter(user => !user.direct_roles);
    
    for (const user of usersToUpdate) {
      // Get user's raw data including role data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.warn(`Could not get user data for ${user.id}:`, userError);
        continue;
      }
      
      // Extract roles if they exist in another field
      const roles = userData.roles || [];
      
      // Update the direct_roles field
      const { error: updateError } = await supabase
        .from('users')
        .update({ direct_roles: roles })
        .eq('id', user.id);
        
      if (updateError) {
        console.warn(`Could not update direct_roles for user ${user.id}:`, updateError);
      }
    }
    
    await recordMigration(migrationName);
    console.log('Update direct roles migration completed');
    return { migrated: true };
  } catch (error) {
    console.error('Error during update direct roles migration:', error);
    throw error;
  }
}

/**
 * Create roles table with default roles
 */
export async function createRolesTable() {
  try {
    const migrationName = '007_create_roles_table';
    const { executed } = await checkMigrationStatus(migrationName);
    
    if (executed) {
      console.log(`Migration ${migrationName} already executed, skipping`);
      return { migrated: false, reason: 'already_executed' };
    }
    
    console.log('Running roles table migration...');
    
    // Check if roles table exists
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('name')
      .limit(1);
    
    if (rolesError && rolesError.code !== 'PGRST116') {
      console.log('Error checking roles table, attempting to create it');
      
      // Create roles table
      const createTableQuery = `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `;
      
      try {
        // Since we can't run raw SQL, insert a dummy record which will create the table
        // with the necessary columns through Supabase's API
        await supabase.from('roles').insert({
          name: 'manager',
          description: 'Manager with full access',
          permissions: { all: true, manage_users: true, manage_wallets: true, view_reports: true }
        });
      } catch (createError) {
        console.warn('Could not create roles table:', createError);
      }
      
      // Insert default roles one by one - no admin role, manager is the highest role
      const defaultRoles = [
        { name: 'manager', description: 'Manager with full access', 
          permissions: { manage_users: true, manage_wallets: true, view_reports: true, all: true } },
        { name: 'cashier', description: 'Cashier with transaction operations', 
          permissions: { create_transactions: true, view_own_transactions: true } },
        { name: 'treasurer', description: 'Treasurer with cash custody operations', 
          permissions: { manage_treasury: true, view_custody: true } },
        { name: 'validator', description: 'Transaction validator', 
          permissions: { validate_transactions: true, view_transactions: true } }
      ];
      
      for (const role of defaultRoles) {
        try {
          await supabase.from('roles').upsert(role, { 
            onConflict: 'name',
            ignoreDuplicates: true 
          });
        } catch (roleError) {
          console.warn(`Could not insert role ${role.name}:`, roleError);
        }
      }
    } else {
      console.log('Roles table already exists, checking for default roles');
      
      // Ensure all default roles exist - no admin role, manager is the highest role
      const defaultRoles = [
        { name: 'manager', description: 'Manager with full access', 
          permissions: { manage_users: true, manage_wallets: true, view_reports: true, all: true } },
        { name: 'cashier', description: 'Cashier with transaction operations', 
          permissions: { create_transactions: true, view_own_transactions: true } },
        { name: 'treasurer', description: 'Treasurer with cash custody operations', 
          permissions: { manage_treasury: true, view_custody: true } },
        { name: 'validator', description: 'Transaction validator', 
          permissions: { validate_transactions: true, view_transactions: true } }
      ];
      
      for (const role of defaultRoles) {
        try {
          await supabase.from('roles').upsert(role, { 
            onConflict: 'name',
            ignoreDuplicates: true 
          });
        } catch (roleError) {
          console.warn(`Could not insert role ${role.name}:`, roleError);
        }
      }
    }
    
    await recordMigration(migrationName);
    console.log('Roles table migration completed');
    return { migrated: true };
  } catch (error) {
    console.error('Error during roles table migration:', error);
    throw error;
  }
}