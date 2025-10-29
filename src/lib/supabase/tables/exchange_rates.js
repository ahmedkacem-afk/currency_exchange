/**
 * Exchange Rates API
 *
 * Manages exchange rates for all currencies with USD and LYD
 */

import supabase, { handleApiError } from "../client"

/**
 * Gets all exchange rates
 *
 * @returns {Promise<Array>} - Array of exchange rate records
 */
export async function getExchangeRates() {
  try {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("currency_code", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    throw handleApiError(error, "Get Exchange Rates")
  }
}

/**
 * Gets exchange rate for a specific currency
 *
 * @param {string} currencyCode - Currency code (e.g., 'EUR', 'GBP')
 * @returns {Promise<Object>} - Exchange rate record
 */
export async function getExchangeRate(currencyCode) {
  try {
    const { data, error } = await supabase.from("exchange_rates").select("*").eq("currency_code", currencyCode).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    // If no record exists, create default one
    if (!data) {
      return await createExchangeRate(currencyCode, 1.0, 5.0)
    }

    return data
  } catch (error) {
    throw handleApiError(error, "Get Exchange Rate")
  }
}

/**
 * Creates a new exchange rate for a currency
 *
 * @param {string} currencyCode - Currency code
 * @param {number} rateToUsd - Exchange rate to USD
 * @param {number} rateToLyd - Exchange rate to LYD
 * @returns {Promise<Object>} - Created exchange rate record
 */
export async function createExchangeRate(currencyCode, rateToUsd, rateToLyd) {
  try {
    const { data, error } = await supabase
      .from("exchange_rates")
      .insert({
        currency_code: currencyCode,
        rate_to_usd: rateToUsd,
        rate_to_lyd: rateToLyd,
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    throw handleApiError(error, "Create Exchange Rate")
  }
}

/**
 * Updates exchange rates for a currency
 *
 * @param {string} currencyCode - Currency code
 * @param {number} rateToUsd - Exchange rate to USD
 * @param {number} rateToLyd - Exchange rate to LYD
 * @returns {Promise<Object>} - Updated exchange rate record
 */
export async function updateExchangeRate(currencyCode, rateToUsd, rateToLyd) {
  try {
    const { data, error } = await supabase
      .from("exchange_rates")
      .update({
        rate_to_usd: rateToUsd,
        rate_to_lyd: rateToLyd,
        updated_at: new Date().toISOString(),
      })
      .eq("currency_code", currencyCode)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    throw handleApiError(error, "Update Exchange Rate")
  }
}

/**
 * Deletes an exchange rate
 *
 * @param {string} currencyCode - Currency code
 * @returns {Promise<void>}
 */
export async function deleteExchangeRate(currencyCode) {
  try {
    const { error } = await supabase.from("exchange_rates").delete().eq("currency_code", currencyCode)

    if (error) throw error
  } catch (error) {
    throw handleApiError(error, "Delete Exchange Rate")
  }
}

export default {
  getExchangeRates,
  getExchangeRate,
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
}
