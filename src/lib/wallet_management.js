/**
 * Functions for the wallet management system
 * This file provides API functions specifically for the wallet management page
 */

import supabase, { handleApiError } from './supabase/client';
import { generateUUID } from './uuid';
import { getWalletById } from './supabase/tables/wallets';

/**
 * Get all wallets with their balances
 * 
 * @returns {Promise<Array>} - Array of wallets with balance data
 */
export async function getAllWallets() {
  try {
    // Get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, name')
      .order('name', { ascending: true });
    
    if (walletsError) throw walletsError;
    
    // Get balances for each wallet
    const walletsWithBalances = await Promise.all(
      wallets.map(async (wallet) => {
        const { data: balances, error: balancesError } = await supabase
          .from('wallet_currencies')
          .select('currency_code, balance')
          .eq('wallet_id', wallet.id);
        
        if (balancesError) throw balancesError;
        
        // Convert to object format for easier access
        const balancesObj = {};
        balances.forEach(balance => {
          balancesObj[balance.currency_code] = balance.balance;
        });
        
        return {
          ...wallet,
          balances: balancesObj
        };
      })
    );
    
    return walletsWithBalances;
  } catch (error) {
    console.error('Error getting all wallets with balances:', error);
    throw error;
  }
}

/**
 * Update wallet balance by adding or updating currency amount
 * 
 * @param {string} walletId - ID of the wallet to update
 * @param {string} currencyCode - Currency code to add or update
 * @param {number} amount - Amount to add (can be negative for subtraction)
 * @returns {Promise<Object>} - Updated wallet data
 */
export async function updateWalletBalance(walletId, currencyCode, amount) {
  try {
    // Check if currency already exists in wallet
    const { data: existingCurrency, error: checkError } = await supabase
      .from('wallet_currencies')
      .select('balance')
      .eq('wallet_id', walletId)
      .eq('currency_code', currencyCode)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    if (existingCurrency) {
      // Update existing balance
      const newBalance = parseFloat(existingCurrency.balance) + parseFloat(amount);
      
      // Ensure balance doesn't go negative
      if (newBalance < 0) {
        throw new Error(`Insufficient balance for ${currencyCode}`);
      }
      
      const { error: updateError } = await supabase
        .from('wallet_currencies')
        .update({ balance: newBalance })
        .eq('wallet_id', walletId)
        .eq('currency_code', currencyCode);
      
      if (updateError) throw updateError;
    } else {
      // Create new currency entry if amount is positive
      if (parseFloat(amount) <= 0) {
        throw new Error(`Cannot add negative or zero amount of new currency ${currencyCode}`);
      }
      
      const { error: insertError } = await supabase
        .from('wallet_currencies')
        .insert({
          wallet_id: walletId,
          currency_code: currencyCode,
          balance: parseFloat(amount)
        });
      
      if (insertError) throw insertError;
    }
    
    // Return updated wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, name')
      .eq('id', walletId)
      .single();
    
    if (walletError) throw walletError;
    
    // Get updated balances
    const { data: balances, error: balancesError } = await supabase
      .from('wallet_currencies')
      .select('currency_code, balance')
      .eq('wallet_id', walletId);
    
    if (balancesError) throw balancesError;
    
    // Convert to object format
    const balancesObj = {};
    balances.forEach(balance => {
      balancesObj[balance.currency_code] = balance.balance;
    });
    
    return {
      ...wallet,
      balances: balancesObj
    };
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    throw error;
  }
}

/**
 * Adds funds to a wallet with an auto-validated transaction
 * 
 * @param {string} walletId - ID of the wallet to add funds to
 * @param {string} currencyCode - Currency code to add
 * @param {number} amount - Amount to add
 * @returns {Promise<Object>} - Updated wallet data and transaction record
 */
export async function addFundsToWallet(walletId, currencyCode, amount) {
  try {
    // Get current user for creating the transaction record
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get wallet details to use the name as destination
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('name')
      .eq('id', walletId)
      .single();
      
    if (walletError) {
      throw new Error(`Failed to get wallet information: ${walletError.message}`);
    }
    
    // 1. Create transaction record (auto-validated since manager is doing it)
    const transactionId = generateUUID();
    const timestamp = Date.now(); // Unix timestamp in milliseconds
    
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        type: 'deposit',
        walletid: walletId, // Using walletid instead of wallet_id as per schema
        currency_code: currencyCode,
        amount: Number(amount),
        needs_validation: false, // Auto-validated 
        is_validated: true, // Using is_validated instead of validated as per schema
        validator_id: user.id, // Using validator_id instead of validated_by
        validated_at: timestamp,
        cashier_id: user.id, // Adding cashier_id which is the current user
        createdat: timestamp,
        source: 'wallet_management', // Adding source information
        destination: wallet.name, // Adding the wallet name as destination
        is_custody_to_custody: false // Not a custody to custody transaction
      });
      
      if (txError) throw txError;

      // 2. Update wallet balance
      // Check if currency already exists in wallet
      const { data: existingCurrency } = await supabase
        .from('wallet_currencies')
        .select('balance')
        .eq('wallet_id', walletId)
        .eq('currency_code', currencyCode)
        .single();
      
      if (existingCurrency) {
        // Update existing currency balance
        const { error: updateError } = await supabase
          .from('wallet_currencies')
          .update({
            balance: existingCurrency.balance + Number(amount)
          })
          .eq('wallet_id', walletId)
          .eq('currency_code', currencyCode);
          
        if (updateError) throw updateError;
      } else {
        // Add new currency to wallet
        const { error: insertError } = await supabase
          .from('wallet_currencies')
          .insert({
            wallet_id: walletId,
            currency_code: currencyCode,
            balance: Number(amount)
          });
          
        if (insertError) throw insertError;
      }
    
    // Get updated wallet with new balance
    const updatedWallet = await getWalletById(walletId);    return {
      wallet: updatedWallet,
      success: true,
      message: `Successfully added ${amount} ${currencyCode} to wallet`
    };
  } catch (error) {
    console.error('Error adding funds to wallet:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while adding funds to the wallet'
    };
  }
}

/**
 * Get list of transactions for a specific wallet
 * 
 * @param {string} walletId - ID of the wallet to get transactions for
 * @param {Object} options - Optional parameters like limit, offset, etc.
 * @returns {Promise<Object>} - List of transactions
 */
export async function getWalletTransactions(walletId, options = {}) {
  try {
    const { limit = 10, offset = 0, sortBy = 'created_at', sortDir = 'desc' } = options;
    
    const query = supabase
      .from('transactions')
      .select(`
        *,
        created_by(id, name, email),
        validated_by(id, name, email)
      `)
      .eq('wallet_id', walletId)
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      transactions: data || [],
      count,
      success: true
    };
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while getting wallet transactions'
    };
  }
}

export default {
  addFundsToWallet,
  getWalletTransactions,
  getAllWallets,
  updateWalletBalance
};