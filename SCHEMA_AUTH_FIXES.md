# Schema Manager and Auth Fixes

This document explains two important fixes implemented to address errors in the application:

## 1. Schema Manager SQL Functions Fix

### Issue
When using the schema manager, an error occurred:
```
Error getting columns for table wallet_currencies: 
{code: '42702', details: 'It could refer to either a PL/pgSQL variable or a table column.', hint: null, message: 'column reference "table_name" is ambiguous'}
```

### Root Cause
The SQL functions used by the schema manager had an ambiguity in the SQL queries. When referring to `table_name`, the database couldn't determine if it was referring to the parameter passed to the function or the column name in the information_schema tables.

### Fix
We've updated the SQL functions to:
1. Use a parameter prefix (`p_table_name`) to distinguish parameters from column names
2. Use table aliases (`t` and `c`) to qualify column references
3. Created a new SQL migration file to update these functions

## 2. Authentication "Unauthorized" Errors

### Issue
Occasionally, users would get "unauthorized" errors when refreshing the page or after periods of inactivity.

### Root Cause
The Supabase authentication tokens have an expiration time, and if a user stays on the page for too long without activity, their token can expire, leading to unauthorized errors.

### Fix
We've implemented an automatic session refresh mechanism that:
1. Checks the user's session status periodically (every 10 minutes)
2. If the session is close to expiring (within 5 minutes), it automatically refreshes the token
3. Logs session status for debugging purposes

## Implementation Details

### New Files Added:
- `migrations/fix_schema_manager_functions.sql`: Contains the updated SQL functions
- `src/lib/sessionRefresh.js`: Contains the session refresh logic

### Modified Files:
- `src/lib/schema-manager.js`: Updated SQL comments to reflect the new function definitions
- `run-migrations-enhanced.js`: Added the new SQL migration to the migration sequence
- `src/App.jsx`: Added session refresh mechanism to the app initialization

## How to Apply the Fixes

These fixes have been automatically included in the application. The next time the migrations are run, the schema manager functions will be updated, and the session refresh mechanism is active as soon as the app loads.

If you encounter any issues, please run the migrations again using:
```
node run-migrations-enhanced.js
```