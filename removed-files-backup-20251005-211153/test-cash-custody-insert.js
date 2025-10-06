/**
 * This script directly inserts a record into the cash_custody table 
 * to test if there's an issue with the table structure.
 */

import { supabase } from './src/lib/supabase/client.js';
import { generateUUID } from './src/lib/uuid.js';

async function testDirectCashCustodyInsert() {
  try {
    console.log('Testing direct insert into cash_custody table...');
    
    // Create a test record
    const testRecord = {
      id: generateUUID(),
      treasurer_id: 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43',  // Use actual user ID from your system
      cashier_id: 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43',    // Same ID for testing
      wallet_id: '07e0e355-e3b1-4895-9077-fddf4525ece9',     // Use actual wallet ID
      currency_code: 'USDT',
      amount: 10,
      notes: 'Test insert',
      is_returned: false,
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting to insert record:', testRecord);
    
    // Try direct insert
    const { data, error } = await supabase
      .from('cash_custody')
      .insert(testRecord)
      .select();
    
    if (error) {
      console.error('Error inserting record:', error);
      
      // If that fails, try with a more minimal record
      console.log('\nTrying with minimal record...');
      const minimalRecord = {
        id: generateUUID(),
        treasurer_id: 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43',
        cashier_id: 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43',
        wallet_id: '07e0e355-e3b1-4895-9077-fddf4525ece9',
        currency_code: 'USDT',
        amount: 10,
        status: 'approved'
      };
      
      const { data: minData, error: minError } = await supabase
        .from('cash_custody')
        .insert(minimalRecord)
        .select();
        
      if (minError) {
        console.error('Error inserting minimal record:', minError);
      } else {
        console.log('Success with minimal record:', minData);
      }
    } else {
      console.log('Success! Record inserted:', data);
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

// Run the test
testDirectCashCustodyInsert().catch(console.error);