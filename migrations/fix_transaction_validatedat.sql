-- Fix validation field names in transactions table
-- This migration ensures column names are consistent

-- First check if column doesn't exist, then add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'validated_at'
    ) THEN
        -- Add the validated_at column if it doesn't exist
        ALTER TABLE transactions ADD COLUMN validated_at BIGINT;
        
        -- If validatedat exists, copy data to validated_at and drop validatedat
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'transactions'
            AND column_name = 'validatedat'
        ) THEN
            -- Copy data
            UPDATE transactions 
            SET validated_at = 
                CASE 
                    WHEN pg_typeof(validatedat) = 'timestamp'::regtype OR pg_typeof(validatedat) = 'timestamptz'::regtype 
                    THEN (EXTRACT(EPOCH FROM validatedat) * 1000)::bigint
                    ELSE validatedat::bigint
                END
            WHERE validatedat IS NOT NULL;
            
            -- Drop old column
            ALTER TABLE transactions DROP COLUMN validatedat;
        END IF;
    END IF;
END $$;

-- Add comment explaining the purpose of the column
COMMENT ON COLUMN transactions.validated_at IS 'Unix timestamp in milliseconds when the transaction was validated';