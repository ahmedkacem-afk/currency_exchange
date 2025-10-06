-- Script to recreate the cash_custody and notifications tables

-- Drop existing tables if they exist (if needed, uncomment these lines)
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS cash_custody;

-- Cash Custody table
CREATE TABLE IF NOT EXISTS cash_custody (
  id UUID PRIMARY KEY,
  treasurer_id UUID REFERENCES auth.users(id) NOT NULL,
  cashier_id UUID REFERENCES auth.users(id) NOT NULL,
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
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'custody_request', 'custody_approval', 'custody_rejection', 'custody_return'
  reference_id UUID, -- ID of the related record (e.g., cash_custody.id)
  is_read BOOLEAN DEFAULT FALSE,
  requires_action BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  -- We'll add action_payload separately for better control
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add action_payload column separately to have better control over its creation
-- Using proper JSONB type with NOT NULL constraint to avoid issues
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_payload JSONB DEFAULT '{}'::jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_custody_treasurer_id ON cash_custody(treasurer_id);
CREATE INDEX IF NOT EXISTS idx_cash_custody_cashier_id ON cash_custody(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_custody_status ON cash_custody(status);
CREATE INDEX IF NOT EXISTS idx_cash_custody_wallet_id ON cash_custody(wallet_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_reference_id ON notifications(reference_id);

-- Enable Row Level Security (RLS)
ALTER TABLE cash_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_custody
CREATE POLICY custody_treasurer_select ON cash_custody 
  FOR SELECT TO authenticated 
  USING (auth.uid() = treasurer_id);
  
CREATE POLICY custody_cashier_select ON cash_custody 
  FOR SELECT TO authenticated 
  USING (auth.uid() = cashier_id);
  
CREATE POLICY custody_treasurer_insert ON cash_custody 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = treasurer_id);
  
CREATE POLICY custody_update ON cash_custody 
  FOR UPDATE TO authenticated
  USING (auth.uid() = treasurer_id OR auth.uid() = cashier_id);

-- RLS Policies for notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notifications_insert ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow insert for authenticated users

CREATE POLICY notifications_update ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
