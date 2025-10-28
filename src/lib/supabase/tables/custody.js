/**
 * Custody API Functions
 *
 * This module handles operations related to user custody records
 */

import supabase, { handleApiError } from "../../supabase/client.js"

/**
 * Get all custody records for the current user
 *
 * @returns {Promise<Array>} - Array of custody records with currency information
 */
export async function getUserCustodyRecords() {
  try {
    console.log("Custody API: Fetching all custody records...")

    // Get current user session
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user || !user.id) {
      console.error("Custody API: No authenticated user found")
      throw new Error("User not authenticated")
    }

    console.log("Custody API: Getting all custody records")

    const { data: custodyRecords, error } = await supabase
      .from("custody")
      .select("id, user_id, currency_code, amount, updated_at, name, users:user_id(name)")

    if (error) {
      console.error("Custody API: Error fetching custody records:", error)
      throw error
    }

    if (!custodyRecords || custodyRecords.length === 0) {
      console.log("Custody API: No custody records found for user")
      return []
    }

    console.log("Custody API: Found", custodyRecords.length, "custody records")
    console.log("Custody API: Raw custody records from DB:", JSON.stringify(custodyRecords))

    // Format the records for display
    const formattedRecords = custodyRecords.map((record) => {
      const userName = record.users?.name || "Unknown User"
      const custodyName = record.name || `${userName}_${record.currency_code}`

      return {
        id: record.id,
        userId: record.user_id,
        currencyCode: record.currency_code,
        amount: Number.parseFloat(record.amount),
        updatedAt: record.updated_at,
        name: record.name,
        // Format for dropdown display using name from database
        displayName: `${custodyName}: ${Number.parseFloat(record.amount).toFixed(2)}`,
        // Add formatted value for dropdown selection
        value: `custody:${record.id}`,
      }
    })

    console.log("Custody API: Formatted custody records for dropdown:", JSON.stringify(formattedRecords))
    return formattedRecords
  } catch (error) {
    console.error("Custody API: Error in getUserCustodyRecords:", error)
    throw handleApiError(error, "Get User Custody Records")
  }
}

/**
 * Update user custody record balance
 *
 * @param {string} custodyId - ID of the custody record to update
 * @param {number} amount - Amount to add (positive) or subtract (negative) from the custody record
 * @returns {Promise<Object>} - Updated custody record
 */
export async function updateCustodyBalance(custodyId, amount) {
  try {
    console.log(`Custody API: Updating custody ${custodyId} balance by ${amount}`)

    if (!custodyId) throw new Error("Custody ID is required")

    // First get the current custody record
    const { data: custody, error: getError } = await supabase.from("custody").select("*").eq("id", custodyId).single()

    if (getError) {
      console.error("Custody API: Error fetching custody record:", getError)
      throw getError
    }

    if (!custody) {
      throw new Error("Custody record not found")
    }

    // Calculate new balance
    const newBalance = Number.parseFloat(custody.amount) + Number.parseFloat(amount)

    if (newBalance < 0) {
      throw new Error(`Insufficient funds in custody. Available: ${custody.amount} ${custody.currency_code}`)
    }

    // Update the custody record
    const { data: updatedCustody, error: updateError } = await supabase
      .from("custody")
      .update({
        amount: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", custodyId)
      .select()
      .single()

    if (updateError) {
      console.error("Custody API: Error updating custody balance:", updateError)
      throw updateError
    }

    console.log("Custody API: Updated custody balance successfully:", updatedCustody)

    return updatedCustody
  } catch (error) {
    console.error("Custody API: Error in updateCustodyBalance:", error)
    throw handleApiError(error, "Update Custody Balance")
  }
}

/**
 * Get non-treasurer wallets for selection
 *
 * @returns {Promise<Array>} Array of wallets that are not treasury wallets
 */
export async function getNonTreasuryWallets() {
  try {
    console.log("Custody API: Fetching non-treasury wallets...")

    // Get all wallets first
    const { data: wallets, error } = await supabase.from("wallets").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Custody API: Error fetching wallets:", error)
      throw error
    }

    // Filter out treasury wallets
    const nonTreasuryWallets = wallets.filter((wallet) => !wallet.is_treasury)

    console.log("Custody API: Found", nonTreasuryWallets.length, "non-treasury wallets")

    return nonTreasuryWallets
  } catch (error) {
    console.error("Custody API: Error in getNonTreasuryWallets:", error)
    throw handleApiError(error, "Get Non-Treasury Wallets")
  }
}

/**
 * Format custody records for currency selector components
 *
 * @param {string} currencyCode - The currency code to filter by
 * @param {boolean} excludeEmpty - Whether to exclude empty custody records
 * @returns {Promise<Array>} Array of formatted custody records for dropdown selection
 */
export async function getFormattedCustodyOptions(currencyCode = null, excludeEmpty = true) {
  try {
    console.log("Custody API: Formatting custody options", currencyCode ? `for ${currencyCode}` : "for all currencies")

    // Get all user custody records
    const custodyRecords = await getUserCustodyRecords()

    if (!custodyRecords || custodyRecords.length === 0) {
      console.log("Custody API: No custody records found for formatting")
      return []
    }

    // Filter by currency code if provided and exclude empty records if requested
    let filteredRecords = custodyRecords

    // Apply currency filter if provided
    if (currencyCode) {
      filteredRecords = filteredRecords.filter(
        (record) => record.currencyCode.toLowerCase() === currencyCode.toLowerCase(),
      )
    }

    // Exclude records with zero balance if requested
    if (excludeEmpty) {
      filteredRecords = filteredRecords.filter((record) => Number.parseFloat(record.amount) > 0)
    }

    console.log("Custody API: Filtered custody records:", filteredRecords.length)

    // Filter out empty records if requested
    if (excludeEmpty) {
      filteredRecords = filteredRecords.filter((record) => record.amount > 0)
    }

    // Format for dropdown - use consistent naming with getUserCustodyRecords
    const formattedOptions = filteredRecords.map((record) => ({
      label: record.displayName, // Use the already formatted display name
      value: `custody:${record.id}`,
      currencyCode: record.currencyCode,
      balance: record.amount,
      type: "custody",
    }))

    console.log("Custody API: Formatted", formattedOptions.length, "custody options")
    return formattedOptions
  } catch (error) {
    console.error("Custody API: Error formatting custody options:", error)
    throw handleApiError(error, "Format Custody Options")
  }
}

/**
 * Get combined wallet and custody options for a currency
 *
 * @param {string} currencyCode - The currency code to filter by
 * @returns {Promise<Array>} Combined array of wallet and custody options
 */
export async function getCombinedWalletAndCustodyOptions(currencyCode) {
  try {
    console.log("Custody API: Getting combined wallet and custody options for", currencyCode)

    // Get custody options
    const custodyOptions = await getFormattedCustodyOptions(currencyCode)

    // Get non-treasury wallets
    const wallets = await getNonTreasuryWallets()

    // Format wallet options - only include wallets with the specified currency
    const walletOptions = wallets
      .filter(
        (wallet) =>
          wallet.currencies &&
          wallet.currencies[currencyCode] &&
          Number.parseFloat(wallet.currencies[currencyCode]) > 0,
      )
      .map((wallet) => ({
        label: `${wallet.name}: ${Number.parseFloat(wallet.currencies[currencyCode]).toFixed(2)} ${currencyCode}`,
        value: `wallet:${wallet.id}`,
        currencyCode: currencyCode,
        balance: Number.parseFloat(wallet.currencies[currencyCode]),
        type: "wallet",
      }))

    // Combine options
    const combinedOptions = [...custodyOptions, ...walletOptions]

    console.log("Custody API: Combined", combinedOptions.length, "options")
    return combinedOptions
  } catch (error) {
    console.error("Custody API: Error getting combined options:", error)
    throw handleApiError(error, "Get Combined Options")
  }
}
