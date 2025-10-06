// Script to verify JSONB support in your Supabase PostgreSQL instance
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables if using .env file
dotenv.config();

// Get the Supabase URL and key from environment variables or hardcode them here
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJsonbSupport() {
  console.log('Checking PostgreSQL version and JSONB support...');
  
  try {
    // Test 1: Check PostgreSQL version
    const { data: versionData, error: versionError } = await supabase
      .rpc('pg_version_check', {});
    
    if (versionError) {
      // If the function doesn't exist, try a direct query
      const { data: directVersionData, error: directVersionError } = await supabase
        .from('_version_check')
        .select('*')
        .limit(1);
        
      if (directVersionError) {
        console.log('Creating a version check function...');
        
        // Create a temporary function to check version
        const { error: createFuncError } = await supabase.rpc('create_version_check_func', {});
        
        if (createFuncError) {
          // Final attempt with raw SQL query
          const { data: rawVersionData, error: rawVersionError } = await supabase
            .rpc('execute_sql', { 
              sql: 'SELECT version();' 
            });
            
          if (rawVersionError) {
            console.error('Could not check PostgreSQL version:', rawVersionError);
          } else {
            console.log('PostgreSQL Version:', rawVersionData);
          }
        } else {
          // Use the newly created function
          const { data: newVersionData } = await supabase.rpc('pg_version_check', {});
          console.log('PostgreSQL Version:', newVersionData);
        }
      } else {
        console.log('PostgreSQL Version:', directVersionData);
      }
    } else {
      console.log('PostgreSQL Version:', versionData);
    }
    
    // Test 2: Direct JSONB test
    console.log('Testing JSONB functionality...');
    
    // Create a temporary table with JSONB column
    const { error: tableError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TEMPORARY TABLE IF NOT EXISTS jsonb_test (
          id SERIAL PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb
        );
        
        INSERT INTO jsonb_test (data) 
        VALUES ('{"test": true, "message": "JSONB works!"}'::jsonb);
        
        SELECT * FROM jsonb_test;
      `
    });
    
    if (tableError) {
      console.error('JSONB test failed:', tableError);
    } else {
      console.log('JSONB is supported in your PostgreSQL instance!');
    }
    
    // Test 3: JSONB operations test
    const { data: opData, error: opError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          '{"a": 1, "b": 2}'::jsonb -> 'a' AS json_arrow_op,
          '{"a": 1, "b": 2}'::jsonb ->> 'a' AS json_arrow_arrow_op,
          '{"a": 1, "b": 2}'::jsonb ? 'a' AS json_exists_op;
      `
    });
    
    if (opError) {
      console.error('JSONB operations test failed:', opError);
    } else {
      console.log('JSONB operations test results:', opData);
      console.log('JSONB operations are fully supported!');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the check
checkJsonbSupport().then(() => {
  console.log('Verification complete!');
});