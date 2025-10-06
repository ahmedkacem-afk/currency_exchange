-- SQL functions for schema management
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
