/**
 * Supabase Integration
 * 
 * This is the main entry point for the Supabase integration.
 * It re-exports all the necessary modules for easy importing.
 */

// Core client
import supabase from './client'
export { supabase }
export { handleApiError } from './client'

// Authentication
export * from './auth'

// Table operations
export * from './tables/users'
export * from './tables/wallets'
export * from './tables/transactions'
export * from './tables/manager_prices'

// React hooks
export { useAuth } from './hooks/useAuth'
export { useWallet, useWallets } from './hooks/useWallets'
export { 
  useRecentTransactions, 
  useWalletTransactions,
  useTransactionStats 
} from './hooks/useTransactions'
export { useManagerPrices } from './hooks/useManagerPrices'

// Utilities
export * from './utils/validation'

// Default export
export default supabase