/**
 * Wallets API
 *
 * This module handles all database operations related to wallets
 */

import supabase, { handleApiError } from "../client"
import { generateUUID } from "../../uuid"
import {
  calculateCustodyTotalsByWallet,
  mergeWalletWithCustody,
  getWalletCurrency,
} from "../utils/wallet_custody_helpers"
import { getCustodyTotalsByWallet } from "./wallet_custody_helpers"

/**
 * Gets all wallets with their currencies and custody information
 *
 * @returns {Promise<Object[]>} - Array of wallets with currencies and custody info
 */
export async function getWallets() {
  try {
    // First get all wallets with legacy fields
    console.log("Wallets API: Fetching wallets from Supabase...")

    // Get minimal columns to avoid issues with missing columns
    const walletsResponse = await supabase.from("wallets").select("*").order("name", { ascending: true })

    // Check for any errors
    if (walletsResponse.error) {
      console.error("Wallets API: Error fetching wallets:", walletsResponse.error)
      throw walletsResponse.error
    }

    // Extract wallets from response
    const wallets = walletsResponse.data

    if (!wallets || wallets.length === 0) {
      console.log("Wallets API: No wallets found")
      return { wallets: [] }
    }

    console.log("Wallets API: Found", wallets.length, "wallets")

    // Get custody records without status filtering
    // Note: The foreign key constraint is to auth.users, not public.users
    const { data: custodyRecords, error: custodyError } = await supabase
      .from("cash_custody")
      .select(
        "id, treasurer_id, cashier_id, wallet_id, currency_code, amount, notes, status, is_returned, created_at, updated_at",
      )

    if (custodyError) {
      console.log("Wallets API: Error fetching custody records:", custodyError)
    } else {
      console.log("Wallets API: Found custody records:", custodyRecords?.length || 0)

      // Display structure of first record if available for debugging
      if (custodyRecords && custodyRecords.length > 0) {
        console.log("Sample custody record:", custodyRecords[0])
      }
    }

    // Get the list of cashier and treasurer IDs
    const userIds = new Set()
    if (custodyRecords) {
      custodyRecords.forEach((record) => {
        if (record.cashier_id) userIds.add(record.cashier_id)
        if (record.treasurer_id) userIds.add(record.treasurer_id)
      })
    }

    // Get user data separately to avoid foreign key issues
    const cashiersData = {}

    // If we found user IDs, fetch their information from the public.users table
    if (userIds && userIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", Array.from(userIds))

      if (usersError) {
        console.log("Wallets API: Error fetching user data for custody records:", usersError)
      } else if (users) {
        users.forEach((user) => {
          cashiersData[user.id] = user
        })
      }
    }
    const treasurersData = {}

    if (!custodyError && custodyRecords && custodyRecords.length > 0) {
      // Get unique user IDs
      const userIds = [
        ...new Set([
          ...custodyRecords.map((record) => record.cashier_id),
          ...custodyRecords.map((record) => record.treasurer_id),
        ]),
      ].filter(Boolean)

      // Fetch user data
      if (userIds.length > 0) {
        const { data: userData } = await supabase.from("users").select("id, name, email").in("id", userIds)

        if (userData) {
          // Create lookup maps
          userData.forEach((user) => {
            if (user && user.id) {
              cashiersData[user.id] = user
              treasurersData[user.id] = user
            }
          })
        }
      }
    }

    if (custodyError) {
      console.warn("Wallets API: Error fetching custody records:", custodyError)
    }

    // Calculate custody totals for all wallets
    // Process custody records to get summary
    const activeCustodyRecords = custodyRecords || []

    // Add user data to custody records
    const enhancedCustodyRecords = activeCustodyRecords.map((record) => {
      return {
        ...record,
        cashier: record.cashier_id ? cashiersData[record.cashier_id] : null,
        treasurer: record.treasurer_id ? treasurersData[record.treasurer_id] : null,
      }
    })

    // Get custody totals for all wallets
    const custodyTotals = calculateCustodyTotalsByWallet(enhancedCustodyRecords, wallets)

    // Initialize all wallets with empty currencies (to be filled from wallet_currencies)
    let walletsWithCurrencies = wallets.map((wallet) => ({
      ...wallet,
      currencies: {},
    }))

    try {
      // Try to get currencies from the wallet_currencies table
      // This might fail if the table doesn't exist yet
      console.log("Wallets API: Fetching wallet currencies...")
      const { data: currencies, error: currencyError } = await supabase
        .from("wallet_currencies")
        .select("wallet_id, currency_code, balance")

      // If currencies were found, add them to the wallets
      if (!currencyError && currencies && currencies.length > 0) {
        console.log("Wallets API: Found", currencies.length, "wallet currencies")

        // For each wallet, find and add its currencies
        walletsWithCurrencies.forEach((wallet) => {
          const walletCurrencies = currencies.filter((c) => c.wallet_id === wallet.id)

          // Add each currency to the wallet's currencies object
          walletCurrencies.forEach((c) => {
            // If the currency already exists from legacy fields, use the higher value
            const currCode = c.currency_code
            const existingValue = wallet.currencies[currCode] || 0
            const newValue = Number(c.balance) || 0

            wallet.currencies[currCode] = Math.max(existingValue, newValue)
          })
        })
      } else {
        console.log("Wallets API: No additional currencies found or wallet_currencies table not available")
      }
    } catch (currencyError) {
      // If there's an error fetching currencies, log and continue
      console.warn("Wallets API: Error fetching wallet currencies:", currencyError)
    }

    // Add custody information to each wallet
    walletsWithCurrencies = walletsWithCurrencies.map((wallet) => {
      // Use the helper to merge wallet with custody data
      const walletWithCustody = mergeWalletWithCustody(wallet, custodyTotals)

      // Mark if this is a treasury wallet - safely handle if the column doesn't exist
      walletWithCustody.isTreasury = wallet.is_treasury === true || wallet.treasury_wallet_id != null

      return walletWithCustody
    })

    console.log("Wallets API: Returning", walletsWithCurrencies.length, "wallets with currencies and custody info")
    return { wallets: walletsWithCurrencies }
  } catch (error) {
    console.error("Wallets API: Error in getWallets:", error)
    throw handleApiError(error, "Get Wallets")
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
    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("id, name, is_treasury")
      .eq("id", walletId)
      .single()

    if (error) throw error

    // Get all wallet currencies
    const { data: currencies, error: currencyError } = await supabase
      .from("wallet_currencies")
      .select("wallet_id, currency_code, balance")
      .eq("wallet_id", walletId)

    if (currencyError) throw currencyError

    // Create a currencies object for easier access
    const currenciesObj = {}
    currencies.forEach((c) => {
      currenciesObj[c.currency_code] = Number(c.balance)
    })

    return {
      ...wallet,
      currencies: currenciesObj,
    }
  } catch (error) {
    throw handleApiError(error, "Get Wallet")
  }
}

/**
 * Creates a new wallet with currencies
 *
 * @param {Object} walletData - Wallet data
 * @param {string} walletData.name - Wallet name
 * @param {Object} [walletData.currencies={}] - Currency balances {currencyCode: balance}
 * @returns {Promise<Object>} - Created wallet
 */
export async function createWallet({ name, currencies = {} }) {
  try {
    // Enforce unique wallet names
    if (!name || !name.trim()) {
      throw new Error("Wallet name is required")
    }
    const { data: existing } = await supabase.from("wallets").select("id").ilike("name", name.trim()).limit(1)
    if (existing && existing.length > 0) {
      throw new Error("A wallet with this name already exists")
    }

    const walletId = generateUUID()
    const newWallet = {
      id: walletId,
      name,
      is_treasury: false,
    }

    const { data, error } = await supabase.from("wallets").insert(newWallet).select("id, name, is_treasury").single()

    if (error) throw error

    const currenciesToAdd = []

    // Add all currencies from the currencies object
    Object.entries(currencies).forEach(([code, balance]) => {
      if (balance !== 0 && balance !== null && balance !== undefined) {
        currenciesToAdd.push({
          wallet_id: walletId,
          currency_code: code,
          balance: Number(balance),
        })
      }
    })

    // If no currencies provided, add USD and LYD with 0 balance as defaults
    if (currenciesToAdd.length === 0) {
      currenciesToAdd.push(
        {
          wallet_id: walletId,
          currency_code: "USD",
          balance: 0,
        },
        {
          wallet_id: walletId,
          currency_code: "LYD",
          balance: 0,
        },
      )
    }

    if (currenciesToAdd.length > 0) {
      const { error: currencyError } = await supabase.from("wallet_currencies").insert(currenciesToAdd)

      if (currencyError) {
        console.error("Error adding wallet currencies:", currencyError)
        throw currencyError
      }
    }

    const walletsWithCurrencies = {}
    currenciesToAdd.forEach((c) => {
      walletsWithCurrencies[c.currency_code] = c.balance
    })

    return {
      wallet: {
        ...data,
        currencies: walletsWithCurrencies,
      },
    }
  } catch (error) {
    throw handleApiError(error, "Create Wallet")
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
      .from("wallets")
      .update(safeUpdates)
      .eq("id", walletId)
      .select("id, name, usd, lyd, is_treasury")
      .single()

    if (error) throw error
    return data
  } catch (error) {
    throw handleApiError(error, "Update Wallet")
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
    const { error } = await supabase.from("wallets").delete().eq("id", walletId)

    if (error) throw error
  } catch (error) {
    throw handleApiError(error, "Delete Wallet")
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
      .from("wallets")
      .select("id, name, usd, lyd, is_treasury")
      .eq("id", walletId)
      .single()

    if (walletError) throw walletError

    // Get custody totals for this wallet
    const custodyTotals = await getCustodyTotalsByWallet()
    const walletCustodyBalances = custodyTotals[walletId] || {}

    // Get recent transactions for this wallet
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, type, exchange_rate, currency_code, exchange_currency_code, amount, total_amount")
      .eq("walletid", walletId)
      .not("exchange_rate", "is", null)
      .not("exchange_currency_code", "is", null)
      .order("createdat", { ascending: false })
      .limit(30)

    if (txError) throw txError

    // Process transaction data
    const buys = transactions.filter((tx) => tx.type === "buy")
    const sells = transactions.filter((tx) => tx.type === "sell")

    // Calculate buy stats
    const buyPrices = buys.map((tx) => Number(tx.exchange_rate)).sort((a, b) => a - b)
    const buy =
      buyPrices.length > 0
        ? {
            min: buyPrices[0],
            max: buyPrices[buyPrices.length - 1],
            median: buyPrices[Math.floor(buyPrices.length / 2)] || buyPrices[0],
          }
        : null

    // Calculate sell stats
    const sellPrices = sells.map((tx) => Number(tx.exchange_rate)).sort((a, b) => a - b)
    const sell =
      sellPrices.length > 0
        ? {
            min: sellPrices[0],
            max: sellPrices[sellPrices.length - 1],
            median: sellPrices[Math.floor(sellPrices.length / 2)] || sellPrices[0],
          }
        : null

    // Get custody records for this wallet with explicit column selection
    const { data: custodyRecords, error: custodyError } = await supabase
      .from("cash_custody")
      .select(
        "id, treasurer_id, cashier_id, wallet_id, currency_code, amount, notes, status, is_returned, created_at, updated_at",
      )
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })

    if (custodyError) {
      console.warn("Wallets API: Error fetching custody records:", custodyError)
    } else {
      console.log(`Wallets API: Found ${custodyRecords?.length || 0} custody records for wallet ${walletId}`)

      // Log the first record for debugging if exists
      if (custodyRecords && custodyRecords.length > 0) {
        console.log("First custody record sample:", custodyRecords[0])
      }
    }

    // Get user data for cashiers and treasurers in these custody records
    const custodyUserIds = new Set()
    if (custodyRecords && custodyRecords.length > 0) {
      custodyRecords.forEach((record) => {
        if (record.cashier_id) custodyUserIds.add(record.cashier_id)
        if (record.treasurer_id) custodyUserIds.add(record.treasurer_id)
      })
    }

    // Fetch the user data separately
    const custodyUsers = {}
    if (custodyUserIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", Array.from(custodyUserIds))

      if (!usersError && users) {
        users.forEach((user) => {
          custodyUsers[user.id] = user
        })
      }
    }

    // Enhance custody records with user data
    const enhancedCustodyRecords = custodyRecords
      ? custodyRecords.map((record) => ({
          ...record,
          treasurer: custodyUsers[record.treasurer_id] || {
            id: record.treasurer_id,
            name: `Treasurer (${record.treasurer_id?.slice(0, 8) || "Unknown"})`,
          },
          cashier: custodyUsers[record.cashier_id] || {
            id: record.cashier_id,
            name: `Cashier (${record.cashier_id?.slice(0, 8) || "Unknown"})`,
          },
        }))
      : []

    // Add custody information to the wallet object
    wallet.isTreasury = !!wallet.is_treasury
    wallet.custodyBalances = walletCustodyBalances

    return {
      wallet,
      transactions,
      buy,
      sell,
      custodyRecords: enhancedCustodyRecords || [],
      custodyBalances: walletCustodyBalances,
    }
  } catch (error) {
    throw handleApiError(error, "Get Wallet Stats")
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
    const { wallets } = await getWallets()

    if (!wallets || wallets.length === 0) {
      return { totalUsd: 0, totalLyd: 0, count: 0, currencyTotals: {} }
    }

    // Calculate totals for all currencies from wallet_currencies-derived data
    const currencyTotals = {}
    let totalUsd = 0
    let totalLyd = 0

    wallets.forEach((wallet) => {
      if (wallet.currencies) {
        Object.entries(wallet.currencies).forEach(([code, balance]) => {
          currencyTotals[code] = (currencyTotals[code] || 0) + Number(balance)
        })
      }
    })

    totalUsd = currencyTotals.USD || 0
    totalLyd = currencyTotals.LYD || 0

    const count = wallets.length

    console.log("Wallet summary calculated:", {
      totalUsd,
      totalLyd,
      count,
      currencyCount: Object.keys(currencyTotals).length,
      currencies: Object.keys(currencyTotals).join(", "),
    })

    return { totalUsd, totalLyd, count, currencyTotals }
  } catch (error) {
    console.error("Error getting wallets summary:", error)
    throw handleApiError(error, "Get Wallets Summary")
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
      .from("wallet_currencies")
      .select("*")
      .eq("wallet_id", walletId)
      .eq("currency_code", currencyCode)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      throw new Error(`This wallet already has ${currencyCode} currency`)
    }

    // Add the new currency
    const { error: insertError } = await supabase.from("wallet_currencies").insert({
      wallet_id: walletId,
      currency_code: currencyCode,
      balance: Number(initialBalance),
    })

    if (insertError) throw insertError

    // Get updated wallet data
    return await getWalletById(walletId)
  } catch (error) {
    throw handleApiError(error, "Add Currency To Wallet")
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
    if (
      (currencyCode === "USD" || currencyCode === "LYD") &&
      !(await hasCurrencyInWalletCurrencies(walletId, currencyCode))
    ) {
      // Update the legacy field instead
      const updates = {}
      updates[currencyCode.toLowerCase()] = Number(newBalance)

      await updateWallet(walletId, updates)
      return await getWalletById(walletId)
    }

    // Update the currency in wallet_currencies
    const { error } = await supabase
      .from("wallet_currencies")
      .update({ balance: Number(newBalance) })
      .eq("wallet_id", walletId)
      .eq("currency_code", currencyCode)

    if (error) throw error

    // Get updated wallet data
    return await getWalletById(walletId)
  } catch (error) {
    throw handleApiError(error, "Update Wallet Currency Balance")
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
    if (currencyCode === "USD" || currencyCode === "LYD") {
      // If it's in wallet_currencies we can remove it from there,
      // but we need to check if it's the legacy field
      if (!(await hasCurrencyInWalletCurrencies(walletId, currencyCode))) {
        throw new Error(`Cannot remove ${currencyCode} from wallet. Use updateWallet to set the balance to 0 instead.`)
      }
    }

    const { error } = await supabase
      .from("wallet_currencies")
      .delete()
      .eq("wallet_id", walletId)
      .eq("currency_code", currencyCode)

    if (error) throw error

    // Get updated wallet data
    return await getWalletById(walletId)
  } catch (error) {
    throw handleApiError(error, "Remove Currency From Wallet")
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
    .from("wallet_currencies")
    .select("*")
    .eq("wallet_id", walletId)
    .eq("currency_code", currencyCode)
    .maybeSingle()

  if (error) throw error
  return !!data
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
    if (
      (currencyCode === "USD" || currencyCode === "LYD") &&
      !(await hasCurrencyInWalletCurrencies(walletId, currencyCode))
    ) {
      // Use legacy withdraw function
      return await withdrawLegacy(walletId, currencyCode.toLowerCase(), amount, reason)
    }

    // Get current wallet state
    const wallet = await getWalletById(walletId)

    // Check if currency exists in wallet
    const currentBalance = wallet.currencies && wallet.currencies[currencyCode]
    if (currentBalance === undefined) {
      throw new Error(`Currency ${currencyCode} not found in wallet`)
    }

    // Check if sufficient balance
    if (Number(currentBalance) < Number(amount)) {
      throw new Error(`Insufficient ${currencyCode} balance`)
    }

    // Update wallet currency balance
    const newBalance = Number(currentBalance) - Number(amount)
    const { error } = await supabase
      .from("wallet_currencies")
      .update({ balance: newBalance })
      .eq("wallet_id", walletId)
      .eq("currency_code", currencyCode)

    if (error) throw error

    // Create transaction record
    await createWithdrawalTransaction(walletId, currencyCode, amount, reason)

    // Get updated wallet data
    return await getWalletById(walletId)
  } catch (error) {
    throw handleApiError(error, "Withdraw Currency")
  }
}

/**
 * Handle legacy withdrawal from USD/LYD fields
 */
async function withdrawLegacy(walletId, currency, amount, reason) {
  try {
    // Get current wallet state
    const wallet = await getWalletById(walletId)

    // Check if sufficient balance
    if (Number(wallet[currency]) < Number(amount)) {
      throw new Error(`Insufficient ${currency.toUpperCase()} balance`)
    }

    // Update wallet balance
    const updates = {}
    updates[currency] = Number(wallet[currency]) - Number(amount)

    await updateWallet(walletId, updates)

    // Create transaction record
    await createWithdrawalTransaction(walletId, currency.toUpperCase(), amount, reason)

    // Get updated wallet data
    return await getWalletById(walletId)
  } catch (error) {
    throw handleApiError(error, "Withdraw Legacy")
  }
}

/**
 * Creates a withdrawal transaction record
 */
async function createWithdrawalTransaction(walletId, currencyCode, amount, reason) {
  try {
    const transaction = {
      wallet_id: walletId,
      type: "withdrawal",
      amount: Number(amount),
      currency_code: currencyCode,
      reason: reason || "Withdrawal",
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("transactions").insert(transaction)

    if (error) throw error
  } catch (error) {
    console.error("Error creating withdrawal transaction:", error)
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
    if (
      (currencyCode === "USD" || currencyCode === "LYD") &&
      !(await hasCurrencyInWalletCurrencies(walletId, currencyCode))
    ) {
      // Get current wallet
      const wallet = await getWalletById(walletId)
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`)
      }

      // Update the legacy field by adding the delta
      const fieldName = currencyCode.toLowerCase()
      const currentAmount = Number(wallet[fieldName] || 0)
      const newAmount = currentAmount + Number(deltaAmount)

      // Use updateWallet to set the new value
      const updates = {}
      updates[fieldName] = newAmount
      await updateWallet(walletId, updates)

      return await getWalletById(walletId)
    }

    // For non-legacy currencies, get the current balance first
    const currencyRecord = await getWalletCurrency(walletId, currencyCode)

    if (!currencyRecord) {
      // Currency doesn't exist yet, add it with the delta amount (if positive)
      if (deltaAmount <= 0) {
        throw new Error(`Cannot subtract from non-existent currency ${currencyCode} in wallet ${walletId}`)
      }

      return await addCurrencyToWallet(walletId, currencyCode, deltaAmount)
    }

    // Currency exists, update its balance
    const currentBalance = Number(currencyRecord.balance || 0)
    const newBalance = currentBalance + Number(deltaAmount)

    if (newBalance < 0) {
      throw new Error(
        `Insufficient balance: have ${currentBalance} ${currencyCode}, tried to subtract ${Math.abs(deltaAmount)}`,
      )
    }

    // Update the balance
    return await updateWalletCurrencyBalance(walletId, currencyCode, newBalance)
  } catch (error) {
    throw handleApiError(error, "Update Wallet Currency Delta")
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
  withdrawCurrency,
}
