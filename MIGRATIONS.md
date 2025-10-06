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

## The Enhanced Migration Runner

The application now uses `run-migrations-enhanced.js` as the central migration tool. This script provides a robust way to run SQL migrations against your Supabase database.

### Running All Migrations

To run all migrations in the correct order:

```bash
npm run migrate
```

This will execute all SQL files in the `migrations` directory in alphabetical order.

### Running a Specific Migration

To run a specific migration file:

```javascript
// Import the migration runner
import { runMigration } from './run-migrations-enhanced.js';

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
