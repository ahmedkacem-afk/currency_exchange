-- Add is_treasury column to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_treasury BOOLEAN DEFAULT FALSE;