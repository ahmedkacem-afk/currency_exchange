-- SQL script to fix foreign key relationship issues in Supabase

-- Step 1: Update the pg_dump tables that define foreign key relationships
-- This instructs Supabase to refresh its schema cache and recognize the relationships

-- First, let's check the current state of foreign keys
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM
    pg_constraint
WHERE
    contype = 'f'
    AND connamespace = 'public'::regnamespace
    AND conrelid::regclass::text IN ('cash_custody', 'notifications');

-- Step 2: Force Supabase to refresh its schema cache
-- Comment out if not needed (requires admin privileges)
-- SELECT graphql.rebuild_schema();

-- Step 3: Define the foreign key relationships manually if they're missing
-- Only run these if the check above doesn't show proper relationships

-- For cash_custody table relationships
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

-- Step 4: Tell Supabase about these relationships for PostgREST

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

-- Step 5: Trigger a schema cache refresh
-- This uses a simple SQL function that forces Supabase to reload schema info
DO $$
BEGIN
    -- Create a dummy table to force schema refresh
    CREATE TABLE IF NOT EXISTS _schema_refresh_trigger (id int);
    DROP TABLE IF EXISTS _schema_refresh_trigger;
    
    RAISE NOTICE 'Schema refresh triggered';
END $$;

-- Step 6: Verify the relationships are now recognized
SELECT * FROM pg_stat_user_tables WHERE relname IN ('cash_custody', 'notifications');