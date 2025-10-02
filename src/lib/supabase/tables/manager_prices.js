/**
 * Manager Prices API
 * 
 * This module handles all operations related to manager prices.
 * Note: The manager_prices table doesn't use UUIDs like other tables.
 */

import supabase, { handleApiError } from '../client'

/**
 * Gets the current manager prices
 * 
 * @returns {Promise<Object>} - Manager prices record
 */
export async function getManagerPrices() {
  try {
    // Get the single record from manager_prices table
    const { data, error } = await supabase
      .from('manager_prices')
      .select('*')
      .single()
      
    if (error && error.code !== 'PGRST116') {
      // If error is not "no rows returned" then throw it
      throw error
    }
    
    // If no record exists, create a default one
    if (!data) {
      console.log('No manager_prices record found, creating default')
      
      const defaultPrices = {
        buyold: 5.0,
        buynew: 5.0,
        sellold: 5.5,
        sellnew: 5.5
      }
      
      const { data: newData, error: insertError } = await supabase
        .from('manager_prices')
        .insert(defaultPrices)
        .select()
        .single()
        
      if (insertError) throw insertError
      
      return newData
    }
    
    return data
  } catch (error) {
    throw handleApiError(error, 'Get Manager Prices')
  }
}

/**
 * Updates the manager prices
 * 
 * @param {Object} priceData - Price data
 * @param {number} priceData.buyPrice - Buy price
 * @param {number} priceData.sellPrice - Sell price
 * @returns {Promise<Object>} - Updated prices
 */
export async function updateManagerPrices({ buyPrice, sellPrice }) {
  try {
    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('manager_prices')
      .select('*')
      .single()
      
    const priceUpdate = {
      buyold: buyPrice,
      buynew: buyPrice,
      sellold: sellPrice,
      sellnew: sellPrice
    }
    
    // If no record exists, create one
    if (!existingRecord) {
      console.log('No manager_prices record found, creating one')
      const { data, error } = await supabase
        .from('manager_prices')
        .insert(priceUpdate)
        .select()
        .single()
        
      if (error) throw error
      return data
    }
    
    // Update existing record
    console.log('Updating existing manager_prices record')
    const { data, error } = await supabase
      .from('manager_prices')
      .update(priceUpdate)
      .eq('id', existingRecord.id)
      .select()
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    throw handleApiError(error, 'Update Manager Prices')
  }
}

export default {
  getManagerPrices,
  updateManagerPrices
}