-- Add validation fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS needsvalidation BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS validatedat TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS validatedby UUID REFERENCES auth.users(id);

-- Add index for faster filtering by validation status
CREATE INDEX IF NOT EXISTS idx_transactions_needs_validation ON transactions(needsvalidation);
CREATE INDEX IF NOT EXISTS idx_transactions_validated ON transactions(validated);

-- Update existing transactions to set needsvalidation to true where appropriate
-- This assumes that transactions with specific criteria need validation
UPDATE transactions 
SET needsvalidation = true 
WHERE amount > 10000 AND validated = false;

COMMENT ON COLUMN transactions.needsvalidation IS 'Indicates if the transaction requires validation by an executioner';
COMMENT ON COLUMN transactions.validated IS 'Indicates if the transaction has been validated';
COMMENT ON COLUMN transactions.validatedat IS 'Timestamp when the transaction was validated';
COMMENT ON COLUMN transactions.validatedby IS 'User ID of the executioner who validated the transaction';