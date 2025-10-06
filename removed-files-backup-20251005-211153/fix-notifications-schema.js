/**
 * This script attempts to add the action_payload column to the notifications table
 * using direct REST API calls to Supabase.
 * 
 * Note: This requires appropriate admin permissions to succeed.
 */

import { supabase } from './src/lib/supabase/client.js';

async function addActionPayloadColumn() {
  console.log('Attempting to add action_payload column to notifications table...');
  
  try {
    // Option 1: Using a direct SQL query if permissions allow
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS action_payload JSONB`
    });
    
    if (error) {
      console.error('Failed to add column using RPC:', error);
      console.log('Trying alternative approach...');
      
      // Option 2: Using REST API's pgMeta interface if available
      // Note: This requires the pgMeta extension to be enabled
      const response = await fetch(
        `${process.env.VITE_SUPABASE_URL}/rest/v1/pg_meta/tables/notifications/columns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: 'action_payload',
            type: 'jsonb',
            is_nullable: true
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }
      
      console.log('Column added successfully using REST API!');
      return { success: true, message: 'Column added using REST API' };
    }
    
    console.log('Column added successfully using RPC!');
    return { success: true, message: 'Column added using RPC', data };
  } catch (err) {
    console.error('Failed to add column:', err);
    return { 
      success: false, 
      message: 'Failed to add column. Ensure you have the right permissions.',
      error: err.message
    };
  }
}

// Execute the function
addActionPayloadColumn().then(result => {
  console.log('Result:', result);
  if (result.success) {
    console.log('✅ Action payload column added successfully!');
  } else {
    console.log('❌ Failed to add column. Using code resilience approach instead.');
    console.log('The application has been modified to handle missing columns gracefully.');
  }
}).catch(err => {
  console.error('Unhandled error:', err);
});