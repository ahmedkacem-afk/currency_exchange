// Script to modify the cash_custody.js file to use direct queries instead of relationships
import fs from 'fs';
import path from 'path';

const cashCustodyPath = path.join(process.cwd(), 'src/lib/supabase/tables/cash_custody.js');
const backupPath = path.join(process.cwd(), 'src/lib/supabase/tables/cash_custody.js.backup');

// Create backup first
try {
  fs.copyFileSync(cashCustodyPath, backupPath);
  console.log('Backup created at:', backupPath);
} catch (err) {
  console.error('Error creating backup:', err);
  process.exit(1);
}

// Read the file
let content;
try {
  content = fs.readFileSync(cashCustodyPath, 'utf8');
} catch (err) {
  console.error('Error reading file:', err);
  process.exit(1);
}

// Replace the problematic queries
let updatedContent = content;

// Fix 1: Update the treasurer records query (first select)
const treasurerQueryPattern = /\.select\(['"].*?cashier:cashier_id.*?['"]\)[\s\n]*\.eq\(['"]treasurer_id['"], user\.id\)/s;
const updatedTreasurerQuery = `.select('*')
        .eq('treasurer_id', user.id)`;

// Fix 2: Update the cashier records query (second select)
const cashierQueryPattern = /\.select\(['"].*?cashier:cashier_id.*?['"]\)[\s\n]*\.eq\(['"]cashier_id['"], user\.id\)/s;
const updatedCashierQuery = `.select('*')
        .eq('cashier_id', user.id)`;

// Apply the replacements
updatedContent = updatedContent.replace(treasurerQueryPattern, updatedTreasurerQuery);
updatedContent = updatedContent.replace(cashierQueryPattern, updatedCashierQuery);

// Add function to fetch related data
const fetchRelatedDataFunction = `
/**
 * Helper function to fetch related data for cash custody records
 * @param {Array} records - Array of cash custody records
 * @returns {Promise<Array>} - Records with related data
 */
async function fetchRelatedData(records) {
  if (!records || records.length === 0) return [];
  
  // Get unique IDs for each relationship
  const treasurerIds = [...new Set(records.map(r => r.treasurer_id).filter(Boolean))];
  const cashierIds = [...new Set(records.map(r => r.cashier_id).filter(Boolean))];
  const walletIds = [...new Set(records.map(r => r.wallet_id).filter(Boolean))];
  
  // Fetch all related data in parallel
  const [treasurers, cashiers, wallets] = await Promise.all([
    // Get all treasurers
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', treasurerIds),
      
    // Get all cashiers
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', cashierIds),
      
    // Get all wallets
    supabase
      .from('wallets')
      .select('*')
      .in('id', walletIds)
  ]);
  
  // Check for errors
  if (treasurers.error) throw treasurers.error;
  if (cashiers.error) throw cashiers.error;
  if (wallets.error) throw wallets.error;
  
  // Create lookup maps for faster access
  const treasurerMap = Object.fromEntries(treasurers.data.map(t => [t.id, t]));
  const cashierMap = Object.fromEntries(cashiers.data.map(c => [c.id, c]));
  const walletMap = Object.fromEntries(wallets.data.map(w => [w.id, w]));
  
  // Enhance records with related data
  return records.map(record => ({
    ...record,
    treasurer: treasurerMap[record.treasurer_id] || null,
    cashier: cashierMap[record.cashier_id] || null,
    wallet: walletMap[record.wallet_id] || null
  }));
}`;

// Find the right place to insert the helper function (after imports, before first exported function)
const insertIndex = updatedContent.indexOf('export async function');

// Insert the helper function
if (insertIndex !== -1) {
  updatedContent = updatedContent.slice(0, insertIndex) + fetchRelatedDataFunction + '\n\n' + updatedContent.slice(insertIndex);
}

// Update the post-query processing for both given and received responses
const postQueryPattern = /\/\/ Check for errors\s*if\s*\(givenResponse\.error\)\s*throw\s*givenResponse\.error;\s*if\s*\(receivedResponse\.error\)\s*throw\s*receivedResponse\.error;/;

const updatedPostQuery = `// Check for errors
    if (givenResponse.error) throw givenResponse.error;
    if (receivedResponse.error) throw receivedResponse.error;
    
    // Fetch related data for both sets of records
    const givenRecordsWithRelated = await fetchRelatedData(givenResponse.data || []);
    const receivedRecordsWithRelated = await fetchRelatedData(receivedResponse.data || []);`;

updatedContent = updatedContent.replace(postQueryPattern, updatedPostQuery);

// Update the return statement to use the new variables
const returnPattern = /return\s*{[\s\n]*given:\s*givenResponse\.data\s*\|\|\s*\[\],[\s\n]*received:\s*receivedResponse\.data\s*\|\|\s*\[\][\s\n]*};/;

const updatedReturn = `return {
      given: givenRecordsWithRelated || [],
      received: receivedRecordsWithRelated || []
    };`;

updatedContent = updatedContent.replace(returnPattern, updatedReturn);

// Write the updated file
try {
  fs.writeFileSync(cashCustodyPath, updatedContent);
  console.log('Successfully updated cash_custody.js');
} catch (err) {
  console.error('Error writing file:', err);
  console.log('Restoring from backup...');
  
  try {
    fs.copyFileSync(backupPath, cashCustodyPath);
    console.log('Restored from backup successfully');
  } catch (restoreErr) {
    console.error('Error restoring from backup:', restoreErr);
  }
}