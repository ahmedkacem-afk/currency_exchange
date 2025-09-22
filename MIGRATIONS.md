# Database Migrations

This document describes the database migrations in the Currency Exchange application.

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

## Adding New Migrations

To add a new migration:

1. Create a SQL file in the `migrations/` folder with a numbered prefix (e.g., `002_new_migration.sql`)
2. Add a migration function in `src/lib/migrations.js`
3. Add the new migration function to the `runMigrations()` function

## Testing Migrations

Before deploying, test migrations by:
1. Creating a backup of your database
2. Running the application against a test database
3. Verifying that data is correctly migrated

## Troubleshooting

If migration fails:
1. Check the browser console for error messages
2. Verify that the SQL function has proper permissions
3. Check if data already exists in the new format
