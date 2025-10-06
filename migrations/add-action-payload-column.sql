-- Add action_payload column to notifications table using a function approach
-- This approach works even with limited database permissions

-- Create a function to add the column if it doesn't exist
CREATE OR REPLACE FUNCTION add_action_payload_column()
RETURNS void AS $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'action_payload'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE notifications ADD COLUMN action_payload JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_action_payload_column();

-- Drop the function after execution (cleanup)
DROP FUNCTION IF EXISTS add_action_payload_column();