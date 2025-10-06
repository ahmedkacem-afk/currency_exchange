-- SQL fix for cash_custody foreign key relationships for users table
-- Run this in your Supabase SQL Editor to fix the relationship issue

-- 1. First check what relationships actually exist
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM
    pg_constraint
WHERE
    contype = 'f'
    AND connamespace = 'public'::regnamespace
    AND conrelid::regclass::text = 'cash_custody';

-- 2. Check how the auth.users table is structured
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'users';

-- 3. Check if profiles table exists (often used to store user profile data)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'profiles';

-- 4. Fix the relationships:

-- Step 1: If we need to use profiles instead of auth.users:
DO $$
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Drop existing foreign keys to auth.users if they exist
    ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_treasurer_id_fkey;
    ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_cashier_id_fkey;
    
    -- Create new foreign keys to profiles if needed
    BEGIN
      ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_treasurer_id_fkey 
        FOREIGN KEY (treasurer_id) REFERENCES profiles(id);
      RAISE NOTICE 'Added foreign key from cash_custody.treasurer_id to profiles.id';
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Error adding treasurer_id foreign key: %', SQLERRM;
    END;
    
    BEGIN
      ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_cashier_id_fkey 
        FOREIGN KEY (cashier_id) REFERENCES profiles(id);
      RAISE NOTICE 'Added foreign key from cash_custody.cashier_id to profiles.id';
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Error adding cashier_id foreign key: %', SQLERRM;
    END;
    
    -- Add special comments for PostgREST
    COMMENT ON CONSTRAINT cash_custody_treasurer_id_fkey ON cash_custody IS
    '@foreignFieldName treasurerCustodies
    @fieldName treasurer';
    
    COMMENT ON CONSTRAINT cash_custody_cashier_id_fkey ON cash_custody IS
    '@foreignFieldName cashierCustodies
    @fieldName cashier';
  ELSE
    RAISE NOTICE 'No profiles table found, keeping auth.users references';
  END IF;
END $$;

-- Step 2: Fix the wallet relationship (should be more straightforward)
ALTER TABLE cash_custody DROP CONSTRAINT IF EXISTS cash_custody_wallet_id_fkey;
ALTER TABLE cash_custody ADD CONSTRAINT cash_custody_wallet_id_fkey 
    FOREIGN KEY (wallet_id) REFERENCES wallets(id);

COMMENT ON CONSTRAINT cash_custody_wallet_id_fkey ON cash_custody IS
'@foreignFieldName custodies
@fieldName wallet';

-- 5. Explicitly create RLS policies for the relationships
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS enable_cash_custody_joins ON cash_custody;
  
  -- Create a policy that allows joins
  CREATE POLICY enable_cash_custody_joins ON cash_custody
    FOR SELECT USING (true);
    
  RAISE NOTICE 'Created RLS policy for joins';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating RLS policy: %', SQLERRM;
END;

-- 6. Force a schema refresh
DO $$
BEGIN
  -- Create and drop a dummy table to force schema refresh
  CREATE TABLE IF NOT EXISTS _schema_refresh_trigger (id int);
  DROP TABLE IF EXISTS _schema_refresh_trigger;
  
  -- Also notify PostgREST to reload schema
  NOTIFY pgrst, 'reload schema';
  
  RAISE NOTICE 'Schema cache refresh triggered';
END $$;