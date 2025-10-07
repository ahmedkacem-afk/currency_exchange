# Database Migrations

This document describes the database migrations in the Currency Exchange application.

## Issue with exec_sql RPC Function

If you're seeing errors like this:
```
POST https://yourproject.supabase.co/rest/v1/rpc/exec_sql 404 (Not Found)
Error executing SQL: ...
{code: 'PGRST202', details: '...', hint: null, message: 'Could not find the function public.exec_sql(sql) in the schema cache.'}
```

It means the `exec_sql` function is not defined in your Supabase database. There are two ways to solve this:

### 1. Create the exec_sql Function in Supabase SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- Create a function to execute SQL statements from RPC
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS JSONB AS $$
BEGIN
  EXECUTE sql;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'errordetail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the authenticated and service_role
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;
```

### 2. Use Simple Migrations Without RPC

If you don't have permission to create the function, use our Simple Migrations approach:

```bash
npm run migrate:simple
```

This method doesn't rely on the `exec_sql` RPC function and instead uses direct table operations through the Supabase API.

## Migration 001: Manager Prices Table Field Names

### Overview
Changed field names in `manager_prices` table from camelCase to lowercase:
- `sellOld` → `sellold`
- `sellNew` → `sellnew`
- `buyOld` → `buyold`
- `buyNew` → `buynew`

### Migration Strategy
The application uses a two-pronged approach to handle this migration:

1. **SQL Migration**: The `001_manager_prices_lowercase.sql` file contains a Postgres function `alter_manager_prices_columns()` that can be called via RPC to rename the columns at the database level.

2. **Client-side Fallback**: If the RPC call fails due to permission issues, the application will:
   - Read data from the old format
   - Delete the existing record
   - Insert a new record with the lowercase field names

### Implementation Details
- The migration function is defined in `src/lib/migrations.js`
- All migrations are automatically run when the app starts
- The migration process is idempotent (can be run multiple times safely)

## Migration Approaches

The application now has multiple ways to run migrations:

1. **Standard Migrations** (`npm run migrate`): Uses `exec_sql` RPC function in Supabase
2. **Simple Migrations** (`npm run migrate:simple`): Uses direct table operations without RPC functions
3. **Enhanced Migrations** (run-migrations-enhanced.js): More advanced options for specific migrations

### Running All Migrations

To run all migrations in the correct order:

```bash
# Standard approach (requires exec_sql function)
npm run migrate

# Simple approach (doesn't require exec_sql function)
npm run migrate:simple
```

### Running a Specific Migration

To run a specific migration file:

```javascript
// Import the migration runner
import { runMigration } from './run-migrations-enhanced.js';

// Run a specific migration
runMigration('./migrations/your-file.sql', 'Migration Name', true);
```

## Setting Up Migrations Table

The migrations system requires a `migrations` table to track which migrations have been executed. If this table doesn't exist, it will be created automatically by the Simple Migrations system.

You can also manually create it with this SQL:

```sql
CREATE TABLE IF NOT EXISTS public.migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.migrations TO authenticated;
GRANT USAGE ON SEQUENCE public.migrations_id_seq TO authenticated;
```

// Run a specific migration
await runMigration(
  './migrations/your-migration-file.sql',  // Path to the SQL file
  'Your Migration Name',                   // Name for logging purposes
  true                                     // Whether to continue on error
);
```

## Adding New Migrations

To add a new migration:

1. Create a SQL file in the `migrations/` folder with a numbered prefix (e.g., `006_new_feature.sql`)
2. If needed, add the file to the `migrationFiles` array in `run-migrations-enhanced.js`
3. Run the migration using `npm run migrate` or directly with `node run-migrations-enhanced.js`

## Testing Migrations

Before deploying, test migrations by:
1. Creating a backup of your database
2. Running the application against a test database
3. Verifying that data is correctly migrated

## Troubleshooting

If migration fails:
1. Check the console for error messages
2. Verify that your Supabase credentials in `.env.development` are correct
3. Verify that the SQL function has proper permissions
4. Check if data already exists in the new format

## Best Practices

1. Always test migrations on a development database before production
2. Include both "up" and "down" logic when possible
3. Use `IF NOT EXISTS` clauses to make migrations idempotent
4. Add comments explaining the purpose of each migration
5. Keep migrations focused on a single logical change
6. Use the enhanced migration runner for all database changes
