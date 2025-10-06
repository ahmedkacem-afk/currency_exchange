/**
 * This script creates a function in the database that will add the is_treasury column
 * to the wallets table if it doesn't already exist.
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment or hardcode for this script
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || 'your-anon-key';

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// SQL to create a function that adds the column if it doesn't exist
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.add_is_treasury_column()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'wallets' 
    AND column_name = 'is_treasury'
  ) THEN
    ALTER TABLE wallets ADD COLUMN is_treasury BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_treasury column to wallets table';
  ELSE
    RAISE NOTICE 'is_treasury column already exists in wallets table';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

// Function to create and execute the column addition
async function addIsTreasuryColumn() {
  try {
    console.log('Creating function to add is_treasury column...');
    
    // First create the function
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createFunctionSQL 
    });
    
    if (createError) {
      console.error('Error creating function:', createError);
      return { success: false, error: createError };
    }
    
    console.log('Function created successfully.');
    
    // Now execute the function
    console.log('Adding is_treasury column to wallets table...');
    const { error: execError } = await supabase.rpc('add_is_treasury_column');
    
    if (execError) {
      console.error('Error adding column:', execError);
      return { success: false, error: execError };
    }
    
    console.log('is_treasury column added successfully (or already exists).');
    return { success: true };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}

// Run the function
addIsTreasuryColumn()
  .then(result => {
    if (result.success) {
      console.log('✅ Operation completed successfully.');
    } else {
      console.error('❌ Operation failed.');
    }
  })
  .catch(err => console.error('Fatal error:', err));