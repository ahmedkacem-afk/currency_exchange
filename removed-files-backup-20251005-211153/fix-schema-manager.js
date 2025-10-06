/**
 * This script fixes the schema-manager.js file to work properly with Supabase's restrictions
 * on information_schema access via the REST API by using Supabase functions instead.
 */

import fs from 'fs';
import path from 'path';

const schemaManagerPath = path.join(process.cwd(), 'src/lib/schema-manager.js');
const backupPath = path.join(process.cwd(), 'src/lib/schema-manager.js.backup');

// Create backup first
try {
  fs.copyFileSync(schemaManagerPath, backupPath);
  console.log('Backup created at:', backupPath);
} catch (err) {
  console.error('Error creating backup:', err);
  process.exit(1);
}

// Read the file
let content;
try {
  content = fs.readFileSync(schemaManagerPath, 'utf8');
} catch (err) {
  console.error('Error reading file:', err);
  process.exit(1);
}

// Replace the problematic part where it tries to access information_schema directly via REST API
// We'll create an RPC function to do this instead

// 1. Replace the table existence check
const tableCheckPattern = /const { data: tableExists, error: tableError } = await supabase\s*\.from\('information_schema\.tables'\)\s*\.select\('table_name'\)\s*\.eq\('table_name', tableName\)\s*\.eq\('table_schema', 'public'\)\s*\.single\(\)/;

const updatedTableCheck = `// Use RPC function instead of direct information_schema access
      const { data: tableExists, error: tableError } = await supabase
        .rpc('check_table_exists', { table_name: tableName })`;

// 2. Replace the column fetching code
const columnFetchPattern = /const { data: columns, error } = await supabase\s*\.from\('information_schema\.columns'\)\s*\.select\('column_name, data_type'\)\s*\.eq\('table_name', tableName\)\s*\.eq\('table_schema', 'public'\)/;

const updatedColumnFetch = `// Use RPC function instead of direct information_schema access
      const { data: columns, error } = await supabase
        .rpc('get_table_columns', { table_name: tableName })`;

// Apply the replacements
let updatedContent = content.replace(tableCheckPattern, updatedTableCheck);
updatedContent = updatedContent.replace(columnFetchPattern, updatedColumnFetch);

// 3. Add RPC functions at the start of the file
const rpcFunctionsCode = `
/**
 * First, run the following SQL in Supabase SQL Editor to create needed functions:
 *
 * -- Function to check if a table exists
 * CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
 * RETURNS json
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * DECLARE
 *   result json;
 * BEGIN
 *   SELECT json_build_object('table_name', table_name)::json INTO result
 *   FROM information_schema.tables
 *   WHERE table_schema = 'public' AND table_name = table_name;
 *   
 *   RETURN COALESCE(result, '{"table_name": null}'::json);
 * END;
 * $$;
 * 
 * -- Function to get table columns
 * CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
 * RETURNS json
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * DECLARE
 *   result json;
 * BEGIN
 *   SELECT json_agg(
 *     json_build_object(
 *       'column_name', column_name,
 *       'data_type', data_type
 *     )
 *   )::json INTO result
 *   FROM information_schema.columns
 *   WHERE table_schema = 'public' AND table_name = table_name;
 *   
 *   RETURN COALESCE(result, '[]'::json);
 * END;
 * $$;
 *
 * -- Make functions accessible via RPC
 * GRANT EXECUTE ON FUNCTION public.check_table_exists TO anon, authenticated;
 * GRANT EXECUTE ON FUNCTION public.get_table_columns TO anon, authenticated;
 */
`;

// Add the SQL comment to the beginning of the file
updatedContent = rpcFunctionsCode + updatedContent;

// Write the updated file
try {
  fs.writeFileSync(schemaManagerPath, updatedContent);
  console.log('Successfully updated schema-manager.js');
} catch (err) {
  console.error('Error writing file:', err);
  console.log('Restoring from backup...');
  
  try {
    fs.copyFileSync(backupPath, schemaManagerPath);
    console.log('Restored from backup successfully');
  } catch (restoreErr) {
    console.error('Error restoring from backup:', restoreErr);
  }
}

// Create a SQL file with the needed functions
const sqlContent = `-- SQL functions for schema management
-- Run this in Supabase SQL Editor to fix schema cache issues

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('table_name', table_name)::json INTO result
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = $1;
  
  RETURN COALESCE(result, '{"table_name": null}'::json);
END;
$$;

-- Function to get table columns
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'column_name', column_name,
      'data_type', data_type
    )
  )::json INTO result
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = $1;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Make functions accessible via RPC
GRANT EXECUTE ON FUNCTION public.check_table_exists TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns TO anon, authenticated;

-- Fix the cash_custody relationships
-- Same code as in fix-foreign-key-relationships.sql but with just the essential parts
ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_treasurer_id_fkey;
ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_cashier_id_fkey;
ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_wallet_id_fkey;
ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_reference_custody_id_fkey;

-- Re-add the constraints with explicit names
ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_treasurer_id_fkey 
    FOREIGN KEY (treasurer_id) REFERENCES auth.users(id);
    
ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_cashier_id_fkey 
    FOREIGN KEY (cashier_id) REFERENCES auth.users(id);
    
ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_wallet_id_fkey 
    FOREIGN KEY (wallet_id) REFERENCES wallets(id);
    
ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_reference_custody_id_fkey 
    FOREIGN KEY (reference_custody_id) REFERENCES cash_custody(id);

-- Define the treasurer relationship
COMMENT ON CONSTRAINT cash_custody_treasurer_id_fkey ON cash_custody IS
'@foreignFieldName treasurerCustodies
@fieldName treasurer';

-- Define the cashier relationship
COMMENT ON CONSTRAINT cash_custody_cashier_id_fkey ON cash_custody IS
'@foreignFieldName cashierCustodies
@fieldName cashier';

-- Define the wallet relationship
COMMENT ON CONSTRAINT cash_custody_wallet_id_fkey ON cash_custody IS
'@foreignFieldName walletCustodies
@fieldName wallet';

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`;

const sqlPath = path.join(process.cwd(), 'schema-fix-functions.sql');

try {
  fs.writeFileSync(sqlPath, sqlContent);
  console.log('Created SQL functions file at:', sqlPath);
} catch (err) {
  console.error('Error creating SQL file:', err);
}

console.log('\nDone! To complete the fix:');
console.log('1. Run the schema-fix-functions.sql file in your Supabase SQL Editor');
console.log('2. Restart your application');