import { 
  createBuyTransaction, 
  createSellTransaction 
} from '../lib/supabase/tables/transactions.js';
import { getAllCashCustody, giveCashCustody } from '../lib/supabase/tables/cash_custody.js';
import { getWalletById, updateWalletCurrencyBalance, updateWalletCurrency } from '../lib/supabase/tables/wallets.js';
import { generateUUID } from '../lib/uuid.js';
import supabase from '../lib/supabase/client.js';

/**
 * Service for handling transaction API operations in a consistent way across the application
 */
export const transactionService = {
  /**
   * Creates a buy transaction (customer selling currency to us)
   * 
   * @param {Object} data - Transaction data
   * @param {string} data.destinationWallet - Destination wallet ID or special value ('client', 'custody')
   * @param {string} data.receiveCurrencyCode - Currency received from customer
   * @param {string} data.payCurrencyCode - Currency paid to customer
   * @param {number} data.amount - Amount of currency to buy
   * @param {number} data.price - Exchange rate
   * @param {string} data.clientName - Client name for reference
   * @returns {Promise<Object>} - Transaction result
   */
  createBuyTransaction: async (data) => {
    console.log('Creating buy transaction with data:', data);

    // Different logic based on source and destination wallets
    if (data.destinationWallet === 'client') {
      // Client to client case - just record the transaction without updating wallets
      console.log('Client to client buy transaction');
      
      // Get current user session for cashier ID
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const transactionData = {
        id: generateUUID(),
        type: 'buy',
        walletid: null, // No wallet involved
        currency_code: data.receiveCurrencyCode,
        amount: parseFloat(data.amount),
        exchange_currency_code: data.payCurrencyCode,
        exchange_rate: parseFloat(data.price),
        total_amount: parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id, // Add cashier ID from logged-in user
        source: 'Client', // Client is the source in a buy transaction
        destination: 'Wallet', // Destination is wallet/system in a buy transaction
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
    else if (data.destinationWallet === 'custody') {
      // Client to custody case - update custody records and create transaction
      console.log('Client to custody buy transaction');

      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create transaction record
      const transactionData = {
        id: generateUUID(),
        type: 'buy',
        walletid: null, // No wallet involved
        currency_code: data.receiveCurrencyCode,
        amount: parseFloat(data.amount),
        exchange_currency_code: data.payCurrencyCode,
        exchange_rate: parseFloat(data.price),
        total_amount: parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id, // Add cashier ID from logged-in user
        source: 'Client', // Client is the source in a buy transaction
        destination: 'Cash Custody', // Destination is cash custody
        createdat: Date.now() // Unix timestamp in milliseconds
      };

      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) throw error;

      // Add to cashier's custody - automatically approved since they're the one recording it
      const custodyData = {
        id: generateUUID(),
        treasurer_id: user.id, // Current user is both treasurer and cashier in this case
        cashier_id: user.id,
        currency_code: data.receiveCurrencyCode,
        amount: parseFloat(data.amount),
        status: 'active', // Auto-approved
        notes: `Buy transaction from client ${data.clientName || 'Unknown'}`
      };

      await supabase.from('cash_custody').insert(custodyData);
      
      return { transaction };
    }
    else {
      // Normal wallet transaction
      console.log('Normal wallet buy transaction');
      
      // Get current user session for cashier ID
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      return await createBuyTransaction({
        walletId: data.destinationWallet,
        currency_code: data.receiveCurrencyCode,
        amount: parseFloat(data.amount),
        exchange_currency_code: data.payCurrencyCode,
        exchange_rate: parseFloat(data.price),
        total_amount: parseFloat(data.total),
        cashier_id: user.id,
        source: 'Client',
        destination: `Wallet (${data.destinationWallet})`
      });
    }
  },

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
    if (data.sourceWallet === 'client') {
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
        source: 'Wallet', // Wallet/system is source in a sell transaction
        destination: 'Client', // Client is the destination in a sell transaction
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

      // Create transaction record
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
        source: 'Cash Custody', // Cash custody is the source
        destination: 'Client', // Client is the destination
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
        source: `Wallet (${data.sourceWallet})`,
        destination: 'Cash Custody'
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
        source: `Wallet (${data.sourceWallet})`,
        destination: 'Client'
      });
    }
  }
}