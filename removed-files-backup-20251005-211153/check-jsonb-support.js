#!/usr/bin/env node

console.log("\nTo verify JSONB support in your Supabase PostgreSQL database:\n");
console.log("1. Go to your Supabase dashboard at https://app.supabase.io");
console.log("2. Select your project");
console.log("3. Go to \"SQL Editor\" in the left menu");
console.log("4. Paste and run the following SQL query:");
console.log("\n-- Check PostgreSQL version and JSONB support");
console.log("SELECT version();");
console.log("\n-- Test JSONB functionality");
console.log("CREATE TEMPORARY TABLE jsonb_test (");
console.log("  id SERIAL PRIMARY KEY,");
console.log("  data JSONB DEFAULT '{}'::jsonb");
console.log(");");
console.log("\nINSERT INTO jsonb_test (data) VALUES ('{\"test\": true, \"message\": \"JSONB works!\"}'::jsonb);");
console.log("\nSELECT * FROM jsonb_test;");
console.log("\n-- Check if notifications table has action_payload column");
console.log("SELECT column_name, data_type, is_nullable");
console.log("FROM information_schema.columns");
console.log("WHERE table_name = 'notifications' AND column_name = 'action_payload';");
console.log("\n--- If the above query runs successfully, JSONB is supported in your PostgreSQL database ---\n");