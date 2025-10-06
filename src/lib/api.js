// This file is kept for backward compatibility
// All API functions now point to the Supabase implementations

import { 
  signIn as supabaseLogin,
  signOut as supabaseLogout
} from './supabase/auth'

import {
  getWalletsSummary,
  getWallets as getWalletsFromSupabase,
  getWalletStats as getWalletStatsFromSupabase,
  addCurrencyToWallet as addCurrencyToWalletInSupabase
} from './supabase/tables/wallets'

import {
  getManagerPrices as getPricesFromSupabase,
  updateManagerPrices as setPricesInSupabase
} from './supabase/tables/manager_prices'

import {
  getAllCurrencyTypes as getAllCurrencyTypesFromSupabase,
  createCurrencyType as createCurrencyTypeInSupabase,
  updateCurrencyType as updateCurrencyTypeInSupabase,
  deleteCurrencyType as deleteCurrencyTypeInSupabase
} from './supabase/tables/currency_types'

import {
  getAllDebts as getAllDebtsFromSupabase,
  getDebtSummary as getDebtSummaryFromSupabase,
  createDebt as createDebtInSupabase,
  markDebtAsPaid as markDebtAsPaidInSupabase,
  deleteDebt as deleteDebtInSupabase
} from './supabase/tables/debts'

import {
  getAllCashCustody as getAllCashCustodyFromSupabase,
  giveCashCustody as giveCashCustodyInSupabase,
  getCashCustody as getCashCustodyInSupabase,
  getCashiers as getCashiersFromSupabase,
  updateCustodyStatus as updateCustodyStatusInSupabase
} from './supabase/tables/cash_custody'

import {
  getAllRoles as getAllRolesFromSupabase,
  getRoleById as getRoleByIdFromSupabase,
  getRoleByName as getRoleByNameFromSupabase,
  assignRoleToUser as assignRoleToUserInSupabase,
  getUserRole as getUserRoleFromSupabase,
  hasAnyRole as hasAnyRoleFromSupabase
} from './supabase/tables/roles'

/**
 * Login with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Login result with token and user
 */
export async function login(email, password) {
  console.log('API: Logging in with Supabase');
  return await supabaseLogin({ email, password });
}

/**
 * Get wallet summary
 * 
 * @returns {Promise<Object>} - Summary data
 */
export async function getSummary() {
  console.log('API: Getting summary from Supabase');
  
  // Get both wallet summary and debt summary in parallel
  const [walletSummary, debtSummary] = await Promise.all([
    getWalletsSummary(),
    getDebtSummaryFromSupabase().catch(err => {
      console.warn('Failed to get debt summary, continuing with wallet summary only:', err);
      return null;
    })
  ]);
  
  // Combine the summaries if debt summary was retrieved
  if (debtSummary) {
    return {
      ...walletSummary,
      debtSummary
    };
  }
  
  return walletSummary;
}

/**
 * Get all wallets
 * 
 * @returns {Promise<Object>} - Object with wallets array
 */
export async function getWallets() {
  console.log('API: Getting wallets from Supabase');
  return await getWalletsFromSupabase();
}

/**
 * Get all wallet statistics
 * @deprecated This is no longer supported. Use per-wallet stats instead.
 * @returns {Promise<Object>} - Stats object
 */
export async function getAllStats() {
  console.log('API: getAllStats is deprecated, returning empty object');
  return {};
}

/**
 * Get wallet statistics
 * 
 * @param {string} walletId - Wallet ID
 * @returns {Promise<Object>} - Stats object
 */
export async function getWalletStats(walletId) {
  console.log(`API: Getting wallet stats for ${walletId} from Supabase`);
  return await getWalletStatsFromSupabase(walletId);
}

/**
 * Get manager prices
 * 
 * @returns {Promise<Object>} - Prices object
 */
export async function getPrices() {
  console.log('API: Getting prices from Supabase');
  const result = await getPricesFromSupabase();
  
  // Return the lowercase field names directly from the database
  return {
    sellold: result.sellold || 5.5,
    sellnew: result.sellnew || 5.5,
    buyold: result.buyold || 5.0,
    buynew: result.buynew || 5.0,
    // Add these for backward compatibility with code using buyprice/sellprice
    buyprice: result.buyold || 5.0,
    sellprice: result.sellold || 5.5
  };
}

/**
 * Set manager prices
 * 
 * @param {Object} payload - Prices data
 * @returns {Promise<Object>} - Updated prices
 */
export async function setPrices(payload) {
  console.log('API: Setting prices in Supabase', payload);
  // Convert old payload format to new format
  const formattedPayload = {
    buyPrice: payload.buyold !== undefined ? Number(payload.buyold) : 
              payload.buynew !== undefined ? Number(payload.buynew) : 
              payload.buyprice !== undefined ? Number(payload.buyprice) : 5.0,
    
    sellPrice: payload.sellold !== undefined ? Number(payload.sellold) : 
               payload.sellnew !== undefined ? Number(payload.sellnew) : 
               payload.sellprice !== undefined ? Number(payload.sellprice) : 5.5
  };
  
  console.log('API: Formatted prices for manager_prices.js:', formattedPayload);
  
  const result = await setPricesInSupabase(formattedPayload);
  
  // Return the values from the database with the correct lowercase field names
  return {
    sellold: result.sellold || formattedPayload.sellPrice,
    sellnew: result.sellnew || formattedPayload.sellPrice,
    buyold: result.buyold || formattedPayload.buyPrice,
    buynew: result.buynew || formattedPayload.buyPrice,
    // Add these for backward compatibility with code using buyprice/sellprice
    buyprice: result.buyold || formattedPayload.buyPrice,
    sellprice: result.sellold || formattedPayload.sellPrice
  };
}

export async function withdraw(walletId, payload) {
  console.log('API: withdraw() is deprecated, use withdrawCurrency() instead');
  return withdrawCurrency(walletId, payload.currencyCode, payload.amount, payload.reason);
}

export async function withdrawCurrency(walletId, currencyCode, amount, reason) {
  console.log('API: Withdrawing currency from Supabase', { walletId, currencyCode, amount, reason });
  // Import function dynamically to avoid circular dependencies
  const { withdrawCurrency: supabaseWithdrawCurrency } = await import('./supabase/tables/wallets');
  return supabaseWithdrawCurrency(walletId, currencyCode, amount, reason);
}

export async function exportPdf(payload) {
  console.log('API: PDF export is not currently implemented with Supabase');
  // Create a dummy PDF with a message
  const message = 'PDF export is not implemented yet with Supabase';
  
  // Create a simple text blob as placeholder
  const blob = new Blob([message], { type: 'text/plain' });
  return blob;
}

/**
 * Create a new wallet
 * 
 * @param {Object} payload - Wallet data
 * @returns {Promise<Object>} The created wallet
 */
export async function createWallet(payload) {
  console.log('API: Creating wallet in Supabase', payload);
  // Import function dynamically to avoid circular dependencies
  const { createWallet: createWalletInSupabase } = await import('./supabaseApi');
  return await createWalletInSupabase(payload);
}

/**
 * Create a new user
 * 
 * @param {Object} payload - User data
 * @returns {Promise<Object>} The created user
 */
export async function createUser(payload) {
  console.log('API: Creating user in Supabase', payload);
  // Import function dynamically to avoid circular dependencies
  const { createUser: createUserInSupabase } = await import('./supabaseApi');
  return await createUserInSupabase(payload);
}

/**
 * Create a new operation
 * 
 * @param {Object} payload - Operation data
 * @returns {Promise<Object>} The created operation
 */
export async function createOperation(payload) {
  console.log('API: Creating operation in Supabase', payload);
  // Import function dynamically to avoid circular dependencies
  const { createOperation: createOperationInSupabase } = await import('./supabaseApi');
  return await createOperationInSupabase(payload);
}

/**
 * Get all currency types
 * 
 * @returns {Promise<Array>} List of all currency types
 */
export async function getAllCurrencyTypes() {
  console.log('API: Getting all currency types from Supabase');
  return await getAllCurrencyTypesFromSupabase();
}

/**
 * Create a new currency type
 * 
 * @param {Object} currencyType - The currency type to create
 * @returns {Promise<Object>} The created currency type
 */
export async function createCurrencyType(currencyType) {
  console.log('API: Creating currency type in Supabase', currencyType);
  return await createCurrencyTypeInSupabase(currencyType);
}

/**
 * Update a currency type
 * 
 * @param {string} code - Currency code to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} The updated currency type
 */
export async function updateCurrencyType(code, updates) {
  console.log('API: Updating currency type in Supabase', { code, updates });
  return await updateCurrencyTypeInSupabase(code, updates);
}

/**
 * Get all debts for the current user
 * 
 * @returns {Promise<Object>} Object with owed and receivable debts
 */
export async function getAllDebts() {
  console.log('API: Getting all debts from Supabase');
  return await getAllDebtsFromSupabase();
}

/**
 * Get debt summary for the current user
 * 
 * @returns {Promise<Object>} Summary of debt amounts
 */
export async function getDebtSummary() {
  console.log('API: Getting debt summary from Supabase');
  return await getDebtSummaryFromSupabase();
}

/**
 * Create a new debt record
 * 
 * @param {Object} debtData - Debt details
 * @returns {Promise<Object>} The created debt
 */
export async function createDebt(debtData) {
  console.log('API: Creating debt record in Supabase', { debtData });
  return await createDebtInSupabase(debtData);
}

/**
 * Mark a debt as paid
 * 
 * @param {string} debtId - ID of the debt
 * @returns {Promise<Object>} The updated debt
 */
export async function markDebtAsPaid(debtId) {
  console.log('API: Marking debt as paid in Supabase', { debtId });
  return await markDebtAsPaidInSupabase(debtId);
}

/**
 * Delete a debt record
 * 
 * @param {string} debtId - ID of the debt to delete
 * @returns {Promise<void>}
 */
export async function deleteDebt(debtId) {
  console.log('API: Deleting debt record from Supabase', { debtId });
  return await deleteDebtInSupabase(debtId);
}

/**
 * Delete a currency type
 * 
 * @param {string} code - Currency code to delete
 * @returns {Promise<void>}
 */
export async function deleteCurrencyType(code) {
  console.log('API: Deleting currency type from Supabase', code);
  return await deleteCurrencyTypeInSupabase(code);
}

/**
 * Add a currency to a wallet
 * 
 * @param {string} walletId - ID of the wallet
 * @param {string} currencyCode - Currency code to add
 * @param {number} balance - Initial balance
 * @returns {Promise<Object>} Updated wallet
 */
export async function addCurrencyToWallet(walletId, currencyCode, balance) {
  console.log('API: Adding currency to wallet in Supabase', { walletId, currencyCode, balance });
  return await addCurrencyToWalletInSupabase(walletId, currencyCode, balance);
}

/**
 * Get all cash custody records
 * 
 * @returns {Promise<Object>} - Cash custody records
 */
export async function getAllCashCustody() {
  console.log('API: Getting all cash custody records from Supabase');
  return await getAllCashCustodyFromSupabase();
}

/**
 * Give cash custody to a cashier
 * 
 * @param {Object} custodyData - Custody details
 * @returns {Promise<Object>} The created custody record
 */
export async function giveCashCustody(custodyData) {
  console.log('API: Giving cash custody in Supabase', { custodyData });
  return await giveCashCustodyInSupabase(custodyData);
}

/**
 * Get cash custody back from a cashier
 * 
 * @param {Object} custodyData - Custody details
 * @returns {Promise<Object>} The created custody record
 */
export async function getCashCustody(custodyData) {
  console.log('API: Getting cash custody in Supabase', { custodyData });
  return await getCashCustodyInSupabase(custodyData);
}

/**
 * Get list of cashiers
 * 
 * @returns {Promise<Array>} List of cashiers
 */
export async function getCashiers() {
  console.log('API: Getting cashiers from Supabase');
  return await getCashiersFromSupabase();
}

/**
 * Update cash custody status (approve or reject)
 * 
 * @param {string} custodyId - ID of the custody record to update
 * @param {string} status - New status (approved, rejected, returned)
 * @returns {Promise<Object>} - Updated custody record
 */
export async function updateCustodyStatus(custodyId, status) {
  console.log('API: Updating custody status in Supabase', { custodyId, status });
  return await updateCustodyStatusInSupabase(custodyId, status);
}

/**
 * Get all available roles
 * 
 * @returns {Promise<Array>} - List of roles
 */
export async function getAllRoles() {
  console.log('API: Getting all roles from Supabase');
  return await getAllRolesFromSupabase();
}

/**
 * Get role by ID
 * 
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} - Role object
 */
export async function getRoleById(roleId) {
  console.log('API: Getting role by ID from Supabase', { roleId });
  return await getRoleByIdFromSupabase(roleId);
}

/**
 * Get role by name
 * 
 * @param {string} roleName - Role name
 * @returns {Promise<Object>} - Role object
 */
export async function getRoleByName(roleName) {
  console.log('API: Getting role by name from Supabase', { roleName });
  return await getRoleByNameFromSupabase(roleName);
}

/**
 * Assign role to user
 * 
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} - Updated profile
 */
export async function assignRoleToUser(userId, roleId) {
  console.log('API: Assigning role to user in Supabase', { userId, roleId });
  return await assignRoleToUserInSupabase(userId, roleId);
}

/**
 * Get user role
 * 
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} - User role
 */
export async function getUserRole(userId = null) {
  console.log('API: Getting user role from Supabase', { userId });
  return await getUserRoleFromSupabase(userId);
}

/**
 * Check if user has any of the specified roles
 * 
 * @param {Array<string>} roles - Array of role names to check
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<boolean>} - True if user has any of the roles
 */
export async function hasAnyRole(roles = [], userId = null) {
  console.log('API: Checking if user has any role from Supabase', { roles, userId });
  return await hasAnyRoleFromSupabase(roles, userId);
}

