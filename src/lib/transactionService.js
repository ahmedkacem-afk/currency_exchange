import { updateWalletCurrencyBalance } from "./supabase/tables/wallets.js"
import { updateCustodyBalance } from "./supabase/tables/custody.js"
import { getAllUsers } from "./supabase/tables/users.js"
import { getRoleByName } from "./supabase/tables/roles.js"
import { generateUUID } from "./uuid.js"
import supabase from "./supabase/client.js"

/**
 * Generate a guaranteed unique transaction ID
 * This function ensures proper UUID format with 36 characters
 * @returns {string} A valid UUID string suitable for the transactions table
 */
function generateUniqueTransactionId() {
  // Get a base UUID
  let uuid = generateUUID()

  // Validate UUID is exactly 36 characters with proper format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  // If somehow the UUID isn't valid, create a properly formatted one manually
  if (!uuidRegex.test(uuid) || uuid.length !== 36) {
    console.warn("Invalid UUID generated, creating manual replacement")

    // Create a properly formatted UUID manually
    const segments = [
      Math.random().toString(16).substring(2, 10),
      Math.random().toString(16).substring(2, 6),
      "4" + Math.random().toString(16).substring(2, 5),
      (8 + Math.floor(Math.random() * 4)).toString(16) + Math.random().toString(16).substring(2, 5),
      Date.now().toString(16).substring(0, 12),
    ]

    uuid = segments.join("-")

    // Ensure the length is exactly 36 characters
    if (uuid.length < 36) {
      uuid = uuid.padEnd(36, "0")
    } else if (uuid.length > 36) {
      uuid = uuid.substring(0, 36)
    }
  }

  console.log(`Generated transaction ID: ${uuid} (length: ${uuid.length})`)
  return uuid
}

/**
 * Helper function to get custody name from custody ID
 * Uses the custody.name field which is already formatted as user.name_currency_type
 * @param {string} custodyId - The custody record ID
 * @returns {Promise<string>} - Formatted custody name
 */
export async function getCustodyNameForTransaction(custodyId) {
  try {
    if (!custodyId) return "Custody"

    const { data: custodyData, error } = await supabase
      .from("custody")
      .select("id, name, currency_code")
      .eq("id", custodyId)
      .single()

    if (error || !custodyData) {
      console.warn(`Could not fetch custody ${custodyId}:`, error)
      return `Custody_${custodyId}`
    }

    // Use the name field directly - it's already formatted as user.name_currency_type
    return custodyData.name || `Custody_${custodyId}`
  } catch (error) {
    console.error("Error getting custody name:", error)
    return `Custody_${custodyId}`
  }
}

/**
 * Helper function to get wallet name
 * @param {string} walletId - The wallet ID
 * @returns {Promise<string>} - Wallet name
 */
export async function getWalletNameForTransaction(walletId) {
  try {
    if (!walletId) return "Wallet"

    const { data: walletData, error } = await supabase.from("wallets").select("name").eq("id", walletId).single()

    if (error || !walletData) {
      console.warn(`Could not fetch wallet ${walletId}:`, error)
      return `Wallet_${walletId}`
    }

    return walletData.name
  } catch (error) {
    console.error("Error getting wallet name:", error)
    return `Wallet_${walletId}`
  }
}

/**
 * Service for handling transaction API operations in a consistent way across the application
 */
export const transactionService = {
  /**
   * Creates a buy transaction (customer selling currency to us)
   *
   * @param {Object} data - Transaction data
   * @param {string} data.sourceWallet - Source wallet ID or special value ('client', 'custody:id')
   * @param {string} data.destinationWallet - Destination wallet ID or special value ('client', 'custody:id')
   * @param {string} data.receiveCurrencyCode - Currency received from customer
   * @param {string} data.payCurrencyCode - Currency paid to customer
   * @param {number} data.amount - Amount of currency to buy
   * @param {number} data.price - Exchange rate
   * @param {string} data.clientName - Client name for reference
   * @returns {Promise<Object>} - Transaction result
   */
  createBuyTransaction: async (data) => {
    console.log("Creating buy transaction with data:", data)

    const sourceType = data.sourceWallet ? data.sourceWallet.split(":")[0] : "client"
    const sourceId = data.sourceWallet ? data.sourceWallet.split(":")[1] || data.sourceWallet : null

    const destinationType = data.destinationWallet ? data.destinationWallet.split(":")[0] : null
    const destinationId = data.destinationWallet ? data.destinationWallet.split(":")[1] || data.destinationWallet : null

    console.log("Source:", sourceType, sourceId)
    console.log("Destination:", destinationType, destinationId)

    let sourceName = "Client"
    let destinationName = "Client"

    if (sourceType === "wallet" && sourceId) {
      sourceName = await getWalletNameForTransaction(sourceId)
    } else if (sourceType === "custody" && sourceId) {
      sourceName = await getCustodyNameForTransaction(sourceId)
    }

    if (destinationType === "wallet" && destinationId) {
      destinationName = await getWalletNameForTransaction(destinationId)
    } else if (destinationType === "custody" && destinationId) {
      destinationName = await getCustodyNameForTransaction(destinationId)
    }

    console.log("[v0] Source name:", sourceName, "Destination name:", destinationName)

    // Get current user session for cashier ID
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user) {
      throw new Error("User not authenticated")
    }

    const transactionData = {
      id: generateUniqueTransactionId(),
      type: "buy",
      walletid: destinationType === "wallet" ? destinationId : null,
      currency_code: data.receiveCurrencyCode,
      amount: Number.parseFloat(data.amount),
      exchange_currency_code: data.payCurrencyCode,
      exchange_rate: Number.parseFloat(data.price),
      total_amount: Number.parseFloat(data.total),
      client_name: data.clientName,
      cashier_id: user.id,
      source: sourceName,
      destination: destinationName,
      createdat: Date.now(),
    }

    // Insert transaction record
    const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()

    if (error) throw error

    // Handle custody-to-custody case
    if (sourceType === "custody" && destinationType === "custody") {
      console.log("Custody to custody transfer")
      await updateCustodyBalance(sourceId, -Number.parseFloat(data.amount))
      await updateCustodyBalance(destinationId, Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle custody-to-wallet case
    if (sourceType === "custody" && destinationType === "wallet") {
      console.log("Custody to wallet transfer")
      await updateCustodyBalance(sourceId, -Number.parseFloat(data.amount))
      await updateWalletCurrencyBalance(destinationId, data.receiveCurrencyCode, Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle custody-to-client case
    if (sourceType === "custody" && !destinationType) {
      console.log("Custody to client transfer")
      await updateCustodyBalance(sourceId, -Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle wallet-to-custody case
    if (sourceType === "wallet" && destinationType === "custody") {
      console.log("Wallet to custody transfer")
      await updateWalletCurrencyBalance(sourceId, data.receiveCurrencyCode, -Number.parseFloat(data.amount))
      await updateCustodyBalance(destinationId, Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle wallet-to-wallet case
    if (sourceType === "wallet" && destinationType === "wallet") {
      console.log("Wallet to wallet transfer")
      await updateWalletCurrencyBalance(sourceId, data.receiveCurrencyCode, -Number.parseFloat(data.amount))
      await updateWalletCurrencyBalance(destinationId, data.receiveCurrencyCode, Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle wallet-to-client case
    if (sourceType === "wallet" && !destinationType) {
      console.log("Wallet to client transfer")
      await updateWalletCurrencyBalance(sourceId, data.receiveCurrencyCode, -Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle client-to-custody case
    if (!sourceType && destinationType === "custody") {
      console.log("Client to custody transfer")
      await updateCustodyBalance(destinationId, Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle client-to-wallet case
    if (!sourceType && destinationType === "wallet") {
      console.log("Client to wallet transfer")
      await updateWalletCurrencyBalance(destinationId, data.receiveCurrencyCode, Number.parseFloat(data.amount))
      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle client-to-client case (default)
    console.log("Client to client transfer")
    return { transaction, source: sourceName, destination: destinationName }
  },

  /**
   * Creates a sell transaction (us selling currency to the customer)
   *
   * @param {Object} data - Transaction data
   * @param {string} data.sourceWallet - Source wallet ID or special value ('client', 'custody:id')
   * @param {string} data.sellCurrencyCode - Currency to sell to customer
   * @param {string} data.receiveCurrencyCode - Currency to receive from customer
   * @param {number} data.amount - Amount of currency to sell
   * @param {number} data.price - Exchange rate
   * @param {string} data.clientName - Client name for reference
   * @returns {Promise<Object>} - Transaction result
   */
  createSellTransaction: async (data) => {
    console.log("Creating sell transaction with data:", data)

    const sourceType = data.sourceWallet ? data.sourceWallet.split(":")[0] : "client"
    const sourceId = data.sourceWallet ? data.sourceWallet.split(":")[1] || data.sourceWallet : null

    const destinationType = data.destinationWallet ? data.destinationWallet.split(":")[0] : "client"
    const destinationId = data.destinationWallet ? data.destinationWallet.split(":")[1] || data.destinationWallet : null

    console.log("Source:", sourceType, sourceId)
    console.log("Destination:", destinationType, destinationId)

    let sourceName = "Client"
    let destinationName = "Client"

    if (sourceType === "wallet" && sourceId) {
      sourceName = await getWalletNameForTransaction(sourceId)
    } else if (sourceType === "custody" && sourceId) {
      sourceName = await getCustodyNameForTransaction(sourceId)
    }

    if (destinationType === "wallet" && destinationId) {
      destinationName = await getWalletNameForTransaction(destinationId)
    } else if (destinationType === "custody" && destinationId) {
      destinationName = await getCustodyNameForTransaction(destinationId)
    }

    console.log("[v0] Source name:", sourceName, "Destination name:", destinationName)

    // Get current user session for cashier ID
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Handle custody-to-custody case
    if (sourceType === "custody" && destinationType === "custody") {
      console.log("Custody to custody transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "transfer",
        walletid: null,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName || "Internal Transfer",
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateCustodyBalance(sourceId, -Number.parseFloat(data.amount))
      await updateCustodyBalance(destinationId, Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle custody-to-wallet case
    if (sourceType === "custody" && destinationType === "wallet") {
      console.log("Custody to wallet transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: destinationId,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName || "Custody to Wallet Transfer",
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateCustodyBalance(sourceId, -Number.parseFloat(data.amount))
      await updateWalletCurrencyBalance(destinationId, data.sellCurrencyCode, Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle custody-to-client case
    if (sourceType === "custody" && destinationType === "client") {
      console.log("Custody to client transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: null,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateCustodyBalance(sourceId, -Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle wallet-to-custody case
    if (sourceType === "wallet" && destinationType === "custody") {
      console.log("Wallet to custody transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: sourceId,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName || "Wallet to Custody Transfer",
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateWalletCurrencyBalance(sourceId, data.sellCurrencyCode, -Number.parseFloat(data.amount))
      await updateCustodyBalance(destinationId, Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle wallet-to-wallet case
    if (sourceType === "wallet" && destinationType === "wallet") {
      console.log("Wallet to wallet transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: sourceId,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName || "Wallet to Wallet Transfer",
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateWalletCurrencyBalance(sourceId, data.sellCurrencyCode, -Number.parseFloat(data.amount))
      await updateWalletCurrencyBalance(destinationId, data.sellCurrencyCode, Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle wallet-to-client case
    if (sourceType === "wallet" && destinationType === "client") {
      console.log("Wallet to client transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: sourceId,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateWalletCurrencyBalance(sourceId, data.sellCurrencyCode, -Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle client-to-custody case
    if (sourceType === "client" && destinationType === "custody") {
      console.log("Client to custody transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: null,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateCustodyBalance(destinationId, Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle client-to-wallet case
    if (sourceType === "client" && destinationType === "wallet") {
      console.log("Client to wallet transfer")

      const transactionData = {
        id: generateUniqueTransactionId(),
        type: "sell",
        walletid: destinationId,
        currency_code: data.sellCurrencyCode,
        amount: Number.parseFloat(data.amount),
        exchange_currency_code: data.receiveCurrencyCode,
        exchange_rate: Number.parseFloat(data.price),
        total_amount: Number.parseFloat(data.total),
        client_name: data.clientName,
        cashier_id: user.id,
        source: sourceName,
        destination: destinationName,
        createdat: Date.now(),
      }

      const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
      if (error) throw error

      await updateWalletCurrencyBalance(destinationId, data.sellCurrencyCode, Number.parseFloat(data.amount))

      return { transaction, source: sourceName, destination: destinationName }
    }

    // Handle client-to-client case (default)
    console.log("Client to client transfer")

    const transactionData = {
      id: generateUniqueTransactionId(),
      type: "sell",
      walletid: null,
      currency_code: data.sellCurrencyCode,
      amount: Number.parseFloat(data.amount),
      exchange_currency_code: data.receiveCurrencyCode,
      exchange_rate: Number.parseFloat(data.price),
      total_amount: Number.parseFloat(data.total),
      client_name: data.clientName,
      cashier_id: user.id,
      source: sourceName,
      destination: destinationName,
      createdat: Date.now(),
    }

    const { data: transaction, error } = await supabase.from("transactions").insert(transactionData).select().single()
    if (error) throw error

    return { transaction, source: sourceName, destination: destinationName }
  },

  /**
   * Get all cashiers and managers for treasury management
   *
   * This function extracts all users with the 'cashier' or 'manager' role in the system
   * @returns {Promise<Array>} - List of cashier and manager users with their details
   */
  getAllCashiers: async () => {
    try {
      console.log("TransactionService: Getting all cashiers and managers...")

      // Get all users first
      const { users } = await getAllUsers({ limit: 100 })

      if (!users || users.length === 0) {
        console.warn("TransactionService: No users found")
        return []
      }

      // Try to get the cashier and manager role IDs
      let cashierRoleId = null
      let managerRoleId = null
      try {
        const cashierRole = await getRoleByName("cashier")
        cashierRoleId = cashierRole?.id
        const managerRole = await getRoleByName("manager")
        managerRoleId = managerRole?.id
      } catch (error) {
        console.warn("TransactionService: Error getting role IDs:", error)
      }

      const cashiersAndManagers = users.filter((user) => {
        const isCashier =
          (user.role && user.role.toLowerCase() === "cashier") || (cashierRoleId && user.role_id === cashierRoleId)
        const isManager =
          (user.role && user.role.toLowerCase() === "manager") || (managerRoleId && user.role_id === managerRoleId)
        return isCashier || isManager
      })

      console.log(`TransactionService: Found ${cashiersAndManagers.length} cashiers and managers`)
      return cashiersAndManagers
    } catch (error) {
      console.error("TransactionService: Error getting cashiers:", error)
      return []
    }
  },

  /**
   * Get all managers for treasury management
   *
   * This function extracts all users with the 'manager' role in the system
   * @returns {Promise<Array>} - List of manager users with their details
   */
  getAllManagers: async () => {
    try {
      console.log("TransactionService: Getting all managers...")

      // Get all users first
      const { users } = await getAllUsers({ limit: 100 })

      if (!users || users.length === 0) {
        console.warn("TransactionService: No users found")
        return []
      }

      // Try to get the manager role ID
      let managerRoleId = null
      try {
        const managerRole = await getRoleByName("manager")
        managerRoleId = managerRole?.id
      } catch (error) {
        console.warn("TransactionService: Error getting manager role by name:", error)
      }

      // Filter users who have manager role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const managers = users.filter((user) => {
        return (user.role && user.role.toLowerCase() === "manager") || (managerRoleId && user.role_id === managerRoleId)
      })

      console.log(`TransactionService: Found ${managers.length} managers`)
      return managers
    } catch (error) {
      console.error("TransactionService: Error getting managers:", error)
      return []
    }
  },

  /**
   * Get all treasurers for treasury management
   *
   * This function extracts all users with the 'treasurer' role in the system
   * @returns {Promise<Array>} - List of treasurer users with their details
   */
  getAllTreasurers: async () => {
    try {
      console.log("TransactionService: Getting all treasurers...")

      // Get all users first
      const { users } = await getAllUsers({ limit: 100 })

      if (!users || users.length === 0) {
        console.warn("TransactionService: No users found")
        return []
      }

      // Try to get the treasurer role ID
      let treasurerRoleId = null
      try {
        const treasurerRole = await getRoleByName("treasurer")
        treasurerRoleId = treasurerRole?.id
      } catch (error) {
        console.warn("TransactionService: Error getting treasurer role by name:", error)
      }

      // Filter users who have treasurer role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const treasurers = users.filter((user) => {
        return (
          (user.role && user.role.toLowerCase() === "treasurer") ||
          (treasurerRoleId && user.role_id === treasurerRoleId)
        )
      })

      console.log(`TransactionService: Found ${treasurers.length} treasurers`)
      return treasurers
    } catch (error) {
      console.error("TransactionService: Error getting treasurers:", error)
      return []
    }
  },

  /**
   * Get all users by role for treasury management
   *
   * @param {string} roleName - The name of the role to filter by ('cashier', 'manager', 'treasurer', etc.)
   * @returns {Promise<Array>} - List of users with the specified role
   */
  getUsersByRole: async (roleName) => {
    try {
      console.log(`TransactionService: Getting users with role '${roleName}'...`)

      if (!roleName) {
        throw new Error("Role name is required")
      }

      // Get all users first
      const { users } = await getAllUsers({ limit: 100 })

      if (!users || users.length === 0) {
        console.warn("TransactionService: No users found")
        return []
      }

      // Try to get the role ID
      let roleId = null
      try {
        const role = await getRoleByName(roleName)
        roleId = role?.id
      } catch (error) {
        console.warn(`TransactionService: Error getting role by name '${roleName}':`, error)
      }

      // Filter users who have the specified role
      // Check both the legacy 'role' string and the newer 'role_id' reference
      const filteredUsers = users.filter((user) => {
        return (user.role && user.role.toLowerCase() === roleName.toLowerCase()) || (roleId && user.role_id === roleId)
      })

      console.log(`TransactionService: Found ${filteredUsers.length} users with role '${roleName}'`)
      return filteredUsers
    } catch (error) {
      console.error(`TransactionService: Error getting users with role '${roleName}':`, error)
      return []
    }
  },
}
