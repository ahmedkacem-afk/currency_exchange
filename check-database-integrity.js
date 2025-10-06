// Script to check database table structure
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.development
dotenv.config({ path: './.env.development' });

// Get Supabase URL and key from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', SUPABASE_URL ? 'Found' : 'Not found');
console.log('Supabase Key:', SUPABASE_KEY ? 'Found' : 'Not found');

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...');
    
    // Get column names for transactions table
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error retrieving transactions:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const transaction = data[0];
      console.log('Transaction column names:');
      console.log(Object.keys(transaction));
    } else {
      console.log('No transactions found to check structure');
    }
    
    console.log('Check completed successfully!');
  } catch (error) {
    console.error('Check failed:', error);
  }
}

// Run the check
checkDatabaseStructure().then(() => {
  console.log('Database check script execution completed');
});
