/**
 * Debug script for testing notification creation with action_payload
 * 
 * This script lets you test notification creation with various payload formats
 * to identify what's causing the "invalid syntax for type json" error
 */

// Import the necessary dependencies
import { createNotification } from './src/lib/supabase/tables/notifications.js';
import { sanitizeJsonData } from './src/lib/supabase/client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env.development' });

async function testNotificationCreation() {
  try {
    // Get current user ID (you'll need to replace this with an actual user ID)
    const userId = 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43'; // Use the same ID from your error logs
    
    console.log('=== TESTING NOTIFICATION CREATION ===');
    
    // Test 1: Simple notification without action_payload
    console.log('\n--- Test 1: Simple notification ---');
    try {
      const simpleNotification = await createNotification({
        userId,
        title: 'Debug Test',
        message: 'Testing simple notification',
        type: 'test',
        referenceId: null,
        requiresAction: false
      });
      console.log('Simple notification created:', simpleNotification);
    } catch (err) {
      console.error('Simple notification failed:', err);
    }
    
    // Test 2: With basic action_payload
    console.log('\n--- Test 2: With basic action_payload ---');
    try {
      const withPayload = await createNotification({
        userId,
        title: 'Debug Test',
        message: 'Testing with action_payload',
        type: 'test',
        referenceId: null,
        requiresAction: false,
        actionPayload: {
          test: true,
          value: 123,
          message: 'test payload'
        }
      });
      console.log('Notification with payload created:', withPayload);
    } catch (err) {
      console.error('Notification with payload failed:', err);
    }
    
    // Test 3: With custody-like action_payload
    console.log('\n--- Test 3: With custody-like action_payload ---');
    try {
      const custodyPayload = {
        amount: 15,
        currencyCode: 'USDT',
        walletId: '07e0e355-e3b1-4895-9077-fddf4525ece9',
        type: 'give_custody'
      };
      
      // Sanitize it first
      const sanitizedPayload = sanitizeJsonData(custodyPayload);
      console.log('Sanitized payload:', sanitizedPayload);
      
      const custodyNotification = await createNotification({
        userId,
        title: 'Test Custody',
        message: 'Testing custody notification',
        type: 'custody_request',
        referenceId: '490a4fbc-0c47-4004-b8ac-57fc17c0dff8',
        requiresAction: false,
        actionPayload: sanitizedPayload
      });
      console.log('Custody notification created:', custodyNotification);
    } catch (err) {
      console.error('Custody notification failed:', err);
    }
    
    console.log('\n=== TESTING COMPLETE ===');
  } catch (err) {
    console.error('Test error:', err);
  }
}

// Run the tests
testNotificationCreation()
  .catch(err => console.error('Fatal error:', err));