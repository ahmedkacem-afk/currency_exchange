/**
 * Test script to demonstrate extracting cashiers and managers for treasury management
 * 
 * Run this script to see all users by role in the system
 */

import { transactionService } from './src/lib/transactionService.js';
import supabase from './src/lib/supabase/client.js';

async function extractUsersByRole() {
  try {
    console.log('=== Extracting Users by Role for Treasury Management ===\n');
    
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

    // Extract all cashiers
    console.log('Fetching all cashiers...');
    const cashiers = await transactionService.getAllCashiers();
    console.log(`Found ${cashiers.length} cashiers:`);
    cashiers.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.name || 'Unknown'} (${cashier.email})`);
    });
    console.log('------------------------------------------\n');

    // Extract all managers
    console.log('Fetching all managers...');
    const managers = await transactionService.getAllManagers();
    console.log(`Found ${managers.length} managers:`);
    managers.forEach((manager, index) => {
      console.log(`  ${index + 1}. ${manager.name || 'Unknown'} (${manager.email})`);
    });
    console.log('------------------------------------------\n');

    // Extract all treasurers
    console.log('Fetching all treasurers...');
    const treasurers = await transactionService.getAllTreasurers();
    console.log(`Found ${treasurers.length} treasurers:`);
    treasurers.forEach((treasurer, index) => {
      console.log(`  ${index + 1}. ${treasurer.name || 'Unknown'} (${treasurer.email})`);
    });
    console.log('------------------------------------------\n');

    // Use the generic function to get users by role
    const customRole = 'dealings_executioner'; // Example custom role
    console.log(`Fetching users with role '${customRole}'...`);
    const customRoleUsers = await transactionService.getUsersByRole(customRole);
    console.log(`Found ${customRoleUsers.length} users with role '${customRole}':`);
    customRoleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'Unknown'} (${user.email})`);
    });

    console.log('\nExtraction complete!');
  } catch (error) {
    console.error('Error extracting users by role:', error);
  } finally {
    // Close the Supabase client to allow the script to exit
    supabase.removeAllSubscriptions();
    process.exit(0);
  }
}

// Run the function
extractUsersByRole();