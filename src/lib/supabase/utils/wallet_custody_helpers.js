/**
 * Helper functions for calculating and managing cash custody in relation to wallets
 */

import supabase from "../client"

/**
 * Calculates the total custody amount for each wallet
 * @param {Array} custodyRecords - Array of custody records
 * @param {Array} wallets - Array of wallet objects
 * @returns {Object} - Object mapping wallet IDs to custody totals by currency
 */
export function calculateCustodyTotalsByWallet(custodyRecords = [], wallets = []) {
  // Initialize result object
  const custodyTotals = {}

  // Create a map of wallet IDs to their corresponding wallet objects for quick lookup
  const walletsMap = wallets.reduce((acc, wallet) => {
    acc[wallet.id] = wallet
    return acc
  }, {})

  // Process each custody record
  custodyRecords.forEach((record) => {
    const { wallet_id, amount, currency_code, status } = record

    // Skip invalid records or those without a matching wallet
    if (!wallet_id || !walletsMap[wallet_id] || !currency_code || !amount) {
      return
    }

    // Skip records that are not in active status
    if (status !== "active") {
      return
    }

    // Initialize the custody totals for this wallet if it doesn't exist yet
    if (!custodyTotals[wallet_id]) {
      custodyTotals[wallet_id] = {}
    }

    // Initialize the total for this currency if it doesn't exist yet
    if (!custodyTotals[wallet_id][currency_code]) {
      custodyTotals[wallet_id][currency_code] = 0
    }

    // Add the amount to the total
    custodyTotals[wallet_id][currency_code] += Number(amount)
  })

  return custodyTotals
}

/**
 * Merges wallet balances with custody totals
 * @param {Object} wallet - The wallet object
 * @param {Object} custodyTotals - Custody totals by wallet ID and currency
 * @returns {Object} - Wallet with custody totals merged
 */
export function mergeWalletWithCustody(wallet, custodyTotals = {}) {
  // Create a deep copy of the wallet object
  const result = JSON.parse(JSON.stringify(wallet))

  // If no custody totals or no matching wallet, return the wallet as is
  if (!custodyTotals || !custodyTotals[wallet.id]) {
    return result
  }

  // Get the custody totals for this wallet
  const walletCustody = custodyTotals[wallet.id]

  // Add custody information to the wallet
  result.custodyTotals = walletCustody

  // Merge custody amounts with wallet currencies
  result.totalWithCustody = { ...result.currencies }

  // Add custody amounts to the total
  Object.entries(walletCustody).forEach(([currency, amount]) => {
    if (!result.totalWithCustody[currency]) {
      result.totalWithCustody[currency] = 0
    }
    result.totalWithCustody[currency] += Number(amount)
  })

  return result
}

/**
 * Calculates custody summary information across all wallets
 * @param {Array} custodyRecords - Array of custody records
 * @returns {Object} - Summary of custody information
 */
export function getCustodySummary(custodyRecords = []) {
  const summary = {
    totalByCurrency: {},
    totalCount: custodyRecords.length,
    activeCount: 0,
  }

  // Process each custody record
  custodyRecords.forEach((record) => {
    const { amount, currency_code, status } = record

    // Skip invalid records
    if (!currency_code || !amount) {
      return
    }

    // Count active records
    if (status === "active") {
      summary.activeCount++

      // Initialize the total for this currency if it doesn't exist yet
      if (!summary.totalByCurrency[currency_code]) {
        summary.totalByCurrency[currency_code] = 0
      }

      // Add the amount to the total
      summary.totalByCurrency[currency_code] += Number(amount)
    }
  })

  return summary
}

/**
 * Gets a specific currency record for a wallet
 * Added getWalletCurrency function to retrieve wallet currency data
 * @param {string} walletId - Wallet ID
 * @param {string} currencyCode - Currency code
 * @returns {Promise<Object|null>} - Currency record or null if not found
 */
export async function getWalletCurrency(walletId, currencyCode) {
  try {
    const { data, error } = await supabase
      .from("wallet_currencies")
      .select("*")
      .eq("wallet_id", walletId)
      .eq("currency_code", currencyCode)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error getting wallet currency:", error)
    return null
  }
}
