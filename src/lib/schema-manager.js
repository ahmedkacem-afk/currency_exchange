
/**
 * First, run the following SQL in Supabase SQL Editor to create needed functions:
 *
 * -- Function to check if a table exists
 * CREATE OR REPLACE FUNCTION public.check_table_exists(p_table_name text)
 * RETURNS json
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * DECLARE
 *   result json;
 * BEGIN
 *   SELECT json_build_object('table_name', t.table_name)::json INTO result
 *   FROM information_schema.tables t
 *   WHERE t.table_schema = 'public' AND t.table_name = p_table_name;
 *   
 *   RETURN COALESCE(result, '{"table_name": null}'::json);
 * END;
 * $$;
 * 
 * -- Function to get table columns
 * CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
 * RETURNS json
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * DECLARE
 *   result json;
 * BEGIN
 *   SELECT json_agg(
 *     json_build_object(
 *       'column_name', c.column_name,
 *       'data_type', c.data_type
 *     )
 *   )::json INTO result
 *   FROM information_schema.columns c
 *   WHERE c.table_schema = 'public' AND c.table_name = p_table_name;
 *   
 *   RETURN COALESCE(result, '[]'::json);
 * END;
 * $$;
 *
 * -- Make functions accessible via RPC
 * GRANT EXECUTE ON FUNCTION public.check_table_exists TO anon, authenticated;
 * GRANT EXECUTE ON FUNCTION public.get_table_columns TO anon, authenticated;
 */
/**
 * Schema Manager
 * 
 * This module is responsible for checking and creating all required tables
 * for the application to function correctly.
 */

import { supabase } from './supabase'

// Required tables and their structure
const requiredTables = {
  manager_prices: {
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'sellold', type: 'text' }, 
      { name: 'sellnew', type: 'text' },
      { name: 'buyold', type: 'text' },
      { name: 'buynew', type: 'text' },
      { name: 'sellDisabled', type: 'boolean' },
      { name: 'buyDisabled', type: 'boolean' }
    ]
  },
  wallets: {
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'name', type: 'text' },
      { name: 'usd', type: 'numeric' },
      { name: 'lyd', type: 'numeric' },
      { name: 'currencies', type: 'jsonb' } // For backward compatibility
    ]
  },
  currency_types: {
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'code', type: 'text' },
      { name: 'name', type: 'text' },
      { name: 'symbol', type: 'text', nullable: true }
    ]
  },
  wallet_currencies: {
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'wallet_id', type: 'uuid' },
      { name: 'currency_code', type: 'text' },
      { name: 'balance', type: 'numeric' }
    ]
  },
  transactions: {
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'wallet_id', type: 'uuid' },
      { name: 'currency_code', type: 'text' },
      { name: 'amount', type: 'numeric' },
      { name: 'type', type: 'text' },
      { name: 'reason', type: 'text' },
      { name: 'metadata', type: 'jsonb' }
    ]
  }
}

/**
 * Checks if a table exists
 * 
 * @param {string} tableName - Name of the table to check
 * @returns {Promise<boolean>} - True if table exists, false otherwise
 */
async function tableExists(tableName) {
  try {
    // Query the information_schema to check if table exists
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .single()
    
    if (error) {
      // If we can't query information_schema, try a direct approach
      const { error: testError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      return !testError
    }
    
    return !!data
  } catch (err) {
    console.error(`Error checking if table ${tableName} exists:`, err)
    return false
  }
}

/**
 * Creates a table if it doesn't exist
 * 
 * @param {string} tableName - Name of the table to create
 * @param {Array} columns - Columns to create in the table
 * @returns {Promise<boolean>} - True if table was created or already existed, false on error
 */
async function createTableIfNotExists(tableName, columns) {
  try {
    const exists = await tableExists(tableName)
    
    if (exists) {
      console.log(`Table ${tableName} already exists`)
      return true
    }
    
    // For PostgreSQL through Supabase, we need to use SQL
    let sqlQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (`
    
    // Add columns
    const columnDefs = columns.map(col => {
      if (col.name === 'id' && col.type === 'uuid') {
        return `${col.name} UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
      } else if (col.name === 'created_at' && col.type === 'timestamp') {
        return `${col.name} TIMESTAMP WITH TIME ZONE DEFAULT now()`
      } else {
        let colDef = `${col.name} ${col.type.toUpperCase()}`;
        if (col.nullable) {
          // If the column is nullable, add NULL constraint
          colDef += ` NULL`;
        } else {
          // Otherwise, make it NOT NULL
          colDef += ` NOT NULL`;
        }
        return colDef;
      }
    })
    
    sqlQuery += columnDefs.join(', ')
    sqlQuery += ')'
    
    // Execute SQL query via Supabase
    const { error } = await supabase.rpc('exec', { query: sqlQuery })
    
    if (error) {
      console.error(`Error creating table ${tableName}:`, error)
      return false
    }
    
    console.log(`Table ${tableName} created successfully`)
    return true
  } catch (err) {
    console.error(`Error creating table ${tableName}:`, err)
    return false
  }
}

/**
 * Creates default currency types if they don't exist
 * 
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function createDefaultCurrencyTypes() {
  try {
    // Check if any currency types exist
    const { data, error } = await supabase
      .from('currency_types')
      .select('code')
      .limit(1)
    
    if (error && !error.message.includes('does not exist')) {
      console.error('Error checking currency types:', error)
      return false
    }
    
    // If there are already currency types, we don't need to create defaults
    if (data && data.length > 0) {
      return true
    }
    
    // Default currency types
    const defaultCurrencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'LYD', name: 'Libyan Dinar', symbol: 'د.ل' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' }
    ]
    
    // Insert default currencies
    const { error: insertError } = await supabase
      .from('currency_types')
      .insert(defaultCurrencies)
    
    if (insertError) {
      console.error('Error creating default currency types:', insertError)
      return false
    }
    
    console.log('Default currency types created successfully')
    return true
  } catch (err) {
    console.error('Error creating default currency types:', err)
    return false
  }
}

/**
 * Create a stored procedure for executing dynamic SQL
 * This is needed because Supabase doesn't allow direct SQL execution from JavaScript
 * 
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function createExecFunction() {
  try {
    // SQL to create the exec function if it doesn't exist
    const sql = `
      CREATE OR REPLACE FUNCTION exec(query text) RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    // We need to use the REST API directly since there's no Supabase method for this
    const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabase.supabaseKey,
        'Authorization': `Bearer ${supabase.supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    })
    
    if (!response.ok) {
      // If it fails with a 404, the function might not exist yet
      // Let's try creating the exec function using Postgres' default roles
      const createFunctionResponse = await fetch(`${supabase.supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({
          query: sql
        })
      })
      
      if (!createFunctionResponse.ok) {
        console.error('Failed to create exec function:', await createFunctionResponse.text())
        return false
      }
    }
    
    console.log('Exec function created or already exists')
    return true
  } catch (err) {
    console.error('Error creating exec function:', err)
    return false
  }
}

/**
 * Ensure UUID extension is available
 * 
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function ensureUuidExtension() {
  try {
    const { error } = await supabase.rpc('exec', { 
      query: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"' 
    })
    
    if (error) {
      console.error('Error ensuring UUID extension:', error)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Error ensuring UUID extension:', err)
    return false
  }
}

/**
 * Initialize the database with all required tables and data
 * 
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function initializeDatabase() {
  try {
    console.log('Initializing database...')
    
    // Create the exec function
    const execFunctionCreated = await createExecFunction()
    if (!execFunctionCreated) {
      console.error('Failed to create exec function')
      return false
    }
    
    // Ensure UUID extension is available
    const uuidExtensionEnabled = await ensureUuidExtension()
    if (!uuidExtensionEnabled) {
      console.error('Failed to enable UUID extension')
      return false
    }
    
    // Create all required tables
    for (const [tableName, schema] of Object.entries(requiredTables)) {
      const tableCreated = await createTableIfNotExists(tableName, schema.columns)
      if (!tableCreated) {
        console.error(`Failed to create table ${tableName}`)
        return false
      }
    }
    
    // Create default data
    const defaultCurrenciesCreated = await createDefaultCurrencyTypes()
    if (!defaultCurrenciesCreated) {
      console.error('Failed to create default currency types')
      return false
    }
    
    console.log('Database initialization complete')
    return true
  } catch (err) {
    console.error('Error initializing database:', err)
    return false
  }
}

/**
 * This function ensures all tables have the correct schema
 * It's useful for migrations when we add or modify columns
 * 
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function validateAndUpdateSchema() {
  try {
    for (const [tableName, schema] of Object.entries(requiredTables)) {
      // First check if table exists
      const exists = await tableExists(tableName)
      
      if (!exists) {
        console.log(`Table ${tableName} doesn't exist, creating it...`)
        const created = await createTableIfNotExists(tableName, schema.columns)
        if (!created) {
          console.error(`Failed to create missing table ${tableName}`)
          return false
        }
        continue
      }
      
      // Get current columns
      // Use RPC function instead of direct information_schema access
      const { data: columns, error } = await supabase
        .rpc('get_table_columns', { table_name: tableName })
      
      if (error) {
        console.error(`Error getting columns for table ${tableName}:`, error)
        continue
      }
      
      // Check if all required columns exist, add them if they don't
      for (const col of schema.columns) {
        const exists = columns.some(c => c.column_name === col.name)
        
        if (!exists) {
          console.log(`Adding missing column ${col.name} to table ${tableName}`)
          
          let dataType = col.type.toUpperCase()
          if (dataType === 'UUID') dataType = 'UUID'
          if (dataType === 'TIMESTAMP') dataType = 'TIMESTAMP WITH TIME ZONE'
          
          const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col.name} ${dataType}`
          const { error: alterError } = await supabase.rpc('exec', { query: sql })
          
          if (alterError) {
            console.error(`Error adding column ${col.name} to table ${tableName}:`, alterError)
          }
        }
      }
    }
    
    console.log('Schema validation and update complete')
    return true
  } catch (err) {
    console.error('Error validating and updating schema:', err)
    return false
  }
}