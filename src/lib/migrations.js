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
