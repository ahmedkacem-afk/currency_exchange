/**
 * Debt Management API
 * 
 * This module handles all database operations related to debt management
 */

import supabase, { handleApiError } from '../client'
import { generateUUID } from '../../uuid'
import { getWalletById, updateWalletCurrencyBalance } from './wallets'

/**
 * Gets all debts for the current user
 * 
 * @returns {Promise<Object>} - Object containing owed and receivable debts
 */
export async function getAllDebts() {
  try {
    console.log('Debt API: Fetching all debts...');
    
    // Get user ID from session - handle potential errors more gracefully
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Debt API: No authenticated user found in getAllDebts');
      throw new Error('User not authenticated');
    }
    
    console.log('Debt API: Fetching debts for user ID:', user.id);
    
    // Get both types of debts in parallel
    const [owedResponse, receivableResponse] = await Promise.all([
      // Debts the user owes to others (user is the debtor)
      supabase
        .from('debts')
        .select('*')
        .eq('debtor_id', user.id)
        .order('created_at', { ascending: false }),
      
      // Debts others owe to the user (user is the creditor)
      supabase
        .from('debts')
        .select('*')
        .eq('creditor_id', user.id)
        .order('created_at', { ascending: false })
    ]);
    
    // Check for errors
    if (owedResponse.error) throw owedResponse.error;
    if (receivableResponse.error) throw receivableResponse.error;
    
    console.log(`Debt API: Found ${owedResponse.data.length} debts owed and ${receivableResponse.data.length} debts receivable`);
    
    return {
      owed: owedResponse.data || [],
      receivable: receivableResponse.data || []
    };
  } catch (error) {
    console.error('Debt API: Error in getAllDebts:', error);
    throw handleApiError(error, 'Get All Debts');
  }
}

/**
 * Gets summary of debts for the current user
 * 
 * @returns {Promise<Object>} - Object containing total amounts owed and receivable
 */
export async function getDebtSummary() {
  try {
    const allDebts = await getAllDebts();
    
    // Calculate totals by currency
    const totals = {
      owed: {},      // Group by currency code
      receivable: {} // Group by currency code
    };
    
    // Process owed debts - only include unpaid debts
    allDebts.owed.forEach(debt => {
      // Skip paid debts
      if (debt.is_paid) return;
      
      const { currency_code, amount } = debt;
      if (!totals.owed[currency_code]) {
        totals.owed[currency_code] = 0;
      }
      totals.owed[currency_code] += Number(amount);
    });
    
    // Process receivable debts - only include unpaid debts
    allDebts.receivable.forEach(debt => {
      // Skip paid debts
      if (debt.is_paid) return;
      
      const { currency_code, amount } = debt;
      if (!totals.receivable[currency_code]) {
        totals.receivable[currency_code] = 0;
      }
      totals.receivable[currency_code] += Number(amount);
    });
    
    // Count only unpaid debts
    const unpaidOwedCount = allDebts.owed.filter(debt => !debt.is_paid).length;
    const unpaidReceivableCount = allDebts.receivable.filter(debt => !debt.is_paid).length;
    
    return {
      totalOwed: totals.owed,
      totalReceivable: totals.receivable,
      countOwed: unpaidOwedCount,
      countReceivable: unpaidReceivableCount
    };
  } catch (error) {
    console.error('Debt API: Error in getDebtSummary:', error);
    throw handleApiError(error, 'Get Debt Summary');
  }
}

/**
 * Creates a new debt record
 * 
 * @param {Object} debtData - Debt data
 * @param {string} debtData.personName - Name of the other person
 * @param {string} debtData.walletId - ID of the wallet involved
 * @param {string} debtData.currencyCode - Currency code
 * @param {number} debtData.amount - Amount of debt
 * @param {string} debtData.notes - Optional notes
 * @param {boolean} debtData.isOwed - Whether this is a debt the user owes (true) or is owed to them (false)
 * @returns {Promise<Object>} - Created debt record
 */
export async function createDebt(debtData) {
  try {
    const { personName, walletId, currencyCode, amount, notes, isOwed } = debtData;
    
    // Validate input
    if (!personName) throw new Error('Person name is required');
    if (!walletId) throw new Error('Wallet is required');
    if (!currencyCode) throw new Error('Currency is required');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error('Valid amount is required');
    }
    
    // Get user from session - handle potential errors more gracefully
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Debt API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    console.log('Debt API: Creating debt for user ID:', user.id);
    
    // Get the wallet to verify it exists
    const wallet = await getWalletById(walletId);
    if (!wallet) throw new Error('Wallet not found');
    
    // If this is a debt owed to the user (receivable), we need to check the wallet balance
    if (!isOwed) {
      // Check if wallet has enough balance
      const currentBalance = wallet.currencies?.[currencyCode] || 0;
      if (currentBalance < Number(amount)) {
        throw new Error(`Insufficient balance in wallet. Available: ${currentBalance} ${currencyCode}`);
      }
    }
    
    // Create unique ID for this debt
    const debtId = generateUUID();
    
    // Set up the debt record based on type
    const debtRecord = {
      id: debtId,
      wallet_id: walletId,
      currency_code: currencyCode,
      amount: Number(amount),
      notes: notes || null,
      person_name: personName,
      created_at: new Date().toISOString(),
      is_paid: false
    };
    
    // Set debtor/creditor based on whether this is debt the user owes or is owed
    if (isOwed) {
      // User owes someone else (user is debtor)
      debtRecord.debtor_id = user.id;
      debtRecord.creditor_id = null; // External person
      
      // Update wallet balance (decrease)
      await updateWalletCurrencyBalance(
        walletId,
        currencyCode,
        wallet.currencies[currencyCode] - Number(amount)
      );
    } else {
      // Someone owes the user (user is creditor)
      debtRecord.creditor_id = user.id;
      debtRecord.debtor_id = null; // External person
      
      // Update wallet balance (increase)
      await updateWalletCurrencyBalance(
        walletId,
        currencyCode,
        wallet.currencies[currencyCode] + Number(amount)
      );
    }
    
    // Insert the debt record
    const { data, error } = await supabase
      .from('debts')
      .insert(debtRecord)
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Debt API: Created new debt record:', data);
    return data;
  } catch (error) {
    console.error('Debt API: Error in createDebt:', error);
    throw handleApiError(error, 'Create Debt');
  }
}

/**
 * Marks a debt as paid
 * 
 * @param {string} debtId - ID of the debt to mark as paid
 * @returns {Promise<Object>} - Updated debt record
 */
export async function markDebtAsPaid(debtId) {
  try {
    // Get the debt record first
    const { data: debt, error: fetchError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .single();
      
    if (fetchError) throw fetchError;
    if (!debt) throw new Error('Debt not found');
    
    // Update the debt record to mark it as paid
    const { data, error } = await supabase
      .from('debts')
      .update({ is_paid: true })
      .eq('id', debtId)
      .select()
      .single();
      
    if (error) throw error;
    
    // Get user from session properly
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    
    // Adjust wallet balance based on debt type
    if (debt.debtor_id === user.id) {
      // This was a debt the user owed - increase their wallet balance
      const wallet = await getWalletById(debt.wallet_id);
      const currentBalance = wallet.currencies[debt.currency_code] || 0;
      
      await updateWalletCurrencyBalance(
        debt.wallet_id,
        debt.currency_code,
        currentBalance + Number(debt.amount)
      );
    } else if (debt.creditor_id === user.id) {
      // This was a debt someone owed the user - decrease their wallet balance
      const wallet = await getWalletById(debt.wallet_id);
      const currentBalance = wallet.currencies[debt.currency_code] || 0;
      
      await updateWalletCurrencyBalance(
        debt.wallet_id,
        debt.currency_code,
        currentBalance - Number(debt.amount)
      );
    }
    
    console.log('Debt API: Marked debt as paid:', data);
    return data;
  } catch (error) {
    console.error('Debt API: Error in markDebtAsPaid:', error);
    throw handleApiError(error, 'Mark Debt as Paid');
  }
}

/**
 * Deletes a debt record
 * 
 * @param {string} debtId - ID of the debt to delete
 * @returns {Promise<void>}
 */
export async function deleteDebt(debtId) {
  try {
    // Get the debt record first to reverse wallet adjustments
    const { data: debt, error: fetchError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .single();
      
    if (fetchError) throw fetchError;
    if (!debt) throw new Error('Debt not found');
    
    // Get user from session properly
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    
    // Adjust wallet balance to reverse the effect of this debt
    if (debt.debtor_id === user.id && !debt.is_paid) {
      // This was an unpaid debt the user owed - increase their wallet balance
      const wallet = await getWalletById(debt.wallet_id);
      const currentBalance = wallet.currencies[debt.currency_code] || 0;
      
      await updateWalletCurrencyBalance(
        debt.wallet_id,
        debt.currency_code,
        currentBalance + Number(debt.amount)
      );
    } else if (debt.creditor_id === user.id && !debt.is_paid) {
      // This was an unpaid debt someone owed the user - decrease their wallet balance
      const wallet = await getWalletById(debt.wallet_id);
      const currentBalance = wallet.currencies[debt.currency_code] || 0;
      
      await updateWalletCurrencyBalance(
        debt.wallet_id,
        debt.currency_code,
        currentBalance - Number(debt.amount)
      );
    }
    
    // Delete the debt record
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId);
      
    if (error) throw error;
    
    console.log('Debt API: Deleted debt record:', debtId);
  } catch (error) {
    console.error('Debt API: Error in deleteDebt:', error);
    throw handleApiError(error, 'Delete Debt');
  }
}

export default {
  getAllDebts,
  getDebtSummary,
  createDebt,
  markDebtAsPaid,
  deleteDebt
}