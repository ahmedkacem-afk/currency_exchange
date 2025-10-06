/**
 * This script tests a minimal notification approach without action_payload
 * to verify that the core notification functionality works.
 */

import { createNotification } from './src/lib/supabase/tables/notifications.js';

async function testMinimalNotification() {
  console.log('=== TESTING MINIMAL NOTIFICATION ===');
  
  try {
    // Use a hardcoded user ID from your error logs
    const userId = 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43';
    
    // Create a notification with NO action_payload
    const result = await createNotification({
      userId,
      title: 'Test Notification',
      message: 'This is a test notification with no action_payload',
      type: 'test',
      referenceId: null,
      requiresAction: false
      // No actionPayload provided
    });
    
    console.log('Success! Notification created:', result);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Run the test
testMinimalNotification().catch(console.error);