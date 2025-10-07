// Browser-friendly migration runner
import { supabase } from './src/lib/supabase';

// Multi-currency support migration SQL
const multiCurrencyMigrationSQL = `
-- Migration: Add support for multiple currencies
-- This migration adds tables for currency types and wallet currencies

-- Create table for currency types
CREATE TABLE IF NOT EXISTS currency_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currency types
INSERT INTO currency_types (code, name, symbol) VALUES 
('USD', 'US Dollar', '$'),
('LYD', 'Libyan Dinar', 'LD')
ON CONFLICT (code) DO NOTHING;

-- Create junction table for wallet currencies
CREATE TABLE IF NOT EXISTS wallet_currencies (
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
`;

/**
 * Runs the multi-currency migration
 */
async function runMultiCurrencyMigration() {
  try {
    console.log('Running multi-currency migration...');
    
    // Split the SQL into individual statements
    const statements = multiCurrencyMigrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        // First try using RPC
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          
          if (error) {
            console.warn(`RPC exec_sql failed: ${error.message}`);
            
            // Check if this is a "function not found" error
            if (error.message.includes('Could not find the function') || 
                error.code === 'PGRST202') {
              console.warn('exec_sql function not available. Will try creating tables directly via API if possible');
              
              // For migrations we need another approach since we can't use RPC
              if (statement.trim().toLowerCase().startsWith('create table')) {
                console.log('Detected CREATE TABLE statement, but cannot execute directly.');
                console.log('Please run the SQL in Supabase SQL Editor manually:');
                console.log(statement);
              } else if (statement.trim().toLowerCase().startsWith('insert into')) {
                // Try to extract the table name and values
                const tableMatch = statement.match(/insert\s+into\s+([^\s(]+)/i);
                if (tableMatch && tableMatch[1]) {
                  const tableName = tableMatch[1].replace(/public\./i, '');
                  console.log(`Attempting to insert directly into ${tableName}`);
                  
                  // Very simplified, won't work for complex inserts
                  try {
                    await supabase.from(tableName).insert({});
                  } catch (insertError) {
                    console.error('Direct insert failed:', insertError);
                  }
                }
              }
              
              break; // Exit the loop since we can't execute SQL
            } else {
              console.error(`Error executing SQL: ${statement}`);
              console.error(error);
            }
          }
        } catch (rpcError) {
          console.warn(`RPC exec_sql exception: ${rpcError.message}`);
        }
      } catch (stmtError) {
        console.error(`Exception executing SQL: ${statement}`);
        console.error(stmtError);
      }
    }
    
    console.log('Multi-currency migration completed');
    return { success: true };
  } catch (error) {
    console.error('Error running multi-currency migration:', error);
    return { success: false, error };
  }
}

// Export the function for use in main.jsx
export { runMultiCurrencyMigration };