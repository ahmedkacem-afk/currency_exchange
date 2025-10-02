/**
 * useManagerPrices Hook
 * 
 * Custom React hook for manager prices data and operations
 */

import { useState, useEffect, useCallback } from 'react'
import * as managerPricesApi from '../tables/manager_prices'

/**
 * Hook to fetch and manage manager prices
 * 
 * @param {Object} options - Options
 * @param {boolean} options.autoLoad - Whether to load automatically
 * @returns {Object} - Manager prices data and functions
 */
export function useManagerPrices({ autoLoad = true } = {}) {
  const [prices, setPrices] = useState(null)
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState(null)
  
  // Fetch prices
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await managerPricesApi.getManagerPrices()
      setPrices(data)
      
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error fetching manager prices:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Load prices on initial render if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      fetchPrices()
    }
  }, [fetchPrices, autoLoad])
  
  // Update prices
  const updatePrices = useCallback(async ({ buyPrice, sellPrice }) => {
    try {
      setLoading(true)
      setError(null)
      
      const updated = await managerPricesApi.updateManagerPrices({
        buyPrice,
        sellPrice
      })
      
      setPrices(updated)
      return updated
    } catch (err) {
      setError(err.message)
      console.error('Error updating manager prices:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    prices,
    buyPrice: prices?.buyprice,
    sellPrice: prices?.sellprice,
    loading,
    error,
    fetchPrices,
    updatePrices
  }
}