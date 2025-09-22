-- Migration script for manager_prices table
-- This will create a database function that can be called to alter the columns

CREATE OR REPLACE FUNCTION alter_manager_prices_columns()
RETURNS void AS $$
BEGIN
  -- Check if the old columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manager_prices' AND column_name = 'sellOld'
  ) THEN
    -- If old columns exist, create new columns
    ALTER TABLE manager_prices ADD COLUMN IF NOT EXISTS sellold DECIMAL;
    ALTER TABLE manager_prices ADD COLUMN IF NOT EXISTS sellnew DECIMAL;
    ALTER TABLE manager_prices ADD COLUMN IF NOT EXISTS buyold DECIMAL;
    ALTER TABLE manager_prices ADD COLUMN IF NOT EXISTS buynew DECIMAL;

    -- Copy data from old columns to new columns
    UPDATE manager_prices SET 
      sellold = "sellOld",
      sellnew = "sellNew", 
      buyold = "buyOld", 
      buynew = "buyNew";

    -- Drop old columns
    ALTER TABLE manager_prices DROP COLUMN IF EXISTS "sellOld";
    ALTER TABLE manager_prices DROP COLUMN IF EXISTS "sellNew";
    ALTER TABLE manager_prices DROP COLUMN IF EXISTS "buyOld";
    ALTER TABLE manager_prices DROP COLUMN IF EXISTS "buyNew";
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: This function needs to be executed with database admin privileges
-- The app can call it through supabase.rpc('alter_manager_prices_columns')
-- If permissions are insufficient, the app will fall back to recreating the records
