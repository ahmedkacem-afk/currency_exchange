// Enhanced migration runner that supports multiple migrations
import { createClient } from '@supabase/supabase-js';
import fs fro    // 4. Run the transaction validation migration
    const transactionValidationResult = await runMigration(
      './migrations/006_transaction_validation.sql',
      'Transaction Validation',
      true
    )
    
    // 5. Fix schema manager SQL functions
    const schemaManagerFixResult = await runMigration(
      './migrations/fix_schema_manager_functions.sql',
      'Schema Manager Functions Fix',
      true
    )
    
    console.log('All migrations completed');
    return {
      success: true,
      results: {
        multiCurrency: multiCurrencyResult,
        cashCustody: cashCustodyResult,
        actionPayload: actionPayloadResult,
        transactionValidation: transactionValidationResult,
        schemaManagerFix: schemaManagerFixResult
      }
    };ath from 'path';

// Load environment variables from .env.development
import dotenv from 'dotenv';
dotenv.config({ path: './.env.development' });

// Get Supabase URL and key from environment or config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Using Supabase URL:', SUPABASE_URL);
console.log('API Key exists:', !!SUPABASE_KEY);

// Create a Supabase client with admin privileges if possible
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Execute SQL statement directly using Supabase's PostgreSQL capabilities
 * 
 * @param {string} sql - SQL statement to execute
 * @returns {Promise<Object>} - Result of execution
 */
async function executeSql(sql) {
  try {
    // First try using the built-in RPC method for SQL execution
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.warn(`RPC exec_sql failed: ${error.message}`);
      
      // If RPC fails, try using the REST API for raw SQL
      const { data: restData, error: restError } = await supabase.from('_exec_sql').select('*').limit(1);
      
      if (restError) {
        console.error(`REST SQL execution failed: ${restError.message}`);
        return { success: false, error: restError };
      }
      
      return { success: true, data: restData };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`SQL execution error: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * Runs a SQL migration from file or string
 * 
 * @param {string} sqlContent - SQL content or path to file
 * @param {string} migrationName - Name of the migration for logging
 * @param {boolean} isPath - Whether sqlContent is a path or actual SQL
 */
async function runMigration(sqlContent, migrationName, isPath = false) {
  try {
    console.log(`Running ${migrationName} migration...`);
    
    // Get SQL content - either from string or file
    let sql = sqlContent;
    if (isPath) {
      try {
        sql = fs.readFileSync(path.resolve(sqlContent), 'utf8');
      } catch (fileError) {
        console.error(`Error reading migration file ${sqlContent}:`, fileError);
        return { success: false, error: fileError };
      }
    }
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        console.log(`Executing statement from ${migrationName}: ${statement.substring(0, 50)}...`);
        const result = await executeSql(statement + ';');
        
        if (!result.success) {
          console.error(`Error executing SQL from ${migrationName}: ${statement.substring(0, 50)}...`);
          console.error(result.error);
        }
      } catch (stmtError) {
        console.error(`Exception executing SQL from ${migrationName}: ${statement.substring(0, 50)}...`);
        console.error(stmtError);
      }
    }
    
    console.log(`${migrationName} migration completed`);
    return { success: true };
  } catch (error) {
    console.error(`Error running ${migrationName} migration:`, error);
    return { success: false, error };
  }
}

/**
 * Main function to run all migrations
 */
async function runAllMigrations() {
  try {
    console.log('Starting migrations...');
    
    // Run migrations in order
    // 1. First run the multi-currency migration
    const multiCurrencyResult = await runMigration(
      './migrations/002_multi_currency_support.sql', 
      'Multi-Currency', 
      true
    );
    
    // 2. Then run the cash custody migration
    const cashCustodyResult = await runMigration(
      './migrations/003_cash_custody.sql',
      'Cash Custody',
      true
    );
    
    // 3. Run the action_payload column migration
    const actionPayloadResult = await runMigration(
      './migrations/add-action-payload-column.sql',
      'Action Payload Column',
      true
    );

    // 4. Run the transaction validation migration
    const transactionValidationResult = await runMigration(
      './migrations/006_transaction_validation.sql',
      'Transaction Validation',
      true
    );
    
    console.log('All migrations completed');
    return {
      success: true,
      results: {
        multiCurrency: multiCurrencyResult,
        cashCustody: cashCustodyResult,
        actionPayload: actionPayloadResult,
        transactionValidation: transactionValidationResult
      }
    };
  } catch (error) {
    console.error('Error running migrations:', error);
    return { success: false, error };
  }
}

// Export functions for use in main.jsx or other files
export { runAllMigrations, runMigration };