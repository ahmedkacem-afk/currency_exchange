-- Add action_payload column to notifications table
-- Run this in the Supabase SQL Editor

-- This is a safe command that will only add the column if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_payload JSONB;

-- If you need to drop the column for any reason:
-- ALTER TABLE notifications DROP COLUMN IF EXISTS action_payload;

-- Note: After adding this column, you may need to restart your application
-- or clear any cached schema information