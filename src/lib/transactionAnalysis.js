/**
 * Transaction Analysis Functions
 * 
 * This module provides functions to analyze wallet transactions for currency pairs
 * and calculate median exchange rates.
 */

import supabase from './supabase/client';

/**
 * Get all transactions for a specific wallet
 * @param {string} walletId - The wallet ID to analyze
 * @returns {Promise<Array>} Array of transactions
 */
export async function getWalletTransactions(walletId) {
  try {
    // Find the wallet name (used in cashier UI for source/destination when walletid is null)
    let walletName = null;
    if (walletId) {
      const { data: walletRow } = await supabase
        .from('wallets')
        .select('name')
        .eq('id', walletId)
        .single();
      walletName = walletRow?.name || null;
    }

    // Build query to fetch transactions linked by wallet name in source/destination only
    let query = supabase
      .from('transactions')
      .select('*')
      .not('exchange_rate', 'is', null)
      .not('exchange_currency_code', 'is', null);

    if (walletName) {
      // Match by recorded names only (source or destination)
      query = query.or(
        `source.eq.${encodeURIComponent(walletName)},destination.eq.${encodeURIComponent(walletName)}`
      );
    }

    const { data: transactions, error } = await query.order('createdat', { ascending: false });

    if (error) throw error;
    return transactions || [];
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    throw error;
  }
}

/**
 * Get all transactions across all wallets
 * @returns {Promise<Array>} Array of all transactions
 */
export async function getAllTransactions() {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .not('exchange_rate', 'is', null)
      .not('exchange_currency_code', 'is', null)
      .order('createdat', { ascending: false });

    if (error) throw error;
    return transactions || [];
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    throw error;
  }
}

/**
 * Get all transactions for a specific custody record
 * @param {string} custodyId - The custody record ID to analyze
 * @returns {Promise<Array>} Array of transactions
 */
export async function getCustodyTransactions(custodyId) {
  try {
    // Get custody record details
    const { data: custodyRecord, error: custodyError } = await supabase
      .from('cash_custody')
      .select('*')
      .eq('id', custodyId)
      .single();

    if (custodyError) throw custodyError;
    if (!custodyRecord) return [];

    // Build query to fetch transactions linked by custody record
    // Look for transactions where source or destination contains the custody identifier
    const custodyIdentifier = `Custody_${custodyRecord.currency_code}`;
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .not('exchange_rate', 'is', null)
      .not('exchange_currency_code', 'is', null)
      .or(`source.eq.${encodeURIComponent(custodyIdentifier)},destination.eq.${encodeURIComponent(custodyIdentifier)}`)
      .order('createdat', { ascending: false });

    if (error) throw error;
    return transactions || [];
  } catch (error) {
    console.error('Error fetching custody transactions:', error);
    throw error;
  }
}

/**
 * Calculate median of an array of numbers
 * @param {Array<number>} numbers - Array of numbers
 * @returns {number} Median value
 */
function calculateMedian(numbers) {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

/**
 * Analyze transactions to extract currency pairs and their exchange rates
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Object containing currency pairs analysis
 */
export function analyzeCurrencyPairs(transactions) {
  const currencyPairs = {};

  transactions.forEach(transaction => {
    if (transaction.currency_code && transaction.exchange_currency_code && transaction.exchange_rate) {
      // Create pair key that includes transaction type to distinguish buy/sell operations
      // For buy transactions: we receive currency_code and give exchange_currency_code
      // For sell transactions: we give currency_code and receive exchange_currency_code
      const pairKey = `${transaction.currency_code}/${transaction.exchange_currency_code}`;
      const operationType = transaction.type || 'unknown';
      
      if (!currencyPairs[pairKey]) {
        currencyPairs[pairKey] = {
          rates: [],
          amounts: [],
          exchangeAmounts: [],
          transactionCount: 0,
          fromCurrency: transaction.currency_code,
          toCurrency: transaction.exchange_currency_code,
          operationType: operationType,
          buyCount: 0,
          sellCount: 0
        };
      }

      currencyPairs[pairKey].rates.push(parseFloat(transaction.exchange_rate));
      currencyPairs[pairKey].amounts.push(parseFloat(transaction.amount));
      currencyPairs[pairKey].exchangeAmounts.push(parseFloat(transaction.total_amount));
      currencyPairs[pairKey].transactionCount++;
      
      // Track buy/sell counts
      if (operationType === 'buy') {
        currencyPairs[pairKey].buyCount++;
      } else if (operationType === 'sell') {
        currencyPairs[pairKey].sellCount++;
      }
    }
  });

  // Calculate statistics for each pair
  Object.keys(currencyPairs).forEach(pairKey => {
    const pair = currencyPairs[pairKey];
    pair.medianRate = calculateMedian(pair.rates);
    pair.minRate = Math.min(...pair.rates);
    pair.maxRate = Math.max(...pair.rates);
    pair.totalAmount = pair.amounts.reduce((sum, amount) => sum + amount, 0);
    pair.totalExchangeAmount = pair.exchangeAmounts.reduce((sum, amount) => sum + amount, 0);
    pair.averageAmount = pair.totalAmount / pair.amounts.length;
    
    // Determine the primary operation type for this pair
    pair.primaryOperationType = pair.buyCount >= pair.sellCount ? 'buy' : 'sell';
  });

  return currencyPairs;
}

/**
 * Get currency pairs analysis for a specific wallet
 * @param {string} walletId - The wallet ID to analyze
 * @returns {Promise<Object>} Currency pairs analysis for the wallet
 */
export async function getWalletCurrencyPairsAnalysis(walletId) {
  try {
    const transactions = await getWalletTransactions(walletId);
    return {
      walletId,
      transactionCount: transactions.length,
      currencyPairs: analyzeCurrencyPairs(transactions),
      lastAnalyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing wallet currency pairs:', error);
    throw error;
  }
}

/**
 * Get currency pairs analysis for a specific custody record
 * @param {string} custodyId - The custody record ID to analyze
 * @returns {Promise<Object>} Currency pairs analysis for the custody record
 */
export async function getCustodyCurrencyPairsAnalysis(custodyId) {
  try {
    const transactions = await getCustodyTransactions(custodyId);
    return {
      custodyId,
      transactionCount: transactions.length,
      currencyPairs: analyzeCurrencyPairs(transactions),
      lastAnalyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing custody currency pairs:', error);
    throw error;
  }
}

/**
 * Get overall currency pairs analysis across all wallets
 * @returns {Promise<Object>} Overall currency pairs analysis
 */
export async function getOverallCurrencyPairsAnalysis() {
  try {
    const transactions = await getAllTransactions();
    return {
      totalTransactionCount: transactions.length,
      currencyPairs: analyzeCurrencyPairs(transactions),
      lastAnalyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing overall currency pairs:', error);
    throw error;
  }
}

/**
 * Calculate value based on median exchange rate
 * @param {number} amount - Amount in base currency
 * @param {number} medianRate - Median exchange rate
 * @returns {number} Calculated value in target currency
 */
export function calculateValueWithMedianRate(amount, medianRate) {
  return amount * medianRate;
}

/**
 * Format currency pairs data for display in tables
 * @param {Object} currencyPairs - Currency pairs analysis
 * @returns {Array} Formatted array for table display
 */
export function formatCurrencyPairsForTable(currencyPairs) {
  return Object.entries(currencyPairs).map(([pairKey, data]) => ({
    pair: pairKey,
    fromCurrency: data.fromCurrency,
    toCurrency: data.toCurrency,
    medianRate: data.medianRate,
    minRate: data.minRate,
    maxRate: data.maxRate,
    transactionCount: data.transactionCount,
    totalAmount: data.totalAmount,
    totalExchangeAmount: data.totalExchangeAmount,
    averageAmount: data.averageAmount,
    operationType: data.operationType,
    buyCount: data.buyCount,
    sellCount: data.sellCount,
    primaryOperationType: data.primaryOperationType
  }));
}