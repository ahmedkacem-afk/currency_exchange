import { useState, useEffect, useMemo } from 'react'
import { getAllCurrencyTypes } from '../lib/api.js'

/**
 * Currency select dropdown component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.value] - Current selected value
 * @param {Function} props.onChange - Function called when value changes
 * @param {string} [props.label] - Label for the dropdown
 * @param {boolean} [props.required] - Whether the field is required
 * @param {Object} [props.excludeCurrencies] - Object of currency codes to exclude {USD: true, EUR: true}
 * @param {Array} [props.includeOnlyCodes] - Array of currency codes to include, takes precedence over excludeCurrencies
 * @param {Array} [props.customCurrencies] - Custom array of currencies to use instead of loading from API
 * @returns {JSX.Element} The currency select component
 */
export default function CurrencySelect({ 
  value, 
  onChange, 
  label = 'Currency',
  required = false,
  excludeCurrencies = {},
  includeOnlyCodes = [],
  customCurrencies = null
}) {
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function loadCurrencies() {
      // If customCurrencies are provided, use those directly
      if (customCurrencies) {
        console.log('CurrencySelect - Using custom currencies:', customCurrencies);
        setCurrencies(customCurrencies);
        setLoading(false);
        return;
      }
      
      setLoading(true)
      setError(null)
      
      console.log('CurrencySelect - Loading currencies');
      
      try {
        const currencyTypes = await getAllCurrencyTypes()
        console.log('CurrencySelect - Currency types loaded:', currencyTypes);
        setCurrencies(currencyTypes || [])
      } catch (err) {
        console.error('Error loading currency types:', err)
        setError('Failed to load currencies')
        
        // If we can't load currency types but have includeOnlyCodes, create basic currency objects
        if (includeOnlyCodes && includeOnlyCodes.length > 0) {
          console.log('CurrencySelect - Creating fallback currencies from includeOnlyCodes:', includeOnlyCodes);
          const basicCurrencies = includeOnlyCodes.map(code => ({
            code,
            name: code,
            symbol: code === 'USD' ? '$' : code === 'LYD' ? 'LD' : code
          }));
          setCurrencies(basicCurrencies);
          console.log('CurrencySelect - Fallback currencies created:', basicCurrencies);
        }
      } finally {
        setLoading(false)
      }
    }
    
    // Only load currencies once when the component mounts or when customCurrencies changes
    loadCurrencies()
    // Include customCurrencies in dependency array to reload if they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customCurrencies])
  
  // Use useMemo to compute filtered currencies only when dependencies change
  const filteredCurrencies = useMemo(() => {
    // If includeOnlyCodes is provided, only include those currencies
    if (includeOnlyCodes && includeOnlyCodes.length > 0) {
      return currencies.filter(c => includeOnlyCodes.includes(c.code));
    } else {
      // Otherwise, filter out excluded currencies
      return currencies.filter(c => !excludeCurrencies[c.code]);
    }
    // Only recompute when currencies, includeOnlyCodes or excludeCurrencies change
  }, [currencies, includeOnlyCodes, excludeCurrencies]);
  
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        disabled={loading}
        required={required}
      >
        <option value="">Select a currency</option>
        
        {filteredCurrencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
      
      {loading && <div className="text-sm text-gray-500">Loading currencies...</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && !error && filteredCurrencies.length === 0 && (
        <div className="text-sm text-gray-500">No currencies available</div>
      )}
    </div>
  )
}