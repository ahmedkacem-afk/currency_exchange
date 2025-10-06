import { useState, useEffect } from 'react'
import { Card } from './Card.jsx'
import Button from './Button.jsx'
import Input from './Input.jsx'

/**
 * CustodyRequestForm Component
 * 
 * Form for handling custody transfers between treasurer and cashiers
 */
export default function CustodyRequestForm({ 
  onSubmit, 
  wallets = [], 
  cashiers = [], 
  currencyTypes = []
}) {
  // Form state
  const [isGiveMode, setIsGiveMode] = useState(true)
  const [walletId, setWalletId] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Reset form when mode changes
  useEffect(() => {
    setWalletId('')
    setCashierId('')
    setCurrencyCode('')
    setAmount('')
    setNotes('')
  }, [isGiveMode])
  
  // Get selected wallet for displaying balance
  const selectedWallet = wallets.find(w => w.id === walletId)
  const selectedCurrency = selectedWallet?.currencies?.[currencyCode]
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!walletId || !cashierId || !currencyCode || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return
    }
    
    setSubmitting(true)
    
    try {
      await onSubmit({
        mode: isGiveMode ? 'give' : 'get',
        walletId,
        cashierId,
        currencyCode, 
        amount: parseFloat(amount),
        notes
      })
      
      // Reset form after successful submission
      setAmount('')
      setNotes('')
    } catch (error) {
      console.error('Error submitting custody request:', error)
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <Card className="mb-6">
      <div className="p-5">
        <h2 className="text-lg font-medium mb-4">
          {isGiveMode ? 'Give Custody to Cashier' : 'Get Custody from Cashier'}
        </h2>
        
        {/* Mode toggle */}
        <div className="bg-gray-100 p-1 rounded-md flex mb-4 w-full sm:w-80">
          <button
            type="button"
            onClick={() => setIsGiveMode(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              isGiveMode 
                ? 'bg-white text-emerald-700 shadow' 
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Give Custody
          </button>
          <button
            type="button"
            onClick={() => setIsGiveMode(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              !isGiveMode 
                ? 'bg-white text-emerald-700 shadow' 
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Get Custody Back
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Wallet selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wallet
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Select wallet</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Cashier selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cashier
              </label>
              <select
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Select cashier</option>
                {cashiers.map((cashier) => (
                  <option key={cashier.id} value={cashier.id}>
                    {cashier.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Currency selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Select currency</option>
                {currencyTypes.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
              
              {/* Show available balance if wallet and currency are selected */}
              {walletId && currencyCode && (
                <div className="mt-1 text-sm text-gray-500">
                  Available: {selectedCurrency ?? 0} {currencyCode}
                </div>
              )}
            </div>
            
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                required
              />
            </div>
          </div>
          
          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 h-24 resize-none"
              placeholder="Add any notes about this custody transfer"
            />
          </div>
          
          {/* Submit button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !walletId || !cashierId || !currencyCode || !amount}
            >
              {isGiveMode ? 'Give Custody' : 'Get Custody Back'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}