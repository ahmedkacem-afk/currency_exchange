// Simple migration runner that doesn't rely on RPC
import { runSimpleMigrations } from './src/lib/migrations-simple.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env.development' });

// Run the migrations
async function run() {
  console.log('Starting simple migrations runner...');
  try {
    const result = await runSimpleMigrations();
    
    if (result.success) {
      console.log('All migrations completed successfully');
    } else {
      console.error('Migration failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  }
}

// Run the migration script
run();