/**
 * Check and fix database schema issues
 * 
 * This module provides functions to verify and create required database tables
 * for the currency exchange application, specifically handling multi-currency support.
 */

import { supabase } from './supabase';

/**
 * Checks if required tables exist and creates them if they don't
 * 
 * @returns {Promise<Object>} Result object with success flag
 */
export async function checkAndFixSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check if wallet_currencies table exists
    const { data: tables, error: tableError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (tableError) {
      console.error('Error checking tables:', tableError);
      throw tableError;
    }
    
    const tableNames = tables.map(t => t.tablename);
    console.log('Existing tables:', tableNames);
    
    const needsWalletCurrencies = !tableNames.includes('wallet_currencies');
    const needsCurrencyTypes = !tableNames.includes('currency_types');
    
    if (needsWalletCurrencies || needsCurrencyTypes) {
      console.log('Missing required tables, creating directly...');
      
      // Create currency_types table if needed
      if (needsCurrencyTypes) {
        try {
          const { error: typesError } = await supabase.rpc('exec_sql', {
            sql: `
              CREATE TABLE IF NOT EXISTS currency_types (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                symbol TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
              
              INSERT INTO currency_types (code, name, symbol) VALUES 
              ('USD', 'US Dollar', '$'),
              ('LYD', 'Libyan Dinar', 'LD')
              ON CONFLICT (code) DO NOTHING;
            `
          });
          
          if (typesError) {
            console.error('Error creating currency_types table:', typesError);
          } else {
            console.log('currency_types table created successfully');
          }
        } catch (err) {
          console.error('Failed to create currency_types table:', err);
        }
      }
      
      // Create wallet_currencies table if needed
      if (needsWalletCurrencies) {
        try {
          const { error: currError } = await supabase.rpc('exec_sql', {
            sql: `
              CREATE TABLE IF NOT EXISTS wallet_currencies (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
                currency_code TEXT REFERENCES currency_types(code) ON DELETE CASCADE,
                balance DECIMAL(18,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(wallet_id, currency_code)
              );
            `
          });
          
          if (currError) {
            console.error('Error creating wallet_currencies table:', currError);
          } else {
            console.log('wallet_currencies table created successfully');
          }
        } catch (err) {
          console.error('Failed to create wallet_currencies table:', err);
        }
      }
      
      return { success: true, message: 'Schema updated' };
    } else {
      console.log('All required tables exist');
      return { success: true, message: 'Schema already up to date' };
    }
  } catch (error) {
    console.error('Schema check/fix failed:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}