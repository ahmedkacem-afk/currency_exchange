/**
 * Currency Types API
 * 
 * This module handles operations related to currency types
 */

import supabase, { handleApiError } from '../client';

/**
 * Get all currency types
 * 
 * @returns {Promise<Array>} List of all currency types
 */
export async function getAllCurrencyTypes() {
  try {
    const { data, error } = await supabase
      .from('currency_types')
      .select('*')
      .order('code');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting currency types:', error);
    throw handleApiError(error);
  }
}

/**
 * Create a new currency type
 * 
 * @param {Object} currencyType - The currency type to create
 * @param {string} currencyType.code - Currency code (e.g., USD, EUR)
 * @param {string} currencyType.name - Currency name (e.g., US Dollar, Euro)
 * @param {string} [currencyType.symbol] - Currency symbol (e.g., $, €)
 * @returns {Promise<Object>} The created currency type
 */
export async function createCurrencyType({ code, name, symbol }) {
  try {
    // Validate input
    if (!code || !name) {
      throw new Error('Currency code and name are required');
    }
    
    // Convert code to uppercase
    code = code.toUpperCase();
    
    // If no symbol is provided, use the code
    if (!symbol) symbol = code;
    
    const { data, error } = await supabase
      .from('currency_types')
      .insert([
        { code, name, symbol }
      ])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating currency type:', error);
    throw handleApiError(error);
  }
}

/**
 * Update a currency type
 * 
 * @param {string} code - Currency code to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New currency name
 * @param {string} [updates.symbol] - New currency symbol
 * @returns {Promise<Object>} The updated currency type
 */
export async function updateCurrencyType(code, updates) {
  try {
    const { data, error } = await supabase
      .from('currency_types')
      .update(updates)
      .eq('code', code)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating currency type ${code}:`, error);
    throw handleApiError(error);
  }
}

/**
 * Delete a currency type
 * 
 * @param {string} code - Currency code to delete
 * @returns {Promise<void>}
 */
export async function deleteCurrencyType(code) {
  try {
    const { error } = await supabase
      .from('currency_types')
      .delete()
      .eq('code', code);
      
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting currency type ${code}:`, error);
    throw handleApiError(error);
  }
}