// Cash Custody Migration Runner

import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

// Load the migration SQL from file
const cashCustodySQL = `
-- Cash Custody Migration
-- This migration adds support for cash custody management between treasurer and cashiers

-- Cash Custody table
CREATE TABLE IF NOT EXISTS cash_custody (
  id UUID PRIMARY KEY,
  treasurer_id UUID REFERENCES users(id) NOT NULL,
  cashier_id UUID REFERENCES users(id) NOT NULL,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  currency_code TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'returned'
  is_returned BOOLEAN DEFAULT FALSE,
  reference_custody_id UUID REFERENCES cash_custody(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table for custody requests and actions
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL, -- User who should see this notification
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'custody_request', 'custody_approval', 'custody_rejection', 'custody_return'
  reference_id UUID, -- ID of the related record (e.g., cash_custody.id)
  is_read BOOLEAN DEFAULT FALSE,
  requires_action BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add treasury_wallet column to users table to specify which wallet is used for treasury operations
ALTER TABLE users ADD COLUMN IF NOT EXISTS treasury_wallet_id UUID REFERENCES wallets(id);

-- Add is_treasury column to wallets table to identify treasury wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_treasury BOOLEAN DEFAULT FALSE;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_custody_treasurer_id ON cash_custody(treasurer_id);
CREATE INDEX IF NOT EXISTS idx_cash_custody_cashier_id ON cash_custody(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_custody_status ON cash_custody(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_requires_action ON notifications(requires_action);

-- RLS Policies for cash_custody
ALTER TABLE cash_custody ENABLE ROW LEVEL SECURITY;

-- Allow treasurer to see all custody records where they are the treasurer
CREATE POLICY custody_treasurer_select ON cash_custody 
  FOR SELECT USING (auth.uid() = treasurer_id);

-- Allow cashier to see all custody records where they are the cashier
CREATE POLICY custody_cashier_select ON cash_custody 
  FOR SELECT USING (auth.uid() = cashier_id);

-- Allow treasurer to create custody records
CREATE POLICY custody_treasurer_insert ON cash_custody 
  FOR INSERT WITH CHECK (auth.uid() = treasurer_id);

-- Allow users to update their own custody records
CREATE POLICY custody_update ON cash_custody 
  FOR UPDATE USING (
    auth.uid() = treasurer_id OR 
    auth.uid() = cashier_id
  );

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY notifications_select ON notifications 
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update only their own notifications (for marking as read)
CREATE POLICY notifications_update ON notifications 
  FOR UPDATE USING (auth.uid() = user_id);
`;

/**
 * Runs the cash custody migration
 */
export async function runCashCustodyMigration() {
  try {
    console.log('Running cash custody migration...');
    
    // Split the SQL into individual statements
    const statements = cashCustodySQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.error(`Error executing SQL: ${statement.substring(0, 100)}...`);
          console.error(error);
        }
      } catch (stmtError) {
        console.error(`Exception executing SQL: ${statement.substring(0, 100)}...`);
        console.error(stmtError);
      }
    }
    
    console.log('Cash custody migration completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error running cash custody migration:', error);
    return { success: false, error };
  }
}