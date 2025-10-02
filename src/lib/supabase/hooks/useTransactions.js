/**
 * useTransactions Hook
 * 
 * Custom React hook for transaction data and operations
 */

import { useState, useEffect, useCallback } from 'react'
import * as transactionsApi from '../tables/transactions'

/**
 * Hook to fetch and manage recent transactions
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {boolean} options.autoLoad - Whether to load automatically
 * @returns {Object} - Transaction data and functions
 */
export function useRecentTransactions({ limit = 30, autoLoad = true } = {}) {
  const [transactions, setTransactions] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  
  // Fetch transactions
  const fetchTransactions = useCallback(async (pageNum = 0) => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = pageNum * limit
      const { transactions: data, total } = await transactionsApi.getRecentTransactions({
        limit,
        offset
      })
      
      setTransactions(data)
      setTotalCount(total)
      setPage(pageNum)
      
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error fetching transactions:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [limit])
  
  // Load transactions on initial render if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      fetchTransactions(0)
    }
  }, [fetchTransactions, autoLoad])
  
  // Handle pagination
  const goToPage = useCallback((pageNum) => {
    fetchTransactions(pageNum)
  }, [fetchTransactions])
  
  // Next page
  const nextPage = useCallback(() => {
    const nextPageNum = page + 1
    if (nextPageNum * limit < totalCount) {
      goToPage(nextPageNum)
      return true
    }
    return false
  }, [page, limit, totalCount, goToPage])
  
  // Previous page
  const previousPage = useCallback(() => {
    if (page > 0) {
      goToPage(page - 1)
      return true
    }
    return false
  }, [page, goToPage])
  
  return {
    transactions,
    loading,
    error,
    totalCount,
    currentPage: page,
    fetchTransactions,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: (page + 1) * limit < totalCount,
    hasPreviousPage: page > 0
  }
}

/**
 * Hook to fetch and manage transactions for a specific wallet
 * 
 * @param {string} walletId - Wallet ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {boolean} options.autoLoad - Whether to load automatically
 * @returns {Object} - Transaction data and functions
 */
export function useWalletTransactions(walletId, { limit = 30, autoLoad = true } = {}) {
  const [transactions, setTransactions] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  
  // Fetch transactions for wallet
  const fetchTransactions = useCallback(async (pageNum = 0) => {
    if (!walletId) {
      setTransactions([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const offset = pageNum * limit
      const { transactions: data, total } = await transactionsApi.getTransactionsByWallet(
        walletId, 
        {
          limit,
          offset
        }
      )
      
      setTransactions(data)
      setTotalCount(total)
      setPage(pageNum)
      
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error fetching wallet transactions:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [walletId, limit])
  
  // Load transactions on initial render if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      fetchTransactions(0)
    }
  }, [fetchTransactions, autoLoad, walletId])
  
  // Handle pagination
  const goToPage = useCallback((pageNum) => {
    fetchTransactions(pageNum)
  }, [fetchTransactions])
  
  // Next page
  const nextPage = useCallback(() => {
    const nextPageNum = page + 1
    if (nextPageNum * limit < totalCount) {
      goToPage(nextPageNum)
      return true
    }
    return false
  }, [page, limit, totalCount, goToPage])
  
  // Previous page
  const previousPage = useCallback(() => {
    if (page > 0) {
      goToPage(page - 1)
      return true
    }
    return false
  }, [page, goToPage])
  
  // Create a buy transaction
  const createBuyTransaction = useCallback(async (data) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await transactionsApi.createBuyTransaction({
        walletId,
        ...data
      })
      
      // Refresh transactions
      await fetchTransactions(0)
      
      return result
    } catch (err) {
      setError(err.message)
      console.error('Error creating buy transaction:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [walletId, fetchTransactions])
  
  // Create a sell transaction
  const createSellTransaction = useCallback(async (data) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await transactionsApi.createSellTransaction({
        walletId,
        ...data
      })
      
      // Refresh transactions
      await fetchTransactions(0)
      
      return result
    } catch (err) {
      setError(err.message)
      console.error('Error creating sell transaction:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [walletId, fetchTransactions])
  
  return {
    transactions,
    loading,
    error,
    totalCount,
    currentPage: page,
    fetchTransactions,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: (page + 1) * limit < totalCount,
    hasPreviousPage: page > 0,
    createBuyTransaction,
    createSellTransaction
  }
}

/**
 * Hook to fetch transaction statistics
 */
export function useTransactionStats({ autoLoad = true } = {}) {
  const [stats, setStats] = useState({
    buyAverage: null,
    sellAverage: null,
    recentTransactions: []
  })
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState(null)
  
  // Fetch transaction stats
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await transactionsApi.getTransactionStats()
      setStats(data)
      
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error fetching transaction stats:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Load stats on initial render if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      fetchStats()
    }
  }, [fetchStats, autoLoad])
  
  return {
    ...stats,
    loading,
    error,
    fetchStats
  }
}