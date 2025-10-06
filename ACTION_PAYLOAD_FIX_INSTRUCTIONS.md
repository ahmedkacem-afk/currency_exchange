# Adding the action_payload Column to Notifications Table

There are two ways to add the `action_payload` column to the `notifications` table:

## Option 1: Using the Supabase Dashboard (Recommended)

1. Log in to the Supabase dashboard at https://app.supabase.com
2. Select your project (the one with URL: https://dvarinlmaibtdozdqiju.supabase.co)
3. Go to the SQL Editor tab
4. Create a new query
5. Paste the following SQL:

```sql
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_payload JSONB;
```

6. Click "Run" to execute the SQL
7. Verify that the column was added by going to the Table Editor, selecting the `notifications` table, and checking for the `action_payload` column

## Option 2: Using the Supabase Service Role Key (Advanced)

If you have the Service Role Key for your Supabase project, you can run SQL commands programmatically:

1. Get your service role key from the Supabase dashboard:
   - Go to Project Settings > API
   - Look for "service_role key" (keep this secure, it has admin privileges)
2. Update the `run-migrations-enhanced.js` file to use this key:
   
```javascript
// Add at the top of the file:
process.env.SUPABASE_SERVICE_KEY = 'your-service-role-key';

// Then update the key reference:
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
```

3. Run the migration script:
```bash
node run-action-payload-migration.js
```

## Verifying the Fix

After adding the column:

1. Restart the development server if it's running
2. Try submitting a custody request in the TreasurerPage
3. The error about missing "action_payload" column should be resolved