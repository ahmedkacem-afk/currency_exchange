-- Currency Exchange Schema for Supabase --

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT
  -- Note: password is stored in Supabase Auth, not here
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  usd DECIMAL NOT NULL DEFAULT 0,
  lyd DECIMAL NOT NULL DEFAULT 0
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  walletId UUID NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL, -- 'buy' or 'sell'
  dinarPrice DECIMAL NOT NULL
);

-- Manager Prices table (singleton)
CREATE TABLE IF NOT EXISTS manager_prices (
  id SERIAL PRIMARY KEY,
  sellold DECIMAL NOT NULL,
  sellnew DECIMAL NOT NULL,
  buyold DECIMAL NOT NULL,
  buynew DECIMAL NOT NULL
);

-- Operations table
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_walletId ON transactions(walletId);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
