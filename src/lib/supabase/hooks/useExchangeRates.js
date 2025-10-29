"use client"

/**
 * Hook for managing exchange rates
 */

import { useState, useEffect } from "react"
import * as exchangeRatesApi from "../tables/exchange_rates"

export function useExchangeRates() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRates()
  }, [])

  const loadRates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await exchangeRatesApi.getExchangeRates()
      setRates(data)
    } catch (err) {
      setError(err.message)
      console.error("Error loading exchange rates:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateRate = async (currencyCode, rateToUsd, rateToLyd) => {
    try {
      const updated = await exchangeRatesApi.updateExchangeRate(currencyCode, rateToUsd, rateToLyd)
      setRates(rates.map((r) => (r.currency_code === currencyCode ? updated : r)))
      return updated
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const addRate = async (currencyCode, rateToUsd, rateToLyd) => {
    try {
      const created = await exchangeRatesApi.createExchangeRate(currencyCode, rateToUsd, rateToLyd)
      setRates([...rates, created])
      return created
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    rates,
    loading,
    error,
    loadRates,
    updateRate,
    addRate,
  }
}
