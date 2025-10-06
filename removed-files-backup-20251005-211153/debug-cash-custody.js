/**
 * Debugging script for the cash_custody issue
 * This file tests different approaches to identify the exact cause of the error
 */

import supabase from './src/lib/supabase.js';

async function debugCashCustodyIssue() {
  console.log('===== Debugging Cash Custody Issue =====');
  
  try {
    // 1. Check schema of the notifications table
    console.log('\n1. Checking notifications table schema...');
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'notifications');
      
    if (schemaError) {
      console.error('Error getting schema:', schemaError);
    } else {
      console.log('Notifications table columns:', columns);
    }
    
    // 2. Try inserting a notification with minimal data
    console.log('\n2. Trying minimal notification insert...');
    const minimalNotification = {
      id: crypto.randomUUID(),
      user_id: 'ee6eb6e3-4356-4a58-b6b7-7062347e2c43',
      title: 'Test Notification',
      message: 'Debug test message',
      type: 'test',
      is_read: false,
      requires_action: false,
      action_taken: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: minResult, error: minError } = await supabase
      .from('notifications')
      .insert(minimalNotification)
      .select();
      
    if (minError) {
      console.error('Minimal insert failed:', minError);
    } else {
      console.log('Minimal insert succeeded:', minResult);
    }
    
    // 3. Try with action_payload as string
    console.log('\n3. Trying string action_payload...');
    const stringPayloadNotification = {
      ...minimalNotification,
      id: crypto.randomUUID(),
      action_payload: JSON.stringify({
        amount: 15,
        currencyCode: 'USDT',
        walletId: '07e0e355-e3b1-4895-9077-fddf4525ece9',
        type: 'give_custody'
      })
    };
    
    const { data: strResult, error: strError } = await supabase
      .from('notifications')
      .insert(stringPayloadNotification)
      .select();
      
    if (strError) {
      console.error('String payload insert failed:', strError);
    } else {
      console.log('String payload insert succeeded:', strResult);
    }
    
    // 4. Try with action_payload as object
    console.log('\n4. Trying object action_payload...');
    const objectPayloadNotification = {
      ...minimalNotification,
      id: crypto.randomUUID(),
      action_payload: {
        amount: 15,
        currencyCode: 'USDT',
        walletId: '07e0e355-e3b1-4895-9077-fddf4525ece9',
        type: 'give_custody'
      }
    };
    
    const { data: objResult, error: objError } = await supabase
      .from('notifications')
      .insert(objectPayloadNotification)
      .select();
      
    if (objError) {
      console.error('Object payload insert failed:', objError);
    } else {
      console.log('Object payload insert succeeded:', objResult);
    }
    
    // 5. Try a raw RPC call
    console.log('\n5. Trying raw SQL insert...');
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
        sql: `
          INSERT INTO notifications (
            id, user_id, title, message, type, is_read, requires_action, action_taken, 
            created_at, updated_at, action_payload
          ) VALUES (
            '${crypto.randomUUID()}', 
            'ee6eb6e3-4356-4a58-b6b7-7062347e2c43', 
            'RPC Test', 
            'Testing via RPC', 
            'test', 
            FALSE, 
            FALSE, 
            FALSE, 
            NOW(), 
            NOW(),
            '{"test": true}'
          )
        `
      });
      
      if (rpcError) {
        console.error('RPC insert failed:', rpcError);
      } else {
        console.log('RPC insert succeeded:', rpcResult);
      }
    } catch (err) {
      console.error('RPC call error:', err);
    }
  } catch (err) {
    console.error('General error:', err);
  }
}

// Run the debug function
debugCashCustodyIssue().catch(console.error);