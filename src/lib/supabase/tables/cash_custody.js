/**
 * Cash Custody API
 * 
 * This module handles all database operations related to cash custody management
 */

import supabase, { handleApiError, sanitizeJsonData } from '../client'
import { generateUUID } from '../../uuid'
import { getWalletById, updateWalletCurrencyBalance } from './wallets'

/**
 * Get all cash custody records for the current user
 * 
 * @returns {Promise<Object>} - Object containing given and received custody records
 */
export async function getAllCashCustody() {
  try {
    console.log('Cash Custody API: Fetching all custody records...');
    
    // Get user ID from session - handle potential errors more gracefully
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Cash Custody API: No authenticated user found in getAllCashCustody');
      throw new Error('User not authenticated');
    }
    
    console.log('Cash Custody API: Fetching custody records for user ID:', user.id);
    
    // Get both types of custody records in parallel
    const [givenResponse, receivedResponse] = await Promise.all([
      // Custody given to cashiers (user is the treasurer)
      supabase
        .from('cash_custody')
        .select('*')
        .eq('treasurer_id', user.id)
        .order('created_at', { ascending: false }),
      
      // Custody received from treasurer (user is the cashier)
      supabase
        .from('cash_custody')
        .select('*')
        .eq('cashier_id', user.id)
        .order('created_at', { ascending: false })
    ]);
    
    // Check for errors
    if (givenResponse.error) throw givenResponse.error;
    if (receivedResponse.error) throw receivedResponse.error;
    
    // Add placeholder user and wallet data (since we can't access the profiles table)
    const enhancedGivenRecords = givenResponse.data?.map(record => ({
      ...record,
      treasurer: { id: record.treasurer_id, name: `Treasurer ${record.treasurer_id.substring(0, 6)}` },
      cashier: { id: record.cashier_id, name: `Cashier ${record.cashier_id.substring(0, 6)}` },
      wallet: { id: record.wallet_id, name: `Wallet ${record.wallet_id.substring(0, 6)}` }
    })) || [];
    
    const enhancedReceivedRecords = receivedResponse.data?.map(record => ({
      ...record,
      treasurer: { id: record.treasurer_id, name: `Treasurer ${record.treasurer_id.substring(0, 6)}` },
      cashier: { id: record.cashier_id, name: `Cashier ${record.cashier_id.substring(0, 6)}` },
      wallet: { id: record.wallet_id, name: `Wallet ${record.wallet_id.substring(0, 6)}` }
    })) || [];
    
    return {
      given: enhancedGivenRecords,
      received: enhancedReceivedRecords
    };
  } catch (error) {
    console.error('Cash Custody API: Error in getAllCashCustody:', error);
    throw handleApiError(error, 'Get All Cash Custody');
  }
}

/**
 * Update the status of a cash custody record
 * 
 * @param {string} custodyId - ID of the custody record
 * @param {string} status - New status (approved, rejected, returned)
 * @returns {Promise<Object>} - Updated custody record
 */
export async function updateCustodyStatus(custodyId, status) {
  try {
    console.log(`Cash Custody API: Updating custody status to ${status}`);
    
    if (!custodyId) throw new Error('Custody ID is required');
    if (!['approved', 'rejected', 'returned'].includes(status)) {
      throw new Error('Invalid status: must be approved, rejected, or returned');
    }
    
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Cash Custody API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    // Update the status
    const { data, error } = await supabase
      .from('cash_custody')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', custodyId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Cash Custody API: Error in updateCustodyStatus:', error);
    throw handleApiError(error, 'Update Custody Status');
  }
}

/**
 * Get cashiers list
 * 
 * @returns {Promise<Array>} - List of cashiers
 */
export async function getCashiers() {
  try {
    console.log('Cash Custody API: Fetching cashiers...');
    
    // Get all users with the cashier role from the users table
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, role_id')
      .order('name');
    
    if (error) {
      console.error('Cash Custody API: Error fetching users:', error);
      throw error;
    }
    
    // Filter users who have the cashier role
    // First, try to get cashier role ID if available
    let cashierRoleId = null;
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'cashier')
        .single();
        
      if (!roleError && roleData) {
        cashierRoleId = roleData.id;
      }
    } catch (e) {
      console.warn('Cash Custody API: Could not get cashier role ID:', e);
    }
    
    // Filter users with cashier role (check both direct role and role_id)
    const cashiers = data.filter(user => 
      (user.role && user.role.toLowerCase() === 'cashier') || 
      (cashierRoleId && user.role_id === cashierRoleId)
    );
    
    console.log(`Cash Custody API: Found ${cashiers.length} cashiers`);
    return cashiers;
  } catch (error) {
    console.error('Cash Custody API: Error in getCashiers:', error);
    throw handleApiError(error, 'Get Cashiers');
  }
}

/**
 * Give cash custody to a cashier
 * 
 * @param {Object} data - Custody data
 * @returns {Promise<Object>} - Created custody record
 */
/**
 * Get treasurers list
 * 
 * @returns {Promise<Array>} - List of treasurers
 */
export async function getTreasurers() {
  try {
    console.log('Cash Custody API: Fetching treasurers...');
    
    // Get all users with the treasurer role from the users table
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, role_id')
      .order('name');
    
    if (error) {
      console.error('Cash Custody API: Error fetching users:', error);
      throw error;
    }
    
    // Filter users who have the treasurer role
    // First, try to get treasurer role ID if available
    let treasurerRoleId = null;
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'treasurer')
        .single();
        
      if (!roleError && roleData) {
        treasurerRoleId = roleData.id;
      }
    } catch (e) {
      console.warn('Cash Custody API: Could not get treasurer role ID:', e);
    }
    
    // Filter users with treasurer role (check both direct role and role_id)
    const treasurers = data.filter(user => 
      (user.role && user.role.toLowerCase() === 'treasurer') || 
      (treasurerRoleId && user.role_id === treasurerRoleId)
    );
    
    console.log(`Cash Custody API: Found ${treasurers.length} treasurers`);
    return treasurers;
  } catch (error) {
    console.error('Cash Custody API: Error in getTreasurers:', error);
    throw handleApiError(error, 'Get Treasurers');
  }
}

export async function giveCashCustody(data) {
  try {
    console.log('Cash Custody API: Giving custody with data:', data);
    
    const { cashierId, walletId, currencyCode, amount, notes = '' } = data;
    
    if (!cashierId) {
      throw new Error('Cashier ID is required');
    }
    
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    
    if (!currencyCode) {
      throw new Error('Currency code is required');
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error('Valid amount is required');
    }
    
    // Get user from session - handle potential errors more gracefully
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Cash Custody API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    console.log('Cash Custody API: Giving custody for user ID:', user.id);
    
    // Get the wallet to verify it exists and has sufficient funds
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    // Check if the wallet has sufficient funds
    const walletCurrencies = wallet.currencies || {};
    const currencyBalance = walletCurrencies[currencyCode] || 0;
    
    console.log('Cash Custody API: Checking wallet balance:', { walletCurrencies, currencyCode, currencyBalance, requiredAmount: amount });
    
    if (Number(currencyBalance) < Number(amount)) {
      throw new Error(`Insufficient funds: Wallet has ${currencyBalance} ${currencyCode}, but ${amount} ${currencyCode} is required`);
    }
    
    // Prepare the custody record
    const custodyId = generateUUID();
    const custodyRecord = {
      id: custodyId,
      treasurer_id: user.id,
      cashier_id: cashierId,
      wallet_id: walletId,
      currency_code: currencyCode,
      amount: Number(amount),
      notes,
      status: 'pending', // All new custody records start as pending
      is_returned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the custody record
    const { data: insertedRecord, error: insertError } = await supabase
      .from('cash_custody')
      .insert(custodyRecord)
      .select('*')
      .single();
      
    if (insertError) {
      console.error('Cash Custody API: Error inserting cash_custody record:', insertError);
      throw insertError;
    }
    
    // Check if the cashier already has a custody record for this currency
    const { data: existingCustody, error: custodyCheckError } = await supabase
      .from('custody')
      .select('id, amount')
      .eq('user_id', cashierId)
      .eq('currency_code', currencyCode)
      .maybeSingle();
    
    if (custodyCheckError) {
      console.error('Cash Custody API: Error checking existing custody:', custodyCheckError);
      // Continue since this is not critical to the main flow
    }
    
    if (existingCustody) {
      // Update existing custody record
      console.log('Cash Custody API: Updating existing custody record for cashier');
      const newAmount = Number(existingCustody.amount) + Number(amount);
      
      const { error: updateError } = await supabase
        .from('custody')
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq('id', existingCustody.id);
      
      if (updateError) {
        console.error('Cash Custody API: Error updating cashier custody record:', updateError);
        // Continue since the cash_custody record was created successfully
      }
    } else {
      // Create a new custody record for the cashier
      console.log('Cash Custody API: Creating new custody record for cashier');
      
      const { error: createCustodyError } = await supabase
        .from('custody')
        .insert({
          user_id: cashierId,
          currency_code: currencyCode,
          amount: Number(amount)
        });
      
      if (createCustodyError) {
        console.error('Cash Custody API: Error creating cashier custody record:', createCustodyError);
        // Continue since the cash_custody record was created successfully
      }
    }
    
    // Note: In a real application, you might want to:
    // 1. Create a notification for the cashier
    // 2. Update the wallet balance (but only after the cashier approves the custody)
    
    return insertedRecord;
  } catch (error) {
    console.error('Cash Custody API: Error in giveCashCustody:', error);
    throw handleApiError(error, 'Give Cash Custody');
  }
}

/**
 * Get a single cash custody record by ID
 * 
 * @param {string} custodyId - ID of the custody record to fetch
 * @returns {Promise<Object>} - Custody record
 */
export async function getCashCustody(custodyId) {
  try {
    console.log('Cash Custody API: Fetching custody record:', custodyId);
    
    const { data, error } = await supabase
      .from('cash_custody')
      .select('*')
      .eq('id', custodyId)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Cash Custody API: Error in getCashCustody:', error);
    throw handleApiError(error, 'Get Cash Custody');
  }
}
