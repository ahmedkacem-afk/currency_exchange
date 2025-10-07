/**
 * Test script to verify the updated cashier and treasurer listing functionality
 * 
 * This script demonstrates how the treasury management will now show proper names
 * in the cashier and treasurer dropdowns instead of just IDs.
 */

import { getCashiers, getTreasurers } from './src/lib/api.js';
import supabase from './src/lib/supabase/client.js';

async function testUserListing() {
  try {
    console.log('=== Testing Cashier and Treasurer Listing ===\n');
    
    // Get the session first
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      process.exit(1);
    }
    
    if (!sessionData.session) {
      console.log('No active session. Please login first.');
      process.exit(1);
    }

    console.log('Current user:', sessionData.session.user.email);
    console.log('------------------------------------------\n');

    // Fetch cashiers with the updated function
    console.log('Fetching all cashiers...');
    const cashiers = await getCashiers();
    console.log(`Found ${cashiers.length} cashiers:`);
    cashiers.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.name || 'No Name'} (${cashier.email || 'No Email'})`);
    });
    console.log('------------------------------------------\n');

    // Fetch treasurers with the new function
    console.log('Fetching all treasurers...');
    const treasurers = await getTreasurers();
    console.log(`Found ${treasurers.length} treasurers:`);
    treasurers.forEach((treasurer, index) => {
      console.log(`  ${index + 1}. ${treasurer.name || 'No Name'} (${treasurer.email || 'No Email'})`);
    });

    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error testing user listing:', error);
  } finally {
    // Close the Supabase client to allow the script to exit
    supabase.removeAllSubscriptions();
    process.exit(0);
  }
}

// Run the function
testUserListing();