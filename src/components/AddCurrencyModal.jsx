import { useState, useEffect, useMemo } from 'react'
import Button from './Button'
import Input from './Input'
import CurrencySelect from './CurrencySelect'
import { useToast } from './Toast'
import { addCurrencyToWallet } from '../lib/api.js'
import AddCurrencyButton from './AddCurrencyButton'

/**
 * Modal for adding a currency to an existing wallet
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.wallet - The wallet to add currency to
 * @param {Function} props.onSuccess - Function called after successful addition
 * @returns {JSX.Element|null} The modal or null if not open
 */
export default function AddCurrencyModal({ isOpen, onClose, wallet, onSuccess }) {
  const [currencyCode, setCurrencyCode] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  
  // Reset form when wallet changes
  useEffect(() => {
    setCurrencyCode('')
    setBalance('0')
  }, [wallet?.id])
  
  // Use useMemo to prevent recreating this object on every render
  const excludeCurrencies = useMemo(() => {
    if (!wallet) return {};
    
    const excluded = {};
    
    // Exclude currencies that already exist in the wallet
    // From both legacy fields and currencies object
    if (wallet.usd !== undefined) excluded.USD = true;
    if (wallet.lyd !== undefined) excluded.LYD = true;
    
    if (wallet.currencies) {
      Object.keys(wallet.currencies).forEach(code => {
        excluded[code] = true;
      });
    }
    
    return excluded;
  }, [wallet]);
  
  if (!isOpen || !wallet) return null
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!currencyCode) {
      show('Please select a currency', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const updatedWallet = await addCurrencyToWallet(
        wallet.id,
        currencyCode,
        Number(balance) || 0
      );
      
      show(`${currencyCode} added to wallet successfully`, 'success');
      
      if (onSuccess) {
        onSuccess(updatedWallet);
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding currency to wallet:', error);
      show(error.message || 'Failed to add currency', 'error');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Currency to {wallet.name}</h3>
          <button 
            className="text-gray-400 hover:text-gray-600" 
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <CurrencySelect
            label="Currency"
            value={currencyCode}
            onChange={setCurrencyCode}
            required
            excludeCurrencies={excludeCurrencies}
          />
          
          <Input
            label="Balance"
            type="number"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            min="0"
            step="0.01"
          />
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <AddCurrencyButton 
              type="submit"
              variant="primary"
              disabled={loading || !currencyCode}
            >
              {loading ? 'Adding...' : 'Add Currency'}
            </AddCurrencyButton>
          </div>
        </form>
      </div>
    </div>
  );
}