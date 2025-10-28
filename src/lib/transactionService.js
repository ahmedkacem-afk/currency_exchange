import { 
  createBuyTransaction, 
  createSellTransaction 
} from './supabase/tables/transactions.js';
import { getAllCashCustody, giveCashCustody } from './supabase/tables/cash_custody.js';
import { getWalletById, updateWalletCurrencyBalance, updateWalletCurrency } from './supabase/tables/wallets.js';
import { getUserCustodyRecords, updateCustodyBalance } from './supabase/tables/custody.js';
import { getAllUsers } from './supabase/tables/users.js';
import { getAllRoles, getRoleByName } from './supabase/tables/roles.js';
import { generateUUID } from './uuid.js';
import supabase from './supabase/client.js';

/**
 * Generate a guaranteed unique transaction ID
 * This function ensures proper UUID format with 36 characters
 * @returns {string} A valid UUID string suitable for the transactions table
 */
function generateUniqueTransactionId() {
  // Get a base UUID
  let uuid = generateUUID();
  
  // Validate UUID is exactly 36 characters with proper format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // If somehow the UUID isn't valid, create a properly formatted one manually
  if (!uuidRegex.test(uuid) || uuid.length !== 36) {
    console.warn('Invalid UUID generated, creating manual replacement');
    
    // Create a properly formatted UUID manually
    const segments = [
      Math.random().toString(16).substring(2, 10),
      Math.random().toString(16).substring(2, 6),
      '4' + Math.random().toString(16).substring(2, 5),
      (8 + Math.floor(Math.random() * 4)).toString(16) + Math.random().toString(16).substring(2, 5),
      Date.now().toString(16).substring(0, 12)
    ];
    
    uuid = segments.join('-');
    
    // Ensure the length is exactly 36 characters
    if (uuid.length < 36) {
      uuid = uuid.padEnd(36, '0');
    } else if (uuid.length > 36) {
      uuid = uuid.substring(0, 36);
    }
  }
  
  console.log(`Generated transaction ID: ${uuid} (length: ${uuid.length})`);
  return uuid;
}

/**
 * Service for handling transaction API operations in a consistent way across the application
 */
export const transactionService = {
  /**
   * Creates a buy transaction (customer selling currency to us)
   * 
   * @param {Object} data - Transaction data
   * @param {string} data.sourceWallet - Source wallet ID or special value ('client', 'custody:id')
   * @param {string} data.destinationWallet - Destination wallet ID or special value ('client', 'custody:id')
   * @param {string} data.receiveCurrencyCode - Currency received from customer
   * @param {string} data.payCurrencyCode - Currency paid to customer
   * @param {number} data.amount - Amount of currency to buy
   * @param {number} data.price - Exchange rate
   * @param {string} data.clientName - Client name for reference
   * @returns {Promise<Object>} - Transaction result
   */
  createBuyTransaction: async (data) => {
    console.log('Creating buy transaction with data:', data);

    // Parse wallet types from values
    const sourceType = data.sourceWallet ? data.sourceWallet.split(':')[0] : 'client';
    const sourceId = data.sourceWallet ? data.sourceWallet.split(':')[1] || data.sourceWallet : null;
    
    const destinationType = data.destinationWallet ? data.destinationWallet.split(':')[0] : null;
    const destinationId = data.destinationWallet ? data.destinationWallet.split(':')[1] || data.destinationWallet : null;
    
    console.log('Source:', sourceType, sourceId);
    console.log('Destination:', destinationType, destinationId);
    
    // Get descriptive names for source and destination
    let sourceName = 'Client';
    let destinationName = 'Client';
    
    // Get wallet and custody descriptive names if needed
    if (sourceType === 'wallet') {
      // Get wallet name
      const { data: walletData } = await supabase
        .from('wallets')
        .select('name')
        .eq('id', sourceId)
        .single();
        
      sourceName = walletData?.name || `Wallet (${sourceId})`;
    } else if (sourceType === 'custody') {
      // Get custody info with user name
      if (sourceId && sourceId !== 'custody') {
        const { data: custodyData } = await supabase
          .from('cash_custody')
          .select('id, currency_code')
          .eq('id', sourceId)
          .single();
        
        sourceName = custodyData 
          ? `Custody_${custodyData.currency_code}`
          : `Custody (${sourceId})`;
      } else {
        sourceName = 'Custody';
      }
    }
    
    if (destinationType === 'wallet') {
      // Get wallet name
      const { data: walletData } = await supabase
        .from('wallets')
        .select('name')
        .eq('id', destinationId)
        .single();
        
      destinationName = walletData?.name || `Wallet (${destinationId})`;
    } else if (destinationType === 'custody') {
      // Get custody info with user name
      if (destinationId && destinationId !== 'custody') {
        const { data: custodyData } = await supabase
          .from('cash_custody')
          .select('id, currency_code')
          .eq('id', destinationId)
          .single();
        
        destinationName = custodyData 
          ? `Custody_${custodyData.currency_code}`
          : `Custody (${destinationId})`;
      } else {
        destinationName = 'Custody';
      }
    }

    // Get current user session for cashier ID
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create transaction record
    const transactionData = {
      id: generateUniqueTransactionId(),
      type: 'buy',
      walletid: destinationType === 'wallet' ? destinationId : null,
      currency_code: data.receiveCurrencyCode,
      amount: parseFloat(data.amount),
      exchange_currency_code: data.payCurrencyCode,
      exchange_rate: parseFloat(data.price),
      total_amount: parseFloat(data.total),
      client_name: data.clientName,
      cashier_id: user.id,
      source: sourceName, // Use descriptive name instead of type
      destination: destinationName, // Use descriptive name instead of type
      createdat: Date.now() // Unix timestamp in milliseconds
    };
    
    // Insert transaction record
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Handle custody-to-custody case first
    if (sourceType === 'custody' && destinationType === 'custody') {
      console.log('Custody to custody transfer');
      
      // Create transaction record first with descriptive names
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          source: sourceName,
          destination: destinationName
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Deduct from source custody
      await updateCustodyBalance(sourceId, -parseFloat(data.amount));
      
      // Add to destination custody
      await updateCustodyBalance(destinationId, parseFloat(data.amount));
      
      return { transaction, source: sourceName, destination: destinationName };
    }
    
    // Handle destination based on type
    if (destinationType === 'custody') {
      console.log('Updating custody record:', destinationId);
      
      if (destinationId) {
        // Update existing custody record with the amount
        await updateCustodyBalance(destinationId, parseFloat(data.amount));
      } else {
        // Check if the user already has a custody record for this currency
        const { data: custodyRecords } = await getUserCustodyRecords();
        const existingRecord = custodyRecords.find(r => r.currencyCode === data.receiveCurrencyCode);
        
        if (existingRecord) {
          // Update the existing record
          await updateCustodyBalance(existingRecord.id, parseFloat(data.amount));
        } else {
          // Create a new custody record for this user and currency
          await supabase
            .from('custody')
            .insert({
              user_id: user.id,
              currency_code: data.receiveCurrencyCode,
              amount: parseFloat(data.amount),
              updated_at: new Date().toISOString()
            });
        }
      }
      
      return { transaction, destination: 'custody' };
    } 
    else if (destinationType === 'wallet') {
      console.log('Updating wallet:', destinationId);
      
      // Update the wallet with the amount
      await updateWalletCurrencyBalance(
        destinationId,
        data.receiveCurrencyCode,
        parseFloat(data.amount)
      );
      
      return { transaction, destination: 'wallet' };
    }
    
    return { transaction, destination: 'client' };
  }
  
  ,

  /**
   * Creates a sell transaction (us selling currency to the customer)
   * 
   * @param {Object} data - Transaction data
   * @param {string} data.sourceWallet - Source wallet ID or special value ('client', 'custody')
   * @param {string} data.sellCurrencyCode - Currency to sell to customer
   * @param {string} data.receiveCurrencyCode - Currency to receive from customer
   * @param {number} data.amount - Amount of currency to sell
   * @param {number} data.price - Exchange rate
   * @param {string} data.clientName - Client name for reference
   * @returns {Promise<Object>} - Transaction result
   */
  createSellTransaction: async (data) => {
    console.log('Creating sell transaction with data:', data);

    // Different logic based on source and destination wallets
    // Parse wallet types from values
    const sourceType = data.sourceWallet ? data.sourceWallet.split(':')[0] : 'client';
    const sourceId = data.sourceWallet ? data.sourceWallet.split(':')[1] || data.sourceWallet : null;
    
    const destinationType = data.destinationWallet ? data.destinationWallet.split(':')[0] : 'client';
    const destinationId = data.destinationWallet ? data.destinationWallet.split(':')[1] || data.destinationWallet : null;
    
    console.log('Source:', sourceType, sourceId);
    console.log('Destination:', destinationType, destinationId);
    
    // Get descriptive names for source and destination
    let sourceName = 'Client';
    let destinationName = 'Client';
    
    // Get wallet and custody descriptive names if needed
    if (sourceType === 'wallet') {
      // Get wallet name
      const { data: walletData } = await supabase
        .from('wallets')
        .select('name')
        .eq('id', sourceId)
        .single();
        
      sourceName = walletData?.name || `Wallet (${sourceId})`;
    } else if (sourceType === 'custody') {
      // Get custody info with user name
      if (sourceId && sourceId !== 'custody') {
        const { data: custodyData } = await supabase
          .from('cash_custody')
          .select('id, currency_code')
          .eq('id', sourceId)
          .single();
        
        sourceName = custodyData 
          ? `Custody_${custodyData.currency_code}`
          : `Custody (${sourceId})`;
      } else {
        sourceName = 'Custody';
      }
    }
    
    if (destinationType === 'wallet') {
      // Get wallet name
      const { data: walletData } = await supabase
        .from('wallets')
        .select('name')
        .eq('id', destinationId)
        .single();
        
      destinationName = walletData?.name || `Wallet (${destinationId})`;
    } else if (destinationType === 'custody') {
      // Get custody info with user name
      if (destinationId && destinationId !== 'custody') {
        const { data: custodyData } = await supabase
          .from('cash_custody')
          .select('id, currency_code')
          .eq('id', destinationId)
          .single();
        
        destinationName = custodyData 
          ? `Custody_${custodyData.currency_code}`
          : `Custody (${destinationId})`;
      } else {
        destinationName = 'Custody';
      }
    }
    
    // Handle custody-to-custody case
    if (sourceType === 'custody' && destinationType === 'custody') {
      console.log('Custody to custody transfer');
      
      // Get current user session for cashier ID
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Create transaction record with descriptive names
      const transactionData = {
        id: generateUniqueTransactionId(),
        type: 'transfer',
        walletid: null,
        currency_code: data.sellCurrencyCode,
        amount: parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: parseFloat(data.price),
        total_amount: parseFloat(data.total),
        client_name: data.clientName || 'Internal Transfer',
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now()
      };
      
      // Insert transaction record
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update source custody (decrease amount)
      await updateCustodyBalance(sourceId, -parseFloat(data.amount));
      
      // Update destination custody (increase amount)
      await updateCustodyBalance(destinationId, parseFloat(data.amount));
      
      return { transaction, source: sourceName, destination: destinationName };
    }
    
    if (sourceType === 'client') {
      // Client to client case - just record the transaction without updating wallets
      console.log('Client to client sell transaction');
      
      // Get current user session for cashier ID
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const transactionData = {
        id: generateUUID(),
        type: 'sell',
        walletid: null, // No wallet involved - lowercase as per actual schema
        currency_code: data.sellCurrencyCode,
        amount: parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: parseFloat(data.price),
        total_amount: parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id, // Add cashier ID from logged-in user
        source: sourceName, // Use descriptive name
        destination: destinationName, // Use descriptive name
        createdat: Date.now() // Unix timestamp in milliseconds
      };

      // Insert transaction record
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) throw error;
      
      return { transaction, wallet: null };
    }
    else if (data.sourceWallet === 'custody') {
      // Custody to client case - update custody records and create transaction
      console.log('Custody to client sell transaction');
      
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get all cash custody records for the current user
      const custodyRecords = await getAllCashCustody();
      
      // Find active custody records for the currency being sold
      const activeCustodyRecords = [
        ...(custodyRecords.given || []), 
        ...(custodyRecords.received || [])
      ].filter(record => 
        record.status === 'active' && 
        record.currency_code === data.sellCurrencyCode &&
        record.cashier_id === user.id
      );
      
      // Check if there's enough in custody
      const totalCustody = activeCustodyRecords.reduce(
        (sum, record) => sum + parseFloat(record.amount), 0
      );
      
      if (totalCustody < parseFloat(data.amount)) {
        throw new Error(`Insufficient funds in custody: have ${totalCustody} ${data.sellCurrencyCode}, need ${data.amount}`);
      }

      // Create transaction record with descriptive names
      const transactionData = {
        id: generateUUID(),
        type: 'sell',
        walletid: null, // No wallet involved - lowercase as per actual schema
        currency_code: data.sellCurrencyCode,
        amount: parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: parseFloat(data.price),
        total_amount: parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id, // Add cashier ID from logged-in user
        source: sourceName, // Use descriptive name
        destination: destinationName, // Use descriptive name
        createdat: Date.now() // Unix timestamp in milliseconds
      };

      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) throw error;

      // Reduce custody amount - this is simplified, in real-world you might want to track
      // exactly which custody records are being reduced
      let amountToReduce = parseFloat(data.amount);
      
      for (const record of activeCustodyRecords) {
        if (amountToReduce <= 0) break;
        
        const recordAmount = parseFloat(record.amount);
        const reduceBy = Math.min(recordAmount, amountToReduce);
        
        // Update custody record
        if (reduceBy >= recordAmount) {
          // Zero out this custody record (mark as used/returned)
          await supabase
            .from('cash_custody')
            .update({ 
              status: 'returned',
              is_returned: true,
              amount: 0,
              updated_at: new Date().toISOString(),
              return_notes: `Full amount sold to client ${data.clientName || 'Unknown'}`
            })
            .eq('id', record.id);
        } else {
          // Reduce this custody record
          await supabase
            .from('cash_custody')
            .update({ 
              amount: recordAmount - reduceBy,
              updated_at: new Date().toISOString(),
              notes: `${record.notes || ''} (Reduced by ${reduceBy} from sell to client ${data.clientName || 'Unknown'})`
            })
            .eq('id', record.id);
        }
        
        amountToReduce -= reduceBy;
      }
      
      return { transaction };
    }
    else if (data.destinationWallet === 'custody') {
      // Wallet to custody case - transfer from wallet to custody
      console.log('Wallet to custody sell transaction');
      
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // First perform the regular wallet transaction
      const result = await createSellTransaction({
        walletId: data.sourceWallet,
        sellCurrencyCode: data.sellCurrencyCode,
        sellAmount: parseFloat(data.amount),
        receiveCurrencyCode: data.receiveCurrencyCode,
        receiveAmount: parseFloat(data.total),
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName
      });
      
      // Then create custody record for the received currency
      if (data.receiveCurrencyCode && data.total > 0) {
        const custodyData = {
          id: generateUUID(),
          treasurer_id: user.id,
          cashier_id: user.id,
          currency_code: data.receiveCurrencyCode,
          amount: parseFloat(data.total),
          status: 'active', // Auto-approved
          notes: `From wallet-to-custody sell transaction for client ${data.clientName || 'Unknown'}`
        };
        
        await supabase.from('cash_custody').insert(custodyData);
      }
      
      return result;
    }
    else {
      // Normal wallet transaction
      console.log('Normal wallet sell transaction');
      
      // Get current user session for cashier ID
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      return await createSellTransaction({
        walletId: data.sourceWallet,
        sellCurrencyCode: data.sellCurrencyCode,
        sellAmount: parseFloat(data.amount),
        receiveCurrencyCode: data.receiveCurrencyCode,
        receiveAmount: parseFloat(data.total),
        cashier_id: user.id,
        source: sourceName, // Use descriptive name
        destination: destinationName // Use descriptive name
      });
    }
  },

  /**
   * Get all cashiers for treasury management
   * 
   * This function extracts all users with the 'cashier' role in the system
   * @returns {Promise<Array>} - List of cashier users with their details
   */
  getAllCashiers: async () => {
    try {
      console.log('TransactionService: Getting all cashiers...');
      
      // Get all users first
      const { users } = await getAllUsers({ limit: 100 });
      
      if (!users || users.length === 0) {
        console.warn('TransactionService: No users found');
        return [];
      }
      
      // Try to get the cashier role ID
      let cashierRoleId = null;
      try {
        const cashierRole = await getRoleByName('cashier');
        cashierRoleId = cashierRole?.id;
      } catch (error) {
        console.warn('TransactionService: Error getting cashier role by name:', error);
      }
      
      // Filter users who have cashier role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const cashiers = users.filter(user => {
        return (
          (user.role && user.role.toLowerCase() === 'cashier') || 
          (cashierRoleId && user.role_id === cashierRoleId)
        );
      });
      
      console.log(`TransactionService: Found ${cashiers.length} cashiers`);
      return cashiers;
    } catch (error) {
      console.error('TransactionService: Error getting cashiers:', error);
      return [];
    }
  },
  
  /**
   * Get all managers for treasury management
   * 
   * This function extracts all users with the 'manager' role in the system
   * @returns {Promise<Array>} - List of manager users with their details
   */
  getAllManagers: async () => {
    try {
      console.log('TransactionService: Getting all managers...');
      
      // Get all users first
      const { users } = await getAllUsers({ limit: 100 });
      
      if (!users || users.length === 0) {
        console.warn('TransactionService: No users found');
        return [];
      }
      
      // Try to get the manager role ID
      let managerRoleId = null;
      try {
        const managerRole = await getRoleByName('manager');
        managerRoleId = managerRole?.id;
      } catch (error) {
        console.warn('TransactionService: Error getting manager role by name:', error);
      }
      
      // Filter users who have manager role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const managers = users.filter(user => {
        return (
          (user.role && user.role.toLowerCase() === 'manager') || 
          (managerRoleId && user.role_id === managerRoleId)
        );
      });
      
      console.log(`TransactionService: Found ${managers.length} managers`);
      return managers;
    } catch (error) {
      console.error('TransactionService: Error getting managers:', error);
      return [];
    }
  },
  
  /**
   * Get all treasurers for treasury management
   * 
   * This function extracts all users with the 'treasurer' role in the system
   * @returns {Promise<Array>} - List of treasurer users with their details
   */
  getAllTreasurers: async () => {
    try {
      console.log('TransactionService: Getting all treasurers...');
      
      // Get all users first
      const { users } = await getAllUsers({ limit: 100 });
      
      if (!users || users.length === 0) {
        console.warn('TransactionService: No users found');
        return [];
      }
      
      // Try to get the treasurer role ID
      let treasurerRoleId = null;
      try {
        const treasurerRole = await getRoleByName('treasurer');
        treasurerRoleId = treasurerRole?.id;
      } catch (error) {
        console.warn('TransactionService: Error getting treasurer role by name:', error);
      }
      
      // Filter users who have treasurer role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const treasurers = users.filter(user => {
        return (
          (user.role && user.role.toLowerCase() === 'treasurer') || 
          (treasurerRoleId && user.role_id === treasurerRoleId)
        );
      });
      
      console.log(`TransactionService: Found ${treasurers.length} treasurers`);
      return treasurers;
    } catch (error) {
      console.error('TransactionService: Error getting treasurers:', error);
      return [];
    }
  },
  
  /**
   * Get all users by role for treasury management
   * 
   * @param {string} roleName - The name of the role to filter by ('cashier', 'manager', 'treasurer', etc.)
   * @returns {Promise<Array>} - List of users with the specified role
   */
  getUsersByRole: async (roleName) => {
    try {
      console.log(`TransactionService: Getting users with role '${roleName}'...`);
      
      if (!roleName) {
        throw new Error('Role name is required');
      }
      
      // Get all users first
      const { users } = await getAllUsers({ limit: 100 });
      
      if (!users || users.length === 0) {
        console.warn('TransactionService: No users found');
        return [];
      }
      
      // Try to get the role ID
      let roleId = null;
      try {
        const role = await getRoleByName(roleName);
        roleId = role?.id;
      } catch (error) {
        console.warn(`TransactionService: Error getting role by name '${roleName}':`, error);
      }
      
      // Filter users who have the specified role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const filteredUsers = users.filter(user => {
        return (
          (user.role && user.role.toLowerCase() === roleName.toLowerCase()) || 
          (roleId && user.role_id === roleId)
        );
      });
      
      console.log(`TransactionService: Found ${filteredUsers.length} users with role '${roleName}'`);
      return filteredUsers;
    } catch (error) {
      console.error(`TransactionService: Error getting users with role '${roleName}':`, error);
      return [];
    }
  }
}