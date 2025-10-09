/**
 * Wallets API
 * 
 * This module handles all database operations related to wallets
 */

import supabase, { handleApiError } from '../client'
import { generateUUID } from '../../uuid'
import { calculateCustodyTotalsByWallet, mergeWalletWithCustody } from '../utils/wallet_custody_helpers'

/**
 * Gets all wallets with their currencies and custody information
 * 
 * @returns {Promise<Object[]>} - Array of wallets with currencies and custody info
 */
export async function getWallets() {
  try {
    // First get all wallets with legacy fields
    console.log('Wallets API: Fetching wallets from Supabase...');
    
    // Get minimal columns to avoid issues with missing columns
    let walletsResponse = await supabase
      .from('wallets')
      .select('*')
      .order('name', { ascending: true });
    
    // Check for any errors
    if (walletsResponse.error) {
      console.error('Wallets API: Error fetching wallets:', walletsResponse.error);
      throw walletsResponse.error;
    }
    
    // Extract wallets from response
    const wallets = walletsResponse.data;
    
    if (!wallets || wallets.length === 0) {
      console.log('Wallets API: No wallets found');
      return { wallets: [] };
    }
    
    console.log('Wallets API: Found', wallets.length, 'wallets');
    
    // Get custody records with joined user data
    const { data: custodyRecords, error: custodyError } = await supabase
      .from('cash_custody')
      .select(`
        *,
        cashier:cashier_id(id, name, email),
        treasurer:treasurer_id(id, name, email)
      `)
      .eq('status', 'active');
      
    if (custodyError) {
      console.warn('Wallets API: Error fetching custody records:', custodyError);
    }
    
    // Calculate custody totals for all wallets
    // Process custody records to get summary
    const activeCustodyRecords = custodyRecords?.filter(record => record.status === 'active') || [];
    
    // Get custody totals for all wallets
    const custodyTotals = calculateCustodyTotalsByWallet(activeCustodyRecords, wallets);
    
    // Initialize all wallets with their legacy currencies
    let walletsWithCurrencies = wallets.map(wallet => {
      // Create initial currencies object with legacy fields
      const currencies = {};
      
      // Add USD and LYD from the legacy fields
      if (wallet.usd !== null && wallet.usd !== undefined) {
        currencies.USD = Number(wallet.usd);
      }
      
      if (wallet.lyd !== null && wallet.lyd !== undefined) {
        currencies.LYD = Number(wallet.lyd);
      }
      
      return {
        ...wallet,
        currencies
      };
    });
    
    try {
      // Try to get currencies from the wallet_currencies table
      // This might fail if the table doesn't exist yet
      console.log('Wallets API: Fetching wallet currencies...');
      const { data: currencies, error: currencyError } = await supabase
        .from('wallet_currencies')
        .select('wallet_id, currency_code, balance');
      
      // If currencies were found, add them to the wallets
      if (!currencyError && currencies && currencies.length > 0) {
        console.log('Wallets API: Found', currencies.length, 'wallet currencies');
        
        // For each wallet, find and add its currencies
        walletsWithCurrencies.forEach(wallet => {
          const walletCurrencies = currencies.filter(c => c.wallet_id === wallet.id);
          
          // Add each currency to the wallet's currencies object
          walletCurrencies.forEach(c => {
            // If the currency already exists from legacy fields, use the higher value
            const currCode = c.currency_code;
            const existingValue = wallet.currencies[currCode] || 0;
            const newValue = Number(c.balance) || 0;
            
            wallet.currencies[currCode] = Math.max(existingValue, newValue);
          });
        });
      } else {
        console.log('Wallets API: No additional currencies found or wallet_currencies table not available');
      }
    } catch (currencyError) {
      // If there's an error fetching currencies (e.g., table doesn't exist),
      // just continue with the legacy fields
      console.warn('Wallets API: Error fetching wallet currencies (continuing with legacy fields):', currencyError);
    }
    
    // Add custody information to each wallet
    walletsWithCurrencies = walletsWithCurrencies.map(wallet => {
      // Use the helper to merge wallet with custody data
      const walletWithCustody = mergeWalletWithCustody(wallet, custodyTotals);
      
      // Mark if this is a treasury wallet - safely handle if the column doesn't exist
      walletWithCustody.isTreasury = wallet.is_treasury === true || wallet.treasury_wallet_id != null;
      
      return walletWithCustody;
    });
    
    console.log('Wallets API: Returning', walletsWithCurrencies.length, 'wallets with currencies and custody info');
    return { wallets: walletsWithCurrencies }
  } catch (error) {
    console.error('Wallets API: Error in getWallets:', error);
    throw handleApiError(error, 'Get Wallets')
  }
}

/**
 * Gets a wallet by ID with its currencies
 * 
 * @param {string} walletId - Wallet ID
 * @returns {Promise<Object>} - Wallet object with currencies
 */
export async function getWalletById(walletId) {
  try {
    // Get wallet with legacy fields
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id, name, usd, lyd')
      .eq('id', walletId)
      .single()
      
    if (error) throw error
    
    // Get all wallet currencies
    const { data: currencies, error: currencyError } = await supabase
      .from('wallet_currencies')
      .select('wallet_id, currency_code, balance')
      .eq('wallet_id', walletId)
    
    if (currencyError) throw currencyError
    
    // Create a currencies object for easier access
    const currenciesObj = {};
    currencies.forEach(c => {
      currenciesObj[c.currency_code] = Number(c.balance);
    });
    
    return {
      ...wallet,
      currencies: currenciesObj
    }
  } catch (error) {
    throw handleApiError(error, 'Get Wallet')
  }
}

/**
 * Creates a new wallet with currencies
 * 
 * @param {Object} walletData - Wallet data
 * @param {string} walletData.name - Wallet name
 * @param {number} [walletData.usd=0] - Legacy USD balance
 * @param {number} [walletData.lyd=0] - Legacy LYD balance
 * @param {Object} [walletData.currencies={}] - Currency balances {currencyCode: balance}
 * @returns {Promise<Object>} - Created wallet
 */
export async function createWallet({ name, usd = 0, lyd = 0, currencies = {} }) {
  try {
    // Create wallet with legacy fields
    const walletId = generateUUID();
    const newWallet = {
      id: walletId,
      name,
      usd,
      lyd
    }
    
    const { data, error } = await supabase
      .from('wallets')
      .insert(newWallet)
      .select('id, name, usd, lyd')
      .single()
      
    if (error) throw error
    
    // Add currencies to wallet
    const currenciesToAdd = [];
    
    // Add any currencies from the currencies object
    Object.entries(currencies).forEach(([code, balance]) => {
      if (code !== 'USD' && code !== 'LYD' && balance !== 0) {
        currenciesToAdd.push({
          wallet_id: walletId,
          currency_code: code,
          balance: Number(balance)
        });
      }
    });
    
    // Add legacy USD/LYD to ensure consistency (if not already in currencies)
    if (usd !== 0 && !currencies.USD) {
      currenciesToAdd.push({
        wallet_id: walletId,
        currency_code: 'USD',
        balance: Number(usd)
      });
    }
    
    if (lyd !== 0 && !currencies.LYD) {
      currenciesToAdd.push({
        wallet_id: walletId,
        currency_code: 'LYD',
        balance: Number(lyd)
      });
    }
    
    if (currenciesToAdd.length > 0) {
      const { error: currencyError } = await supabase
        .from('wallet_currencies')
        .insert(currenciesToAdd);
        
      if (currencyError) {
        console.error('Error adding wallet currencies:', currencyError);
      }
    }
    
    return { wallet: data }
  } catch (error) {
    throw handleApiError(error, 'Create Wallet')
  }
}

/**
 * Updates a wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated wallet
 */
export async function updateWallet(walletId, updates) {
  try {
    // Don't allow updating id through this function
    const { id, ...safeUpdates } = updates
    
    const { data, error } = await supabase
      .from('wallets')
      .update(safeUpdates)
      .eq('id', walletId)
      .select('id, name, usd, lyd')
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    throw handleApiError(error, 'Update Wallet')
  }
}

/**
 * Deletes a wallet
 * 
 * @param {string} walletId - Wallet ID
 * @returns {Promise<void>}
 */
export async function deleteWallet(walletId) {
  try {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId)
      
    if (error) throw error
  } catch (error) {
    throw handleApiError(error, 'Delete Wallet')
  }
}

/**
 * Gets wallet statistics including recent transactions
 * 
 * @param {string} walletId - Wallet ID
 * @returns {Promise<Object>} - Wallet statistics
 */
export async function getWalletStats(walletId) {
  try {
    // Get wallet info
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, name, usd, lyd, is_treasury, user_id')
      .eq('id', walletId)
      .single()
      
    if (walletError) throw walletError
    
    // Get custody totals for this wallet
    const custodyTotals = await getCustodyTotalsByWallet();
    const walletCustodyBalances = custodyTotals[walletId] || {};
    
    // Get recent transactions for this wallet
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, dinarprice')
      .eq('walletid', walletId)
      .order('id', { ascending: false })
      .limit(30)
      
    if (txError) throw txError
    
    // Process transaction data
    const buys = transactions.filter(tx => tx.type === 'buy')
    const sells = transactions.filter(tx => tx.type === 'sell')
    
    // Calculate buy stats
    const buyPrices = buys.map(tx => Number(tx.dinarprice)).sort((a, b) => a - b)
    const buy = buyPrices.length > 0 ? {
      min: buyPrices[0],
      max: buyPrices[buyPrices.length - 1],
      median: buyPrices[Math.floor(buyPrices.length / 2)] || buyPrices[0]
    } : null
    
    // Calculate sell stats
    const sellPrices = sells.map(tx => Number(tx.dinarprice)).sort((a, b) => a - b)
    const sell = sellPrices.length > 0 ? {
      min: sellPrices[0],
      max: sellPrices[sellPrices.length - 1],
      median: sellPrices[Math.floor(sellPrices.length / 2)] || sellPrices[0]
    } : null
    
    // Get custody records for this wallet
    const { data: custodyRecords, error: custodyError } = await supabase
      .from('cash_custody')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });
      
    if (custodyError) {
      console.warn('Wallets API: Error fetching custody records:', custodyError);
    }
    
    // Add custody information to the wallet object
    wallet.isTreasury = !!wallet.is_treasury;
    wallet.custodyBalances = walletCustodyBalances;
    
    return {
      wallet,
      transactions,
      buy,
      sell,
      custodyRecords: custodyRecords || [],
      custodyBalances: walletCustodyBalances
    }
  } catch (error) {
    throw handleApiError(error, 'Get Wallet Stats')
  }
}

/**
 * Gets summary information about all wallets including totals for all currencies
 * 
 * @returns {Promise<Object>} - Summary data including totals for all currencies
 */
export async function getWalletsSummary() {
  try {
    // First get all wallets
    const { wallets } = await getWallets();
    
    if (!wallets || wallets.length === 0) {
      return { totalUsd: 0, totalLyd: 0, count: 0, currencyTotals: {} };
    }
    
    // Calculate totals for all currencies
    const currencyTotals = {};
    let totalUsd = 0;
    let totalLyd = 0;
    
    // Process each wallet
    wallets.forEach(wallet => {
      // Add legacy USD/LYD fields
      if (wallet.usd !== null && wallet.usd !== undefined) {
        totalUsd += Number(wallet.usd);
        // Also add to currency totals
        currencyTotals.USD = (currencyTotals.USD || 0) + Number(wallet.usd);
      }
      
      if (wallet.lyd !== null && wallet.lyd !== undefined) {
        totalLyd += Number(wallet.lyd);
        // Also add to currency totals
        currencyTotals.LYD = (currencyTotals.LYD || 0) + Number(wallet.lyd);
      }
      
      // Process currencies object
      if (wallet.currencies) {
        Object.entries(wallet.currencies).forEach(([code, balance]) => {
          // Skip USD/LYD if they were already counted from legacy fields
          if (code === 'USD' && wallet.usd !== undefined) return;
          if (code === 'LYD' && wallet.lyd !== undefined) return;
          
          // Add to totals
          currencyTotals[code] = (currencyTotals[code] || 0) + Number(balance);
          
          // Add USD/LYD to their respective legacy totals
          if (code === 'USD') totalUsd += Number(balance);
          if (code === 'LYD') totalLyd += Number(balance);
        });
      }
    });
    
    const count = wallets.length;
    
    console.log('Wallet summary calculated:', { 
      totalUsd, totalLyd, count, 
      currencyCount: Object.keys(currencyTotals).length,
      currencies: Object.keys(currencyTotals).join(', ')
    });
    
    return { totalUsd, totalLyd, count, currencyTotals };
  } catch (error) {
    console.error('Error getting wallets summary:', error);
    throw handleApiError(error, 'Get Wallets Summary');
  }
}

/**
 * Adds a currency to a wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @param {number} initialBalance - Initial balance
 * @returns {Promise<Object>} - Updated wallet with all currencies
 */
export async function addCurrencyToWallet(walletId, currencyCode, initialBalance = 0) {
  try {
    // Check if currency already exists in this wallet
    const { data: existing, error: checkError } = await supabase
      .from('wallet_currencies')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('currency_code', currencyCode)
      .maybeSingle();
      
    if (checkError) throw checkError;
    
    if (existing) {
      throw new Error(`This wallet already has ${currencyCode} currency`);
    }
    
    // Add the new currency
    const { error: insertError } = await supabase
      .from('wallet_currencies')
      .insert({
        wallet_id: walletId,
        currency_code: currencyCode,
        balance: Number(initialBalance)
      });
      
    if (insertError) throw insertError;
    
    // Get updated wallet data
    return await getWalletById(walletId);
  } catch (error) {
    throw handleApiError(error, 'Add Currency To Wallet');
  }
}

/**
 * Updates a currency balance in a wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @param {number} newBalance - New balance
 * @returns {Promise<Object>} - Updated wallet with all currencies
 */
export async function updateWalletCurrencyBalance(walletId, currencyCode, newBalance) {
  try {
    // Handle legacy fields
    if ((currencyCode === 'USD' || currencyCode === 'LYD') && 
        !(await hasCurrencyInWalletCurrencies(walletId, currencyCode))) {
      // Update the legacy field instead
      const updates = {};
      updates[currencyCode.toLowerCase()] = Number(newBalance);
      
      await updateWallet(walletId, updates);
      return await getWalletById(walletId);
    }
    
    // Update the currency in wallet_currencies
    const { error } = await supabase
      .from('wallet_currencies')
      .update({ balance: Number(newBalance) })
      .eq('wallet_id', walletId)
      .eq('currency_code', currencyCode);
      
    if (error) throw error;
    
    // Get updated wallet data
    return await getWalletById(walletId);
  } catch (error) {
    throw handleApiError(error, 'Update Wallet Currency Balance');
  }
}

/**
 * Removes a currency from a wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @returns {Promise<Object>} - Updated wallet
 */
export async function removeCurrencyFromWallet(walletId, currencyCode) {
  try {
    // Cannot remove USD or LYD from legacy fields
    if (currencyCode === 'USD' || currencyCode === 'LYD') {
      // If it's in wallet_currencies we can remove it from there,
      // but we need to check if it's the legacy field
      if (!(await hasCurrencyInWalletCurrencies(walletId, currencyCode))) {
        throw new Error(`Cannot remove ${currencyCode} from wallet. Use updateWallet to set the balance to 0 instead.`);
      }
    }
    
    const { error } = await supabase
      .from('wallet_currencies')
      .delete()
      .eq('wallet_id', walletId)
      .eq('currency_code', currencyCode);
      
    if (error) throw error;
    
    // Get updated wallet data
    return await getWalletById(walletId);
  } catch (error) {
    throw handleApiError(error, 'Remove Currency From Wallet');
  }
}

/**
 * Checks if a currency exists in wallet_currencies table
 * 
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @returns {Promise<boolean>} - Whether currency exists in wallet_currencies
 */
async function hasCurrencyInWalletCurrencies(walletId, currencyCode) {
  const { data, error } = await supabase
    .from('wallet_currencies')
    .select('*')
    .eq('wallet_id', walletId)
    .eq('currency_code', currencyCode)
    .maybeSingle();
    
  if (error) throw error;
  return !!data;
}

/**
 * Withdraws a specified amount of a currency from a wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @param {number} amount - Amount to withdraw
 * @param {string} reason - Reason for withdrawal
 * @returns {Promise<Object>} - Updated wallet object
 */
export async function withdrawCurrency(walletId, currencyCode, amount, reason) {
  try {
    // Check if this is a legacy currency (USD/LYD)
    if ((currencyCode === 'USD' || currencyCode === 'LYD') && 
        !(await hasCurrencyInWalletCurrencies(walletId, currencyCode))) {
      // Use legacy withdraw function
      return await withdrawLegacy(walletId, currencyCode.toLowerCase(), amount, reason);
    }
    
    // Get current wallet state
    const wallet = await getWalletById(walletId);
    
    // Check if currency exists in wallet
    const currentBalance = wallet.currencies && wallet.currencies[currencyCode];
    if (currentBalance === undefined) {
      throw new Error(`Currency ${currencyCode} not found in wallet`);
    }
    
    // Check if sufficient balance
    if (Number(currentBalance) < Number(amount)) {
      throw new Error(`Insufficient ${currencyCode} balance`);
    }
    
    // Update wallet currency balance
    const newBalance = Number(currentBalance) - Number(amount);
    const { error } = await supabase
      .from('wallet_currencies')
      .update({ balance: newBalance })
      .eq('wallet_id', walletId)
      .eq('currency_code', currencyCode);
      
    if (error) throw error;
    
    // Create transaction record
    await createWithdrawalTransaction(walletId, currencyCode, amount, reason);
    
    // Get updated wallet data
    return await getWalletById(walletId);
  } catch (error) {
    throw handleApiError(error, 'Withdraw Currency');
  }
}

/**
 * Handle legacy withdrawal from USD/LYD fields
 */
async function withdrawLegacy(walletId, currency, amount, reason) {
  try {
    // Get current wallet state
    const wallet = await getWalletById(walletId);
    
    // Check if sufficient balance
    if (Number(wallet[currency]) < Number(amount)) {
      throw new Error(`Insufficient ${currency.toUpperCase()} balance`);
    }
    
    // Update wallet balance
    const updates = {};
    updates[currency] = Number(wallet[currency]) - Number(amount);
    
    await updateWallet(walletId, updates);
    
    // Create transaction record
    await createWithdrawalTransaction(walletId, currency.toUpperCase(), amount, reason);
    
    // Get updated wallet data
    return await getWalletById(walletId);
  } catch (error) {
    throw handleApiError(error, 'Withdraw Legacy');
  }
}

/**
 * Creates a withdrawal transaction record
 */
async function createWithdrawalTransaction(walletId, currencyCode, amount, reason) {
  try {
    const transaction = {
      wallet_id: walletId,
      type: 'withdrawal',
      amount: Number(amount),
      currency_code: currencyCode,
      reason: reason || 'Withdrawal',
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('transactions')
      .insert(transaction);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error creating withdrawal transaction:', error);
    // We don't throw here to avoid blocking the withdrawal if only the transaction fails
  }
}

/**
 * Updates a wallet currency balance by adding a delta amount
 * 
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @param {number} deltaAmount - Amount to add (positive) or subtract (negative)
 * @returns {Promise<Object>} - Updated wallet with all currencies
 */
export async function updateWalletCurrency(walletId, currencyCode, deltaAmount) {
  try {
    // Handle legacy fields
    if ((currencyCode === 'USD' || currencyCode === 'LYD') && 
        !(await hasCurrencyInWalletCurrencies(walletId, currencyCode))) {
      // Get current wallet
      const wallet = await getWalletById(walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }
      
      // Update the legacy field by adding the delta
      const fieldName = currencyCode.toLowerCase();
      const currentAmount = Number(wallet[fieldName] || 0);
      const newAmount = currentAmount + Number(deltaAmount);
      
      // Use updateWallet to set the new value
      const updates = {};
      updates[fieldName] = newAmount;
      await updateWallet(walletId, updates);
      
      return await getWalletById(walletId);
    }
    
    // For non-legacy currencies, get the current balance first
    const currencyRecord = await getWalletCurrency(walletId, currencyCode);
    
    if (!currencyRecord) {
      // Currency doesn't exist yet, add it with the delta amount (if positive)
      if (deltaAmount <= 0) {
        throw new Error(`Cannot subtract from non-existent currency ${currencyCode} in wallet ${walletId}`);
      }
      
      return await addCurrencyToWallet(walletId, currencyCode, deltaAmount);
    }
    
    // Currency exists, update its balance
    const currentBalance = Number(currencyRecord.balance || 0);
    const newBalance = currentBalance + Number(deltaAmount);
    
    if (newBalance < 0) {
      throw new Error(`Insufficient balance: have ${currentBalance} ${currencyCode}, tried to subtract ${Math.abs(deltaAmount)}`);
    }
    
    // Update the balance
    return await updateWalletCurrencyBalance(walletId, currencyCode, newBalance);
  } catch (error) {
    throw handleApiError(error, 'Update Wallet Currency Delta');
  }
}

export default {
  getWallets,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
  getWalletStats,
  getWalletsSummary,
  addCurrencyToWallet,
  updateWalletCurrencyBalance,
  updateWalletCurrency,
  removeCurrencyFromWallet,
  withdrawCurrency
}