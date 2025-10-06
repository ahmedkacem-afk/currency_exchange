-- Simple migration to fix timestamp formats in the transactions table

-- Make sure createdAt is of type bigint
DO $$
DECLARE
    column_type TEXT;
BEGIN
    SELECT data_type INTO column_type 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'createdat';
    
    -- If it's not a bigint, convert it
    IF column_type != 'bigint' THEN
        EXECUTE 'ALTER TABLE transactions ALTER COLUMN createdat TYPE bigint USING 
            CASE 
                WHEN createdat IS NULL THEN extract(epoch from now()) * 1000
                WHEN pg_typeof(createdat) = ''text''::regtype AND createdat ~ E''^\\d+$'' THEN createdat::bigint
                WHEN pg_typeof(createdat) = ''text''::regtype THEN extract(epoch from createdat::timestamp) * 1000
                WHEN pg_typeof(createdat) = ''timestamp''::regtype OR pg_typeof(createdat) = ''timestamptz''::regtype THEN extract(epoch from createdat) * 1000
                ELSE extract(epoch from now()) * 1000
            END';
    END IF;
END $$;

-- Set default value for any null createdat values
UPDATE transactions
SET createdat = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE createdat IS NULL;

-- Ensure the column is not nullable and has a default value for future inserts
ALTER TABLE transactions
ALTER COLUMN createdat SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN createdat SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

COMMENT ON COLUMN transactions.createdat IS 'Unix timestamp in milliseconds when the transaction was created';