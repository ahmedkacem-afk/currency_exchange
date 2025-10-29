/**
 * Exchange Rate Calculator
 *
 * Handles conversion logic for buy/sell transactions
 * - For SELL: Use the exchange rate of the currency being SOLD
 * - For BUY: Use the exchange rate of the currency being BOUGHT
 * - Inverse rates: If A→B is X, then B→A is 1/X
 */

/**
 * Calculate the exchange rate for a transaction
 *
 * @param {string} fromCurrency - Currency code being converted FROM
 * @param {string} toCurrency - Currency code being converted TO
 * @param {Array} exchangeRates - Array of exchange rate objects
 * @returns {number} - The exchange rate from fromCurrency to toCurrency
 */
export function calculateExchangeRate(fromCurrency, toCurrency, exchangeRates) {
  // If same currency, rate is 1
  if (fromCurrency === toCurrency) {
    return 1.0
  }

  // Find exchange rates for both currencies
  const fromRate = exchangeRates.find((r) => r.currency_code === fromCurrency)
  const toRate = exchangeRates.find((r) => r.currency_code === toCurrency)

  // If either currency not found, return 1 as default
  if (!fromRate || !toRate) {
    console.warn(`[v0] Exchange rate not found for ${fromCurrency} or ${toCurrency}`)
    return 1.0
  }

  // Determine which base currency to use
  // USD is the primary base, LYD is secondary
  if (fromCurrency === "USD") {
    // USD to another currency: use toCurrency's rate to USD
    return 1 / toRate.rate_to_usd
  } else if (toCurrency === "USD") {
    // Another currency to USD: use fromCurrency's rate to USD
    return fromRate.rate_to_usd
  } else if (fromCurrency === "LYD") {
    // LYD to another currency: convert via USD
    // LYD → USD → other
    const lydToUsd = fromRate.rate_to_usd
    const usdToOther = 1 / toRate.rate_to_usd
    return lydToUsd * usdToOther
  } else if (toCurrency === "LYD") {
    // Another currency to LYD: convert via USD
    // other → USD → LYD
    const otherToUsd = fromRate.rate_to_usd
    const usdToLyd = 1 / toRate.rate_to_usd
    return otherToUsd * usdToLyd
  } else {
    // Both are non-base currencies: convert via USD
    // from → USD → to
    const fromToUsd = fromRate.rate_to_usd
    const usdToTo = 1 / toRate.rate_to_usd
    return fromToUsd * usdToTo
  }
}

/**
 * Get the exchange rate for a specific currency pair
 * Used for SELL transactions - shows what we're selling
 *
 * @param {string} currencyCode - Currency being sold
 * @param {string} baseCurrency - Base currency (USD or LYD)
 * @param {Array} exchangeRates - Array of exchange rate objects
 * @returns {number} - Exchange rate
 */
export function getSellRate(currencyCode, baseCurrency, exchangeRates) {
  if (currencyCode === baseCurrency) {
    return 1.0
  }

  const rate = exchangeRates.find((r) => r.currency_code === currencyCode)
  if (!rate) {
    console.warn(`[v0] Exchange rate not found for ${currencyCode}`)
    return 1.0
  }

  if (baseCurrency === "USD") {
    return rate.rate_to_usd
  } else if (baseCurrency === "LYD") {
    return rate.rate_to_lyd
  }

  return 1.0
}

/**
 * Get the exchange rate for a specific currency pair
 * Used for BUY transactions - shows what we're buying
 *
 * @param {string} currencyCode - Currency being bought
 * @param {string} baseCurrency - Base currency (USD or LYD)
 * @param {Array} exchangeRates - Array of exchange rate objects
 * @returns {number} - Exchange rate (inverse for buying)
 */
export function getBuyRate(currencyCode, baseCurrency, exchangeRates) {
  if (currencyCode === baseCurrency) {
    return 1.0
  }

  const rate = exchangeRates.find((r) => r.currency_code === currencyCode)
  if (!rate) {
    console.warn(`[v0] Exchange rate not found for ${currencyCode}`)
    return 1.0
  }

  if (baseCurrency === "USD") {
    // For buying: inverse of sell rate
    return 1 / rate.rate_to_usd
  } else if (baseCurrency === "LYD") {
    // For buying: inverse of sell rate
    return 1 / rate.rate_to_lyd
  }

  return 1.0
}

export default {
  calculateExchangeRate,
  getSellRate,
  getBuyRate,
}
