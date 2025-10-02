-- Migration: Add support for multiple currencies
-- This migration adds tables for currency types and wallet currencies

-- Create table for currency types
CREATE TABLE currency_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currency types
INSERT INTO currency_types (code, name, symbol) VALUES 
('USD', 'US Dollar', '$'),
('LYD', 'Libyan Dinar', 'LD');

-- Create junction table for wallet currencies
CREATE TABLE wallet_currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  currency_code TEXT REFERENCES currency_types(code) ON DELETE CASCADE,
  balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(wallet_id, currency_code)
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_wallet_currencies_updated_at
BEFORE UPDATE ON wallet_currencies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for all wallet balances (including the legacy fields)
CREATE OR REPLACE VIEW wallet_balances_view AS
SELECT 
  w.id AS wallet_id,
  w.name AS wallet_name,
  w.usd AS legacy_usd,
  w.lyd AS legacy_lyd,
  wc.currency_code,
  wc.balance
FROM 
  wallets w
LEFT JOIN 
  wallet_currencies wc ON w.id = wc.wallet_id;