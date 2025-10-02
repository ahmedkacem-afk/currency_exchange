/**
 * useWallet Hook
 * 
 * Custom React hook for wallet data and operations
 */

import { useState, useEffect, useCallback } from 'react'
import * as walletsApi from '../tables/wallets'

/**
 * Hook to fetch and manage a wallet by ID
 * 
 * @param {string} walletId - ID of wallet to fetch
 * @returns {Object} - Wallet data and functions
 */
export function useWallet(walletId) {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch wallet data
  useEffect(() => {
    async function fetchWallet() {
      if (!walletId) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        const data = await walletsApi.getWalletById(walletId)
        setWallet(data)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching wallet:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchWallet()
  }, [walletId])
  
  // Update wallet function
  const updateWallet = useCallback(async (updates) => {
    if (!walletId) return
    
    try {
      setLoading(true)
      setError(null)
      const updated = await walletsApi.updateWallet(walletId, updates)
      setWallet(updated)
      return updated
    } catch (err) {
      setError(err.message)
      console.error('Error updating wallet:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [walletId])
  
  // Delete wallet function
  const deleteWallet = useCallback(async () => {
    if (!walletId) return
    
    try {
      setLoading(true)
      setError(null)
      await walletsApi.deleteWallet(walletId)
      setWallet(null)
    } catch (err) {
      setError(err.message)
      console.error('Error deleting wallet:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [walletId])
  
  return {
    wallet,
    loading,
    error,
    updateWallet,
    deleteWallet
  }
}

/**
 * Hook to fetch and manage all wallets
 * 
 * @returns {Object} - Wallets data and functions
 */
export function useWallets() {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch wallets
  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { wallets: data } = await walletsApi.getWallets()
      setWallets(data)
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error fetching wallets:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Load wallets on initial render
  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])
  
  // Create wallet function
  const createWallet = useCallback(async (walletData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await walletsApi.createWallet(walletData)
      
      // Refresh the wallets list after creating
      await fetchWallets()
      
      return result.wallet
    } catch (err) {
      setError(err.message)
      console.error('Error creating wallet:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchWallets])
  
  return {
    wallets,
    loading,
    error,
    fetchWallets,
    createWallet
  }
}