/**
 * Custody Analysis Functions
 *
 * This module provides functions to analyze custody-related transactions for currency pairs
 * and calculate median exchange rates.
 */

import supabase from './supabase/client';
import { analyzeCurrencyPairs } from './transactionAnalysis';

/**
 * Get all transactions related to a specific custody record
 * @param {string} custodyId - The custody ID to analyze
 * @returns {Promise<Array>} Array of transactions
 */
export async function getCustodyTransactions(custodyId) {
  try {
    // Get custody record to extract wallet_id
    const { data: custodyRecord, error: custodyError } = await supabase
      .from('cash_custody')
      .select('id, wallet_id')
      .eq('id', custodyId)
      .single();
    if (custodyError || !custodyRecord) throw custodyError || new Error('Custody not found');

    // Get wallet name
    let walletName = null;
    if (custodyRecord.wallet_id) {
      const { data: walletRow, error: walletError } = await supabase
        .from('wallets')
        .select('name')
        .eq('id', custodyRecord.wallet_id)
        .single();
      if (walletError) {
        console.error('Error fetching wallet for custody:', walletError);
      }
      walletName = walletRow?.name || null;
      console.log('CustodyAnalysis: wallet_id', custodyRecord.wallet_id, 'walletName', walletName);
    }

    // Search transactions where source or destination matches the wallet name
    let transactions = [];
    if (walletName) {
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .or(`source.eq.${encodeURIComponent(walletName)},destination.eq.${encodeURIComponent(walletName)}`)
        .not('exchange_rate', 'is', null)
        .not('exchange_currency_code', 'is', null)
        .order('createdat', { ascending: false });
      if (txError) throw txError;
      transactions = txs || [];
      console.log('CustodyAnalysis: Found', transactions.length, 'transactions for walletName', walletName);
    } else {
      console.warn('CustodyAnalysis: No wallet name found for custody', custodyId);
    }
    return transactions;
  } catch (error) {
    console.error('Error fetching custody transactions:', error);
    throw error;
  }
}

/**
 * Get all transactions related to all custodies
 * @returns {Promise<Array>} Array of all custody-related transactions
 */
export async function getAllCustodyTransactions() {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .not('reference_custody_id', 'is', null)
      .not('exchange_rate', 'is', null)
      .not('exchange_currency_code', 'is', null)
      .order('createdat', { ascending: false });

    if (error) throw error;
    return transactions || [];
  } catch (error) {
    console.error('Error fetching all custody transactions:', error);
    throw error;
  }
}

/**
 * Analyze custody transactions to extract currency pairs and their exchange rates
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Object containing currency pairs analysis
 */
export function analyzeCustodyCurrencyPairs(transactions) {
  return analyzeCurrencyPairs(transactions);
}

/**
 * Get currency pairs analysis for a specific custody
 * @param {string} custodyId - The custody ID to analyze
 * @returns {Promise<Object>} Currency pairs analysis for the custody
 */
export async function getCustodyCurrencyPairsAnalysis(custodyId) {
  try {
    const transactions = await getCustodyTransactions(custodyId);
    return {
      custodyId,
      transactionCount: transactions.length,
      currencyPairs: analyzeCustodyCurrencyPairs(transactions),
      lastAnalyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing custody currency pairs:', error);
    throw error;
  }
}

/**
 * Get overall currency pairs analysis across all custodies
 * @returns {Promise<Object>} Overall currency pairs analysis
 */
export async function getOverallCustodyCurrencyPairsAnalysis() {
  try {
    const transactions = await getAllCustodyTransactions();
    return {
      totalTransactionCount: transactions.length,
      currencyPairs: analyzeCustodyCurrencyPairs(transactions),
      lastAnalyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing overall custody currency pairs:', error);
    throw error;
  }
}
