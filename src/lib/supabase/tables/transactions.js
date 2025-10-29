/**
 * Transactions API
 *
 * This module handles all database operations related to transactions
 */

import supabase, { handleApiError } from "../client"
import { generateUUID } from "../../uuid"
import { getWalletById, updateWalletCurrency } from "./wallets"

/**
 * Gets recent transactions
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {number} options.offset - Pagination offset
 * @param {boolean} options.onlyNeedsValidation - If true, only returns transactions that need validation
 * @returns {Promise<Object>} - Transaction results
 */
export async function getRecentTransactions({ limit = 30, offset = 0, onlyNeedsValidation = false } = {}) {
  try {
    // Start building the query
    let query = supabase.from("transactions").select("*", { count: "exact" })

    // Add filter if only transactions needing validation are requested
    if (onlyNeedsValidation) {
      query = query.eq("needsvalidation", true).eq("validated", false)
    }

    // Complete the query with ordering and pagination
    const { data, error, count } = await query
      .order("createdat", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      transactions: data,
      total: count || 0,
    }
  } catch (error) {
    throw handleApiError(error, "Get Recent Transactions")
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
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("walletid", walletId)
      .order("createdat", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      transactions: data,
      total: count || 0,
    }
  } catch (error) {
    throw handleApiError(error, "Get Wallet Transactions")
  }
}

/**
 * Creates a buy transaction
 *
 * @param {Object} transactionData - Transaction data
 * @param {string} transactionData.walletId - Wallet ID
 * @param {string} transactionData.currency_code - Currency code being bought (primary currency)
 * @param {number} transactionData.amount - Amount of primary currency
 * @param {string} transactionData.exchange_currency_code - Exchange currency code
 * @param {number} transactionData.exchange_rate - Exchange rate
 * @param {number} transactionData.total_amount - Total amount in exchange currency
 * @returns {Promise<Object>} - Transaction result
 */
export async function createBuyTransaction({
  walletId,
  currency_code,
  amount,
  exchange_currency_code,
  exchange_rate,
  total_amount,
  source = null,
  destination = null,
  cashier_id = null,
}) {
  try {
    // Get the wallet to update its balance
    const wallet = await getWalletById(walletId)
    if (!wallet) {
      throw new Error("Wallet not found")
    }

    // Handle dynamic currency balances using the wallet_currencies table
    if (currency_code && amount) {
      // Increase the bought currency
      await updateWalletCurrency(walletId, currency_code, amount)
    }

    if (exchange_currency_code && total_amount) {
      // Decrease the exchange currency
      await updateWalletCurrency(walletId, exchange_currency_code, -total_amount)
    }

    // Get current user session if cashier_id isn't provided
    if (!cashier_id) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        cashier_id = sessionData?.session?.user?.id
      } catch (e) {
        console.error("Error getting user session for cashier_id:", e)
      }
    }

    // Create the transaction record with the actual columns from the database
    const transactionData = {
      id: generateUUID(),
      type: "buy",
      walletid: walletId,
      currency_code: currency_code,
      amount: amount,
      exchange_currency_code: exchange_currency_code,
      exchange_rate: exchange_rate,
      total_amount: total_amount,
      cashier_id: cashier_id,
      source: source || "Client",
      destination: destination || wallet?.name || "Wallet",
      createdat: Date.now(),
    }

    const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()

    if (error) throw error

    // Get the updated wallet data after all operations
    const updatedWallet = await getWalletById(walletId)

    return {
      transaction,
      wallet: updatedWallet,
    }
  } catch (error) {
    throw handleApiError(error, "Create Buy Transaction")
  }
}

/**
 * Creates a sell transaction
 *
 * @param {Object} transactionData - Transaction data
 * @param {string} transactionData.walletId - Wallet ID
 * @param {string} transactionData.sellCurrencyCode - Currency being sold (e.g. 'LYD')
 * @param {number} transactionData.sellAmount - Amount of currency being sold
 * @param {string} transactionData.receiveCurrencyCode - Currency being received (e.g. 'USD')
 * @param {number} transactionData.receiveAmount - Amount of currency being received
 * @deprecated Legacy USD, LYD, and dinarPrice parameters have been removed as they no longer exist in the schema
 * @returns {Promise<Object>} - Transaction result
 */
export async function createSellTransaction({
  walletId,
  sellCurrencyCode,
  sellAmount,
  receiveCurrencyCode,
  receiveAmount,
  source = null,
  destination = null,
  cashier_id = null,
}) {
  try {
    // Get the wallet to update its balance
    const wallet = await getWalletById(walletId)
    if (!wallet) {
      throw new Error("Wallet not found")
    }

    // Handle dynamic currency balances using the wallet_currencies table
    if (sellCurrencyCode && sellAmount) {
      // Decrease the sold currency
      await updateWalletCurrency(walletId, sellCurrencyCode, -sellAmount)
    }

    if (receiveCurrencyCode && receiveAmount) {
      // Increase the received currency
      await updateWalletCurrency(walletId, receiveCurrencyCode, receiveAmount)
    }

    // Get current user session if cashier_id isn't provided
    if (!cashier_id) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        cashier_id = sessionData?.session?.user?.id
      } catch (e) {
        console.error("Error getting user session for cashier_id:", e)
      }
    }

    // Create the transaction record with the actual columns from the database
    const transactionData = {
      id: generateUUID(),
      type: "sell",
      walletid: walletId,
      currency_code: sellCurrencyCode,
      amount: sellAmount,
      exchange_currency_code: receiveCurrencyCode,
      exchange_rate: receiveAmount / sellAmount,
      total_amount: receiveAmount,
      cashier_id: cashier_id,
      source: source || wallet?.name || "Wallet",
      destination: destination || "Client",
      createdat: Date.now(),
    }

    const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()

    if (error) throw error

    // Get the updated wallet data after all operations
    const updatedWallet = await getWalletById(walletId)

    return {
      transaction,
      wallet: updatedWallet,
    }
  } catch (error) {
    throw handleApiError(error, "Create Sell Transaction")
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
      .from("transactions")
      .select("type, exchange_rate, currency_code, exchange_currency_code")
      .order("createdat", { ascending: false })
      .limit(30)

    if (txError) throw txError

    // Calculate buy and sell averages
    const buys = recentTx.filter((tx) => tx.type === "buy")
    const sells = recentTx.filter((tx) => tx.type === "sell")

    const buyAverage =
      buys.length > 0 ? buys.reduce((sum, tx) => sum + Number(tx.exchange_rate), 0) / buys.length : null

    const sellAverage =
      sells.length > 0 ? sells.reduce((sum, tx) => sum + Number(tx.exchange_rate), 0) / sells.length : null

    return {
      buyAverage,
      sellAverage,
      recentTransactions: recentTx,
    }
  } catch (error) {
    throw handleApiError(error, "Get Transaction Stats")
  }
}

export default {
  getRecentTransactions,
  getTransactionsByWallet,
  createBuyTransaction,
  createSellTransaction,
  getTransactionStats,
}
