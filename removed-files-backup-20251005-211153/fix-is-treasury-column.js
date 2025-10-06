// Quick fix script to add the missing is_treasury column
import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment or config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// The SQL to execute - just adding the missing column
const SQL = `
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_treasury BOOLEAN DEFAULT FALSE;
`;

async function addMissingColumn() {
  try {
    console.log('Adding missing is_treasury column to wallets table...');
    
    // Try to execute the SQL using RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql: SQL });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // If that fails, try to execute it directly using REST API
      console.log('Attempting alternative execution method...');
      
      // Create a temporary function to execute SQL
      const { error: createFnError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION add_column_if_not_exists() RETURNS void AS $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'wallets' AND column_name = 'is_treasury'
            ) THEN
              ALTER TABLE wallets ADD COLUMN is_treasury BOOLEAN DEFAULT FALSE;
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (createFnError) {
        console.error('Error creating function:', createFnError);
        return;
      }
      
      // Execute the function
      const { error: execError } = await supabase.rpc('add_column_if_not_exists');
      
      if (execError) {
        console.error('Error executing function:', execError);
        return;
      }
      
      console.log('Column added successfully using alternative method!');
    } else {
      console.log('Column added successfully!');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
addMissingColumn()
  .then(() => console.log('Process completed'))
  .catch(err => console.error('Fatal error:', err));