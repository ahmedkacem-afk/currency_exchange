/**
 * Transactions API
 * 
 * This module handles all database operations related to transactions
 */

import supabase, { handleApiError } from '../client'
import { generateUUID } from '../../uuid'
import { getWalletById, updateWallet } from './wallets'

/**
 * Gets recent transactions
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} - Transaction results
 */
export async function getRecentTransactions({ limit = 30, offset = 0 } = {}) {
  try {
    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      
    if (error) throw error
    
    return {
      transactions: data,
      total: count || 0
    }
  } catch (error) {
    throw handleApiError(error, 'Get Recent Transactions')
  }
}

/**
 * Gets transactions for a specific wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} - Transaction results
 */
export async function getTransactionsByWallet(walletId, { limit = 30, offset = 0 } = {}) {
  try {
    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('walletid', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      
    if (error) throw error
    
    return {
      transactions: data,
      total: count || 0
    }
  } catch (error) {
    throw handleApiError(error, 'Get Wallet Transactions')
  }
}

/**
 * Creates a buy transaction
 * 
 * @param {Object} transactionData - Transaction data
 * @param {string} transactionData.walletId - Wallet ID
 * @param {number} transactionData.usdAmount - USD amount
 * @param {number} transactionData.lydAmount - LYD amount
 * @param {number} transactionData.dinarPrice - Dinar price
 * @returns {Promise<Object>} - Transaction result
 */
export async function createBuyTransaction({ walletId, usdAmount, lydAmount, dinarPrice }) {
  try {
    // Get the wallet to update its balance
    const wallet = await getWalletById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    // Update the wallet balances
    const updatedWallet = await updateWallet(walletId, {
      usd: Number(wallet.usd) - Number(usdAmount),
      lyd: Number(wallet.lyd) + Number(lydAmount)
    })
    
    // Create the transaction record
    const transactionData = {
      id: generateUUID(),
      type: 'buy',
      walletid: walletId,
      usdamount: usdAmount,
      lydamount: lydAmount,
      dinarprice: dinarPrice
    }
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single()
      
    if (error) throw error
    
    return {
      transaction,
      wallet: updatedWallet
    }
  } catch (error) {
    throw handleApiError(error, 'Create Buy Transaction')
  }
}

/**
 * Creates a sell transaction
 * 
 * @param {Object} transactionData - Transaction data
 * @param {string} transactionData.walletId - Wallet ID
 * @param {number} transactionData.usdAmount - USD amount
 * @param {number} transactionData.lydAmount - LYD amount
 * @param {number} transactionData.dinarPrice - Dinar price
 * @returns {Promise<Object>} - Transaction result
 */
export async function createSellTransaction({ walletId, usdAmount, lydAmount, dinarPrice }) {
  try {
    // Get the wallet to update its balance
    const wallet = await getWalletById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    // Update the wallet balances
    const updatedWallet = await updateWallet(walletId, {
      usd: Number(wallet.usd) + Number(usdAmount),
      lyd: Number(wallet.lyd) - Number(lydAmount)
    })
    
    // Create the transaction record
    const transactionData = {
      id: generateUUID(),
      type: 'sell',
      walletid: walletId,
      usdamount: usdAmount,
      lydamount: lydAmount,
      dinarprice: dinarPrice
    }
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single()
      
    if (error) throw error
    
    return {
      transaction,
      wallet: updatedWallet
    }
  } catch (error) {
    throw handleApiError(error, 'Create Sell Transaction')
  }
}

/**
 * Gets transaction statistics
 * 
 * @returns {Promise<Object>} - Statistics
 */
export async function getTransactionStats() {
  try {
    // Get recent transactions
    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('type, dinarprice')
      .order('created_at', { ascending: false })
      .limit(30)
      
    if (txError) throw txError
    
    // Calculate buy and sell averages
    const buys = recentTx.filter(tx => tx.type === 'buy')
    const sells = recentTx.filter(tx => tx.type === 'sell')
    
    const buyAverage = buys.length > 0
      ? buys.reduce((sum, tx) => sum + Number(tx.dinarprice), 0) / buys.length
      : null
      
    const sellAverage = sells.length > 0
      ? sells.reduce((sum, tx) => sum + Number(tx.dinarprice), 0) / sells.length
      : null
    
    return {
      buyAverage,
      sellAverage,
      recentTransactions: recentTx
    }
  } catch (error) {
    throw handleApiError(error, 'Get Transaction Stats')
  }
}

export default {
  getRecentTransactions,
  getTransactionsByWallet,
  createBuyTransaction,
  createSellTransaction,
  getTransactionStats
}