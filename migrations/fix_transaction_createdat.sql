-- Fix missing createdat values in transactions table
-- This migration ensures all transactions have a valid createdat timestamp

-- Simply set all NULL createdat values to current timestamp in milliseconds
UPDATE transactions
SET createdat = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE createdat IS NULL;

-- Ensure the column is not nullable for future records
ALTER TABLE transactions
ALTER COLUMN createdat SET NOT NULL;

-- Add default value for future inserts
ALTER TABLE transactions 
ALTER COLUMN createdat SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

COMMENT ON COLUMN transactions.createdat IS 'Unix timestamp in milliseconds when the transaction was created';