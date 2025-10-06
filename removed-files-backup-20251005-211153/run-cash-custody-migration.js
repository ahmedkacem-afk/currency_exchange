// Script to run only the cash custody migration
import { runMigration } from './run-migrations-enhanced.js';

async function runCashCustodyMigration() {
  console.log('Starting cash custody migration...');
  const result = await runMigration(
    './migrations/003_cash_custody.sql',
    'Cash Custody',
    true
  );
  
  if (result.success) {
    console.log('✅ Cash custody migration successful!');
  } else {
    console.error('❌ Cash custody migration failed:', result.error);
  }
}

// Run the migration
runCashCustodyMigration();