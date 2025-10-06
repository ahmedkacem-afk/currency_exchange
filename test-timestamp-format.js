// Test script to verify timestamp format
import supabase from './src/lib/supabase/client.js';
import { generateUUID } from './src/lib/uuid.js';

async function testTimestampFormat() {
  try {
    console.log('Testing timestamp format insertion...');
    
    // Create a test transaction with Unix timestamp (milliseconds)
    const transactionData = {
      id: generateUUID(),
      type: 'test',
      walletid: null,
      currency_code: 'USD',
      amount: 1.0,
      exchange_currency_code: 'LYD',
      exchange_rate: 1.0,
      total_amount: 1.0,
      client_name: 'Test Client',
      createdat: Date.now() // Unix timestamp in milliseconds
    };
    
    console.log('Inserting test transaction with timestamp:', transactionData.createdat);
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select();
      
    if (error) {
      console.error('Error inserting test transaction:', error);
      return;
    }
    
    console.log('Test transaction inserted successfully:', data);
    
    // Clean up the test transaction
    await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionData.id);
      
    console.log('Test transaction deleted.');
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testTimestampFormat().then(() => {
  console.log('Test script execution completed');
});