// Alternative approach: Modify the cash_custody.js file to not use foreign key syntax
import fs from 'fs';
import path from 'path';

const cashCustodyPath = path.join(process.cwd(), 'src/lib/supabase/tables/cash_custody.js');
const backupPath = path.join(process.cwd(), 'src/lib/supabase/tables/cash_custody.js.backup');

// Create backup first (if not already exists)
if (!fs.existsSync(backupPath)) {
  try {
    fs.copyFileSync(cashCustodyPath, backupPath);
    console.log('Backup created at:', backupPath);
  } catch (err) {
    console.error('Error creating backup:', err);
    process.exit(1);
  }
}

// Read the file
let content;
try {
  content = fs.readFileSync(cashCustodyPath, 'utf8');
} catch (err) {
  console.error('Error reading file:', err);
  process.exit(1);
}

// Replace the problematic query syntax with simpler version
const selectPattern = /\.select\(['"].*?cashier:cashier_id\(\*\).*?['"]\)/g;
const simpleSelect = `.select('*')`;

let updatedContent = content.replace(selectPattern, simpleSelect);

// Add a function to fetch related user and wallet data separately
const fetchRelatedDataFunction = `
/**
 * Helper function to fetch user details for cash custody records
 * @param {Array} records - Array of cash custody records
 * @returns {Promise<Array>} - Records with related data
 */
async function fetchUserDetails(records) {
  if (!records || records.length === 0) return [];
  
  // Create arrays of unique user IDs
  const treasurerIds = [...new Set(records.map(r => r.treasurer_id).filter(Boolean))];
  const cashierIds = [...new Set(records.map(r => r.cashier_id).filter(Boolean))];
  const allUserIds = [...new Set([...treasurerIds, ...cashierIds])];
  
  // Get all wallet IDs
  const walletIds = [...new Set(records.map(r => r.wallet_id).filter(Boolean))];
  
  // Early exit if no IDs to fetch
  if (allUserIds.length === 0) return records;
  
  console.log('Cash Custody API: Fetching user details for', allUserIds.length, 'users');
  
  try {
    // Fetch user profiles
    const { data: userProfiles, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .in('id', allUserIds);
      
    if (userError) {
      console.error('Error fetching user profiles:', userError);
      return records; // Return original records on error
    }
    
    // Fetch wallet data
    const { data: wallets, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .in('id', walletIds);
      
    if (walletError) {
      console.error('Error fetching wallets:', walletError);
      // Continue without wallet data
    }
    
    // Create lookup maps
    const userMap = Object.fromEntries((userProfiles || []).map(user => [user.id, user]));
    const walletMap = Object.fromEntries((wallets || []).map(wallet => [wallet.id, wallet]));
    
    // Add user details to records
    return records.map(record => ({
      ...record,
      treasurer: userMap[record.treasurer_id] || null,
      cashier: userMap[record.cashier_id] || null,
      wallet: walletMap[record.wallet_id] || null
    }));
  } catch (error) {
    console.error('Error in fetchUserDetails:', error);
    return records; // Return original records on error
  }
}`;

// Find the right spot to insert the helper function (after imports, before first exported function)
const insertIndex = updatedContent.indexOf('export async function');
if (insertIndex !== -1) {
  updatedContent = updatedContent.slice(0, insertIndex) + fetchRelatedDataFunction + '\n\n' + updatedContent.slice(insertIndex);
}

// Update the getAllCashCustody function to use our new helper
const processResponsePattern = /\/\/ Check for errors\s*if\s*\(givenResponse\.error\)\s*throw\s*givenResponse\.error;\s*if\s*\(receivedResponse\.error\)\s*throw\s*receivedResponse\.error;([\s\S]*?)return\s*{[\s\n]*given:[^,]*,[\s\n]*received:[^}]*}/g;

const updatedProcessing = `// Check for errors
    if (givenResponse.error) throw givenResponse.error;
    if (receivedResponse.error) throw receivedResponse.error;
    
    // Fetch related user details and add them to the records
    const [enhancedGivenRecords, enhancedReceivedRecords] = await Promise.all([
      fetchUserDetails(givenResponse.data || []),
      fetchUserDetails(receivedResponse.data || [])
    ]);
    
    return {
      given: enhancedGivenRecords || [],
      received: enhancedReceivedRecords || []
    }`;

updatedContent = updatedContent.replace(processResponsePattern, updatedProcessing);

// Write the updated file
try {
  fs.writeFileSync(cashCustodyPath, updatedContent);
  console.log('Successfully updated cash_custody.js to avoid foreign key syntax');
} catch (err) {
  console.error('Error writing file:', err);
  process.exit(1);
}