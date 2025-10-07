// add-test-custody-records.js
// Script to add test custody records for different users
// Run with: node add-test-custody-records.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get user input
async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main function
async function addTestCustodyRecords() {
  try {
    console.log('Fetching all users...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email');
      
    if (usersError) {
      throw usersError;
    }
    
    if (!users || users.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }
    
    console.log('Users found:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email} (${user.id})`);
    });
    
    // Get all currency types
    const { data: currencies, error: currenciesError } = await supabase
      .from('currency_types')
      .select('code, name');
      
    if (currenciesError) {
      throw currenciesError;
    }
    
    if (!currencies || currencies.length === 0) {
      console.log('No currencies found. Please add currency types first.');
      return;
    }
    
    console.log('\nCurrencies available:');
    currencies.forEach((currency, index) => {
      console.log(`${index + 1}. ${currency.code} (${currency.name})`);
    });
    
    // Create custody records for each user with each currency
    const custodyRecords = [];
    
    for (const user of users) {
      for (const currency of currencies) {
        // Generate a random amount between 100 and 10000
        const amount = Math.floor(Math.random() * 9900 + 100);
        
        custodyRecords.push({
          user_id: user.id,
          currency_code: currency.code,
          amount: amount,
          updated_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`\nPrepared ${custodyRecords.length} test custody records.`);
    const confirm = await askQuestion('Do you want to insert these records? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      return;
    }
    
    // Insert the records in batches of 20
    const batchSize = 20;
    for (let i = 0; i < custodyRecords.length; i += batchSize) {
      const batch = custodyRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('custody')
        .insert(batch);
        
      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(custodyRecords.length / batchSize)}`);
      }
    }
    
    console.log('Finished inserting test custody records!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
addTestCustodyRecords();