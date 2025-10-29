/**
 * Cash Custody API
 *
 * This module handles all database operations related to cash custody management
 */

import supabase, { handleApiError } from "../client"
import { generateUUID } from "../../uuid"
import { getWalletById, updateWalletCurrencyBalance } from "./wallets"

/**
 * Get all cash custody records for the current user
 *
 * @returns {Promise<Object>} - Object containing given and received custody records
 */
export async function getAllCashCustody() {
  try {
    console.log("Cash Custody API: Fetching all custody records...")

    // Get user ID from session - handle potential errors more gracefully
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user || !user.id) {
      console.error("Cash Custody API: No authenticated user found in getAllCashCustody")
      throw new Error("User not authenticated")
    }

    console.log("Cash Custody API: Fetching custody records for user ID:", user.id)

    // Use a try-catch for each query to handle potential schema issues
    let givenRecords = []
    let receivedRecords = []

    try {
      // Custody given to cashiers (user is the treasurer)
      const givenResponse = await supabase
        .from("cash_custody")
        .select("*, name")
        .eq("treasurer_id", user.id)
        .order("created_at", { ascending: false })

      if (givenResponse.error) {
        console.warn("Error fetching given custody records:", givenResponse.error)
      } else {
        givenRecords = givenResponse.data || []
        console.log(`Cash Custody API: Found ${givenRecords.length} given custody records`)
        // Debug output for the first record
        if (givenRecords.length > 0) {
          console.log("Sample given record:", {
            id: givenRecords[0].id,
            name: givenRecords[0].name,
            treasurer_id: givenRecords[0].treasurer_id,
            cashier_id: givenRecords[0].cashier_id,
            status: givenRecords[0].status,
          })
        }
      }
    } catch (error) {
      console.warn("Exception fetching given custody records:", error)
    }

    try {
      // Custody received from treasurer (user is the cashier)
      const receivedResponse = await supabase
        .from("cash_custody")
        .select("*, name")
        .eq("cashier_id", user.id)
        .order("created_at", { ascending: false })

      if (receivedResponse.error) {
        console.warn("Error fetching received custody records:", receivedResponse.error)
      } else {
        receivedRecords = receivedResponse.data || []
        console.log(`Cash Custody API: Found ${receivedRecords.length} received custody records`)
        // Debug output for the first record
        if (receivedRecords.length > 0) {
          console.log("Sample received record:", {
            id: receivedRecords[0].id,
            name: receivedRecords[0].name,
            treasurer_id: receivedRecords[0].treasurer_id,
            cashier_id: receivedRecords[0].cashier_id,
            status: receivedRecords[0].status,
          })
        }
      }
    } catch (error) {
      console.warn("Exception fetching received custody records:", error)
    }

    // Exit early if we couldn't get any records
    if (givenRecords.length === 0 && receivedRecords.length === 0) {
      return { given: [], received: [] }
    }

    // Get all unique user IDs from both responses
    const userIds = new Set()
    const walletIds = new Set()
    ;[...givenRecords, ...receivedRecords].forEach((record) => {
      if (record.treasurer_id) userIds.add(record.treasurer_id)
      if (record.cashier_id) userIds.add(record.cashier_id)
      if (record.wallet_id) walletIds.add(record.wallet_id)
    })

    // Initialize maps for lookup
    const userMap = {}
    const walletMap = {}

    // Only try to fetch users if we have IDs to fetch
    if (userIds.size > 0) {
      try {
        // Fetch all relevant users in a single query from the users table
        // This is important because the foreign keys point to auth.users but we need to display user info from public.users
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", Array.from(userIds))

        console.log(`Cash Custody API: Attempting to fetch ${userIds.size} users, found ${users?.length || 0}`)

        if (!usersError && users) {
          users.forEach((user) => {
            userMap[user.id] = user
          })
        } else {
          console.warn("Error fetching user data:", usersError)

          // As a fallback, try fetching each user individually
          for (const userId of userIds) {
            try {
              const { data: user, error: userError } = await supabase
                .from("users")
                .select("id, name, email")
                .eq("id", userId)
                .single()

              if (!userError && user) {
                userMap[userId] = user
              }
            } catch (err) {
              console.warn(`Could not fetch user ${userId}:`, err)
            }
          }
        }
      } catch (error) {
        console.warn("Exception fetching user data:", error)
      }
    }

    // Only try to fetch wallets if we have IDs to fetch
    if (walletIds.size > 0) {
      try {
        // Fetch all relevant wallets in a single query
        const { data: wallets, error: walletsError } = await supabase
          .from("wallets")
          .select("id, name")
          .in("id", Array.from(walletIds))

        if (!walletsError && wallets) {
          wallets.forEach((wallet) => {
            walletMap[wallet.id] = wallet
          })
        } else {
          console.warn("Error fetching wallet data:", walletsError)
        }
      } catch (error) {
        console.warn("Exception fetching wallet data:", error)
      }
    }

    // Enhance the custody records with user and wallet data
    const enhancedGivenRecords = givenRecords.map((record) => ({
      ...record,
      cashier_name: userMap[record.cashier_id]?.name || `Cashier (${record.cashier_id?.slice(0, 8) || "Unknown"})`,
      treasurer: userMap[record.treasurer_id] || {
        id: record.treasurer_id,
        name: `Treasurer (${record.treasurer_id?.slice(0, 8) || "Unknown"})`,
      },
      cashier: userMap[record.cashier_id] || {
        id: record.cashier_id,
        name: `Cashier (${record.cashier_id?.slice(0, 8) || "Unknown"})`,
      },
      wallet: walletMap[record.wallet_id] || {
        id: record.wallet_id,
        name: `Wallet (${record.wallet_id?.slice(0, 8) || "Unknown"})`,
      },
    }))

    const enhancedReceivedRecords = receivedRecords.map((record) => ({
      ...record,
      cashier_name: userMap[record.cashier_id]?.name || `Cashier (${record.cashier_id?.slice(0, 8) || "Unknown"})`,
      treasurer: userMap[record.treasurer_id] || {
        id: record.treasurer_id,
        name: `Treasurer (${record.treasurer_id?.slice(0, 8) || "Unknown"})`,
      },
      cashier: userMap[record.cashier_id] || {
        id: record.cashier_id,
        name: `Cashier (${record.cashier_id?.slice(0, 8) || "Unknown"})`,
      },
      wallet: walletMap[record.wallet_id] || {
        id: record.wallet_id,
        name: `Wallet (${record.wallet_id?.slice(0, 8) || "Unknown"})`,
      },
    }))

    return {
      given: enhancedGivenRecords,
      received: enhancedReceivedRecords,
    }
  } catch (error) {
    console.error("Cash Custody API: Error in getAllCashCustody:", error)
    throw handleApiError(error, "Get All Cash Custody")
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
    console.log(`Cash Custody API: Updating custody status to ${status}`)

    if (!custodyId) throw new Error("Custody ID is required")
    if (!["approved", "rejected", "returned"].includes(status)) {
      throw new Error("Invalid status: must be approved, rejected, or returned")
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user || !user.id) {
      console.error("Cash Custody API: No authenticated user found")
      throw new Error("User not authenticated")
    }

    // Get the custody record first
    const { data: custodyRecord, error: custodyError } = await supabase
      .from("cash_custody")
      .select("*")
      .eq("id", custodyId)
      .single()

    if (custodyError) throw custodyError

    // Update the status
    try {
      const { data, error } = await supabase
        .from("cash_custody")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", custodyId)
        .select("*")
        .single()

      if (error) throw error

      // Handle wallet balance updates based on status change
      if (status === "approved") {
        // When approved, create a custody record for the cashier
        console.log("Cash Custody API: Creating custody record for cashier")

        try {
          // Get wallet currencies for this wallet
          const { data: walletCurrencies, error: walletCurrenciesError } = await supabase
            .from("wallet_currencies")
            .select("currency_code, balance")
            .eq("wallet_id", custodyRecord.wallet_id)
          if (walletCurrenciesError) throw walletCurrenciesError
          // ...existing code...

          // Get cashier user info for name
          const { data: cashierUser, error: cashierError } = await supabase
            .from("users")
            .select("name, lastname")
            .eq("id", custodyRecord.cashier_id)
            .single()
          let cashierName = "Cashier"
          if (!cashierError && cashierUser) {
            cashierName = `${cashierUser.name || ""}_${cashierUser.lastname || ""}`.replace(/_+$/, "")
          }

          // Build custody name
          const custodyName = `${cashierName}_${custodyRecord.currency_code}`

          // Check if custody already exists for this user and currency
          const { data: existingCustody, error: custodyCheckError } = await supabase
            .from("custody")
            .select("id, amount")
            .eq("user_id", custodyRecord.cashier_id)
            .eq("currency_code", custodyRecord.currency_code)
            .single()

          if (!custodyCheckError && existingCustody) {
            // Add amount to existing custody and ensure name is set
            await supabase
              .from("custody")
              .update({
                amount: Number(existingCustody.amount) + Number(custodyRecord.amount),
                name: custodyName,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingCustody.id)
          } else {
            // Create new custody record with name
            await supabase.from("custody").insert({
              id: generateUUID(),
              user_id: custodyRecord.cashier_id,
              wallet_id: custodyRecord.wallet_id,
              amount: custodyRecord.amount,
              currency_code: custodyRecord.currency_code,
              name: custodyName,
              status: "active",
              created_at: new Date().toISOString(),
              custody_record_id: custodyRecord.id,
            })
          }
        } catch (e) {
          console.error("Cash Custody API: Error creating custody record:", e)
          // Don't throw here, as we already approved the custody request
        }
      } else if (status === "rejected") {
        // When rejected, return the money to the wallet
        try {
          await updateWalletCurrencyBalance(
            custodyRecord.wallet_id,
            custodyRecord.currency_code,
            custodyRecord.amount,
            "add",
          )
          console.log("Cash Custody API: Returned funds to wallet after rejection")
        } catch (e) {
          console.error("Cash Custody API: Error returning funds to wallet:", e)
        }
      } else if (status === "returned") {
        // When returned, return the money to the wallet
        try {
          await updateWalletCurrencyBalance(
            custodyRecord.wallet_id,
            custodyRecord.currency_code,
            custodyRecord.amount,
            "add",
          )

          // Update any custody records to inactive
          await supabase.from("custody").update({ status: "inactive" }).eq("custody_record_id", custodyRecord.id)

          console.log("Cash Custody API: Returned funds to wallet after return")
        } catch (e) {
          console.error("Cash Custody API: Error returning funds to wallet:", e)
        }
      }

      // Fetch related data
      if (data) {
        // Initialize defaults with ID information for fallbacks
        let treasurerData = {
          id: data.treasurer_id,
          name: `Treasurer (${data.treasurer_id?.slice(0, 8) || "Unknown"})`,
        }
        let cashierData = { id: data.cashier_id, name: `Cashier (${data.cashier_id?.slice(0, 8) || "Unknown"})` }
        let walletData = { id: data.wallet_id, name: `Wallet (${data.wallet_id?.slice(0, 8) || "Unknown"})` }

        // Try to get treasurer data
        try {
          const { data: treasurer, error: treasurerError } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("id", data.treasurer_id)
            .single()

          if (!treasurerError && treasurer) {
            treasurerData = treasurer
          }
        } catch (e) {
          console.warn("Error fetching treasurer data:", e)
        }

        // Try to get cashier data
        try {
          const { data: cashier, error: cashierError } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("id", data.cashier_id)
            .single()

          if (!cashierError && cashier) {
            cashierData = cashier
          }
        } catch (e) {
          console.warn("Error fetching cashier data:", e)
        }

        // Try to get wallet data
        try {
          const { data: wallet, error: walletError } = await supabase
            .from("wallets")
            .select("id, name, currency_code")
            .eq("id", data.wallet_id)
            .single()

          if (!walletError && wallet) {
            walletData = wallet
          }
        } catch (e) {
          console.warn("Error fetching wallet data:", e)
        }

        // Enhance the record with related data
        const enhancedData = {
          ...data,
          treasurer: treasurerData,
          cashier: cashierData,
          wallet: walletData,
        }

        return enhancedData
      }

      return data
    } catch (updateError) {
      console.error("Error updating custody status:", updateError)
      throw updateError
    }
  } catch (error) {
    console.error("Cash Custody API: Error in updateCustodyStatus:", error)
    throw handleApiError(error, "Update Custody Status")
  }
}

/**
 * Get cashiers list
 *
 * @returns {Promise<Array>} - List of cashiers
 */
export async function getCashiers() {
  try {
    console.log("Cash Custody API: Fetching cashiers...")

    // Get all users with the cashier role from the users table
    const { data, error } = await supabase.from("users").select("id, name, email, role, role_id").order("name")

    if (error) {
      console.error("Cash Custody API: Error fetching users:", error)
      throw error
    }

    // Filter users who have the cashier role
    // First, try to get cashier role ID if available
    let cashierRoleId = null
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "cashier")
        .single()

      if (!roleError && roleData) {
        cashierRoleId = roleData.id
      }
    } catch (e) {
      console.warn("Cash Custody API: Could not get cashier role ID:", e)
    }

    // Filter users with cashier role (check both direct role and role_id)
    const cashiers = data.filter(
      (user) =>
        (user.role && user.role.toLowerCase() === "cashier") || (cashierRoleId && user.role_id === cashierRoleId),
    )

    console.log(`Cash Custody API: Found ${cashiers.length} cashiers`)
    return cashiers
  } catch (error) {
    console.error("Cash Custody API: Error in getCashiers:", error)
    throw handleApiError(error, "Get Cashiers")
  }
}

/**
 * Give cash custody to a cashier
 *
 * @param {Object} data - Custody data
 * @returns {Promise<Object>} - Created custody record
 */
export async function giveCashCustody(data) {
  try {
    console.log("Cash Custody API: Giving custody with data:", data)

    const { cashierId, walletId, currencyCode, amount, notes = "" } = data

    if (!cashierId) {
      throw new Error("Cashier ID is required")
    }

    if (!walletId) {
      throw new Error("Wallet ID is required")
    }

    if (!currencyCode) {
      throw new Error("Currency code is required")
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Valid amount is required")
    }

    // Get user from session - handle potential errors more gracefully
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user || !user.id) {
      console.error("Cash Custody API: No authenticated user found")
      throw new Error("User not authenticated")
    }

    console.log("Cash Custody API: Giving custody for user ID:", user.id)

    // Get the wallet to verify it exists and has sufficient funds
    const wallet = await getWalletById(walletId)
    if (!wallet) {
      throw new Error("Wallet not found")
    }

    // Check if the wallet has sufficient funds
    const walletCurrencies = wallet.currencies || {}
    const currencyBalance = walletCurrencies[currencyCode] || 0

    console.log("Cash Custody API: Checking wallet balance:", {
      walletCurrencies,
      currencyCode,
      currencyBalance,
      requiredAmount: amount,
    })

    if (Number(currencyBalance) < Number(amount)) {
      throw new Error(
        `Insufficient funds: Wallet has ${currencyBalance} ${currencyCode}, but ${amount} ${currencyCode} is required`,
      )
    }

    // Prepare the custody record
    const custodyId = generateUUID()
    const custodyRecord = {
      id: custodyId,
      treasurer_id: user.id,
      cashier_id: cashierId,
      wallet_id: walletId,
      currency_code: currencyCode,
      amount: Number(amount),
      notes,
      status: "pending", // All new custody records start as pending
      is_returned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // First subtract the amount from the wallet
    try {
      await updateWalletCurrencyBalance(walletId, currencyCode, amount, "subtract")
      console.log(`Cash Custody API: Subtracted ${amount} ${currencyCode} from wallet ${walletId}`)
    } catch (error) {
      console.error("Cash Custody API: Error subtracting from wallet:", error)
      throw new Error(`Failed to subtract amount from wallet: ${error.message}`)
    }

    // Insert the custody record
    const { data: insertedRecord, error: insertError } = await supabase
      .from("cash_custody")
      .insert(custodyRecord)
      .select("*")
      .single()

    if (insertError) {
      console.error("Cash Custody API: Error inserting cash_custody record:", insertError)
      // Try to restore the funds if the record insertion failed
      try {
        await updateWalletCurrencyBalance(walletId, currencyCode, amount, "add")
        console.log(`Cash Custody API: Restored ${amount} ${currencyCode} to wallet ${walletId} after failure`)
      } catch (restoreError) {
        console.error("Cash Custody API: Error restoring funds to wallet:", restoreError)
      }
      throw insertError
    }

    // Fetch related data separately if record was inserted successfully
    if (insertedRecord) {
      // Get user data for treasurer and cashier
      let treasurerData = {
        id: insertedRecord.treasurer_id,
        name: `Treasurer (${insertedRecord.treasurer_id?.slice(0, 8) || "Unknown"})`,
      }
      let cashierData = {
        id: insertedRecord.cashier_id,
        name: `Cashier (${insertedRecord.cashier_id?.slice(0, 8) || "Unknown"})`,
      }
      let walletData = {
        id: insertedRecord.wallet_id,
        name: `Wallet (${insertedRecord.wallet_id?.slice(0, 8) || "Unknown"})`,
      }

      try {
        // Get treasurer data
        const { data: treasurer } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("id", insertedRecord.treasurer_id)
          .single()

        if (treasurer) {
          treasurerData = treasurer
        }
      } catch (e) {
        console.warn("Error fetching treasurer data:", e)
      }

      try {
        // Get cashier data
        const { data: cashier } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("id", insertedRecord.cashier_id)
          .single()

        if (cashier) {
          cashierData = cashier
        }
      } catch (e) {
        console.warn("Error fetching cashier data:", e)
      }

      try {
        // Get wallet data
        const { data: wallet } = await supabase
          .from("wallets")
          .select("id, name, currency_code")
          .eq("id", insertedRecord.wallet_id)
          .single()

        if (wallet) {
          walletData = wallet
        }
      } catch (e) {
        console.warn("Error fetching wallet data:", e)
      }

      // Add the related data to the record
      Object.assign(insertedRecord, {
        treasurer: treasurerData,
        cashier: cashierData,
        wallet: walletData,
      })
    }

    const { data: cashierUser, error: cashierError } = await supabase
      .from("users")
      .select("name, lastname")
      .eq("id", cashierId)
      .single()

    let cashierName = "Cashier"
    if (!cashierError && cashierUser) {
      cashierName = `${cashierUser.name || ""}_${cashierUser.lastname || ""}`.replace(/_+$/, "")
    }

    // Build custody name
    const custodyName = `${cashierName}_${currencyCode}`

    // Check if the cashier already has a custody record for this currency
    const { data: existingCustody, error: custodyCheckError } = await supabase
      .from("custody")
      .select("id, amount")
      .eq("user_id", cashierId)
      .eq("currency_code", currencyCode)
      .maybeSingle()

    if (custodyCheckError) {
      console.error("Cash Custody API: Error checking existing custody:", custodyCheckError)
      // Continue since this is not critical to the main flow
    }

    if (existingCustody) {
      console.log("Cash Custody API: Updating existing custody record for cashier")
      const newAmount = Number(existingCustody.amount) + Number(amount)

      const { error: updateError } = await supabase
        .from("custody")
        .update({
          amount: newAmount,
          name: custodyName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCustody.id)

      if (updateError) {
        console.error("Cash Custody API: Error updating cashier custody record:", updateError)
        // Continue since the cash_custody record was created successfully
      }
    } else {
      console.log("Cash Custody API: Creating new custody record for cashier with name:", custodyName)

      const { error: createCustodyError } = await supabase.from("custody").insert({
        user_id: cashierId,
        currency_code: currencyCode,
        amount: Number(amount),
        name: custodyName,
      })

      if (createCustodyError) {
        console.error("Cash Custody API: Error creating cashier custody record:", createCustodyError)
        // Continue since the cash_custody record was created successfully
      }
    }

    // Note: In a real application, you might want to:
    // 1. Create a notification for the cashier
    // 2. Update the wallet balance (but only after the cashier approves the custody)

    return insertedRecord
  } catch (error) {
    console.error("Cash Custody API: Error in giveCashCustody:", error)
    throw handleApiError(error, "Give Cash Custody")
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
    console.log("Cash Custody API: Fetching custody record:", custodyId)

    const { data, error } = await supabase.from("cash_custody").select("*").eq("id", custodyId).single()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Cash Custody API: Error in getCashCustody:", error)
    throw handleApiError(error, "Get Cash Custody")
  }
}

/**
 * Get treasurers list
 *
 * @returns {Promise<Array>} - List of treasurers
 */
export async function getTreasurers() {
  try {
    console.log("Cash Custody API: Fetching treasurers...")

    // Get all users with the treasurer role from the users table
    const { data, error } = await supabase.from("users").select("id, name, email, role, role_id").order("name")

    if (error) {
      console.error("Cash Custody API: Error fetching users:", error)
      throw error
    }

    // Filter users who have the treasurer role
    // First, try to get treasurer role ID if available
    let treasurerRoleId = null
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "treasurer")
        .single()

      if (!roleError && roleData) {
        treasurerRoleId = roleData.id
      }
    } catch (e) {
      console.warn("Cash Custody API: Could not get treasurer role ID:", e)
    }

    // Filter users with treasurer role (check both direct role and role_id)
    const treasurers = data.filter(
      (user) =>
        (user.role && user.role.toLowerCase() === "treasurer") || (treasurerRoleId && user.role_id === treasurerRoleId),
    )

    console.log(`Cash Custody API: Found ${treasurers.length} treasurers`)
    return treasurers
  } catch (error) {
    console.error("Cash Custody API: Error in getTreasurers:", error)
    throw handleApiError(error, "Get Treasurers")
  }
}
