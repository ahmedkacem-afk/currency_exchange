-- SQL script to verify JSONB support in your PostgreSQL database
-- Run this in your Supabase SQL Editor

-- Check PostgreSQL version
SELECT version();

-- Test if JSONB type is supported
DO $$
BEGIN
    -- Create a temporary test table with JSONB column
    CREATE TEMPORARY TABLE jsonb_test_table (
        id SERIAL PRIMARY KEY,
        data JSONB DEFAULT '{}'::jsonb
    );
    
    -- Insert a test record
    INSERT INTO jsonb_test_table (data) VALUES ('{"test": true, "message": "JSONB works!"}'::jsonb);
    
    -- Test JSONB operations
    PERFORM 
        '{"a": 1, "b": 2}'::jsonb -> 'a' AS json_arrow_op,
        '{"a": 1, "b": 2}'::jsonb ->> 'a' AS json_arrow_arrow_op,
        '{"a": 1, "b": 2}'::jsonb ? 'a' AS json_exists_op;
        
    RAISE NOTICE 'SUCCESS: JSONB is fully supported in your PostgreSQL instance';
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'ERROR: JSONB test failed - %', SQLERRM;
END;
$$;

-- Query the temporary table to see results (only works in the same session)
SELECT * FROM jsonb_test_table;

-- Check if the notifications table already has a JSONB column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'notifications' 
    AND column_name = 'action_payload';