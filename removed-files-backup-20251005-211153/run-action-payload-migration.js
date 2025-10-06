// Script to run the action_payload column migration
import { runMigration } from './run-migrations-enhanced.js';
import dotenv from 'dotenv';

// Load environment variables from .env.development
dotenv.config({ path: './.env.development' });

async function main() {
  console.log('Running action_payload column migration...');
  
  // Run the migration
  const result = await runMigration(
    './migrations/add-action-payload-column.sql',
    'Action Payload Column',
    true
  );
  
  if (result.success) {
    console.log('✅ Migration completed successfully');
  } else {
    console.error('❌ Migration failed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});