/**
 * Wallet Custody Helpers
 * 
 * This module provides helper functions for integrating wallet and custody data
 */

import supabase, { handleApiError } from '../client';

/**
 * Get custody totals by wallet
 * 
 * @returns {Promise<Object>} - Object with wallet IDs as keys and custody totals as values
 */
export async function getCustodyTotalsByWallet() {
  try {
    console.log('Wallet Custody Helpers: Fetching custody totals by wallet...');
    
    // Get all active custody records (not returned)
    const { data: custodyRecords, error } = await supabase
      .from('cash_custody')
      .select('wallet_id, currency_code, amount')
      .eq('is_returned', false)
      .eq('status', 'approved');
      
    if (error) {
      console.error('Wallet Custody Helpers: Error fetching custody records:', error);
      throw error;
    }
    
    if (!custodyRecords || custodyRecords.length === 0) {
      console.log('Wallet Custody Helpers: No custody records found');
      return {};
    }
    
    console.log('Wallet Custody Helpers: Found', custodyRecords.length, 'custody records');
    
    // Group custody records by wallet and currency
    const custodyTotals = {};
    
    custodyRecords.forEach(record => {
      const { wallet_id, currency_code, amount } = record;
      
      if (!custodyTotals[wallet_id]) {
        custodyTotals[wallet_id] = {};
      }
      
      if (!custodyTotals[wallet_id][currency_code]) {
        custodyTotals[wallet_id][currency_code] = 0;
      }
      
      custodyTotals[wallet_id][currency_code] += Number(amount);
    });
    
    return custodyTotals;
  } catch (error) {
    console.error('Wallet Custody Helpers: Error in getCustodyTotalsByWallet:', error);
    return {};
  }
}

/**
 * Get all cashier custodies for dropdown selection
 * 
 * @returns {Promise<Array>} - Array of custody records with user and wallet info
 */
export async function getCashierCustodiesForSelection() {
  try {
    console.log('Wallet Custody Helpers: Fetching cashier custodies for selection...');
    
    // Get active custody records with user and wallet info
    const { data: custodyRecords, error } = await supabase
      .from('cash_custody')
      .select('id, cashier_id, wallet_id, currency_code, amount')
      .eq('is_returned', false)
      .eq('status', 'approved');
      
    if (error) {
      console.error('Wallet Custody Helpers: Error fetching cashier custodies:', error);
      throw error;
    }
    
    return custodyRecords || [];
  } catch (error) {
    console.error('Wallet Custody Helpers: Error in getCashierCustodiesForSelection:', error);
    return [];
  }
}

/**
 * Check if user is a treasurer
 *
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if user is a treasurer
 */
export async function isUserTreasurer(userId) {
  try {
    // Check if user has treasurer role in user_roles table
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'treasurer')
      .maybeSingle();
      
    if (error) {
      console.error('Wallet Custody Helpers: Error checking if user is treasurer:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Wallet Custody Helpers: Error in isUserTreasurer:', error);
    return false;
  }
}

/**
 * Create treasury wallet for a treasurer
 *
 * @param {string} treasurerId - Treasurer user ID
 * @returns {Promise<Object>} - Created wallet object
 */
export async function createTreasuryWallet(treasurerId) {
  try {
    console.log('Wallet Custody Helpers: Creating treasury wallet for user:', treasurerId);
    
    // Generate a UUID for the wallet
    const walletId = generateUUID();
    
    // Create the treasury wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        id: walletId,
        name: 'Treasury',
        user_id: treasurerId,
        is_treasury: true
      })
      .select()
      .single();
      
    if (error) {
      console.error('Wallet Custody Helpers: Error creating treasury wallet:', error);
      throw error;
    }
    
    console.log('Wallet Custody Helpers: Treasury wallet created:', wallet);
    return wallet;
  } catch (error) {
    console.error('Wallet Custody Helpers: Error in createTreasuryWallet:', error);
    throw error;
  }
}

// Import this at the top of the file
import { generateUUID } from '../../uuid';