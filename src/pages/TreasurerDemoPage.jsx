import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'

/**
 * TreasurerDemoPage
 * A demo page to simulate the Treasurer functionality without actual API calls
 */
export default function TreasurerDemoPage() {
  const { t } = useI18n()
  const [wallets, setWallets] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [currencyTypes, setCurrencyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { show } = useToast()
  
  // State to track if user is viewing demo or authenticated version
  const [viewingDemo, setViewingDemo] = useState(true)
  
  // Form state
  const [action, setAction] = useState('') // 'give' or 'get'
  const [walletId, setWalletId] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  
  // Selected wallet state
  const [selectedWallet, setSelectedWallet] = useState(null)
  
  // Load mock data
  useEffect(() => {
    // Simulated delay
    const timer = setTimeout(() => {
      // Mock wallets data
      setWallets([
        { id: 'wallet-1', name: 'Main Treasury', usd: 50000, lyd: 75000, currencies: { USD: 50000, LYD: 75000, EUR: 30000, GBP: 25000 } },
        { id: 'wallet-2', name: 'Branch Office', usd: 25000, lyd: 35000, currencies: { USD: 25000, LYD: 35000, EUR: 15000 } },
        { id: 'wallet-3', name: 'Reserve Funds', usd: 100000, lyd: 150000, currencies: { USD: 100000, LYD: 150000, GBP: 45000 } }
      ])
      
      // Mock cashiers data
      setCashiers([
        { id: 'cashier-1', name: 'Ahmed Ali', email: 'ahmed@example.com' },
        { id: 'cashier-2', name: 'Sara Mohammed', email: 'sara@example.com' },
        { id: 'cashier-3', name: 'Khalid Rahman', email: 'khalid@example.com' },
        { id: 'manager-1', name: 'Omar Manager', email: 'omar@example.com' }
      ])
      
      // Mock currency types
      setCurrencyTypes([
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' }
      ])
      
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [show, t])
  
  // Update selected wallet when walletId changes
  useEffect(() => {
    if (!walletId) {
      setSelectedWallet(null)
      setCurrencyCode('')
      return
    }
    
    const wallet = wallets.find(w => w.id === walletId)
    if (wallet) {
      setSelectedWallet(wallet)
      setCurrencyCode('')  // Reset currency selection when wallet changes
    } else {
      setSelectedWallet(null)
    }
  }, [walletId, wallets])
  
  // Available currencies for the selected wallet
  const getAvailableCurrencies = () => {
    if (!selectedWallet) return []
    
    const currencies = []
    
    // Check legacy fields first
    if (selectedWallet.usd !== null && selectedWallet.usd !== undefined) {
      currencies.push({ code: 'USD', name: 'US Dollar' })
    }
    
    if (selectedWallet.lyd !== null && selectedWallet.lyd !== undefined) {
      currencies.push({ code: 'LYD', name: 'Libyan Dinar' })
    }
    
    // Check currencies object
    if (selectedWallet.currencies) {
      Object.entries(selectedWallet.currencies).forEach(([code, balance]) => {
        // Don't double-add USD/LYD if they were already added from legacy fields
        if ((code === 'USD' && selectedWallet.usd !== undefined) ||
            (code === 'LYD' && selectedWallet.lyd !== undefined)) {
          return
        }
        
        // Find the full name from currency types
        const currencyType = currencyTypes.find(ct => ct.code === code)
        currencies.push({ 
          code, 
          name: currencyType ? currencyType.name : code 
        })
      })
    }
    
    return currencies
  }
  
  // Get current wallet balance for selected currency
  const getCurrentBalance = () => {
    if (!selectedWallet || !currencyCode) return 0
    
    if (currencyCode === 'USD' && selectedWallet.usd !== undefined) {
      return Number(selectedWallet.usd)
    } else if (currencyCode === 'LYD' && selectedWallet.lyd !== undefined) {
      return Number(selectedWallet.lyd)
    } else if (selectedWallet.currencies && selectedWallet.currencies[currencyCode] !== undefined) {
      return Number(selectedWallet.currencies[currencyCode])
    }
    
    return 0
  }
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!action) {
      show(t('treasurer.actionRequired'), 'error')
      return
    }
    
    if (!cashierId) {
      show(t('treasurer.cashierRequired'), 'error')
      return
    }
    
    if (!walletId || !currencyCode) {
      show(t('treasurer.currencyRequired'), 'error')
      return
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      show(t('treasurer.amountInvalid'), 'error')
      return
    }
    
    setSubmitting(true)
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        const cashier = cashiers.find(c => c.id === cashierId)
        const currencyName = currencyTypes.find(ct => ct.code === currencyCode)?.name || currencyCode
        
        // Update the wallet balance in our local state
        setWallets(prevWallets => 
          prevWallets.map(wallet => {
            if (wallet.id === walletId) {
              const updatedWallet = { ...wallet }
              
              if (action === 'give') {
                // Decrease balance when giving custody
                if (currencyCode === 'USD' && updatedWallet.usd !== undefined) {
                  updatedWallet.usd = Math.max(0, updatedWallet.usd - Number(amount))
                } else if (currencyCode === 'LYD' && updatedWallet.lyd !== undefined) {
                  updatedWallet.lyd = Math.max(0, updatedWallet.lyd - Number(amount))
                }
                
                if (updatedWallet.currencies && updatedWallet.currencies[currencyCode] !== undefined) {
                  updatedWallet.currencies[currencyCode] = Math.max(0, updatedWallet.currencies[currencyCode] - Number(amount))
                }
              } else {
                // Increase balance when getting custody back
                if (currencyCode === 'USD' && updatedWallet.usd !== undefined) {
                  updatedWallet.usd += Number(amount)
                } else if (currencyCode === 'LYD' && updatedWallet.lyd !== undefined) {
                  updatedWallet.lyd += Number(amount)
                }
                
                if (updatedWallet.currencies && updatedWallet.currencies[currencyCode] !== undefined) {
                  updatedWallet.currencies[currencyCode] += Number(amount)
                }
              }
              
              return updatedWallet
            }
            return wallet
          })
        )
        
        if (action === 'give') {
          show(`${amount} ${currencyName} successfully given to ${cashier.name}`, 'success')
        } else {
          show(`${amount} ${currencyName} successfully received from ${cashier.name}`, 'success')
        }
        
        // Reset form
        resetForm()
      } catch (error) {
        console.error('Error in demo operation:', error)
        
        if (action === 'give' && Number(amount) > getCurrentBalance()) {
          show(t('treasurer.insufficientFunds'), 'error')
        } else {
          show(t('common.failed'), 'error')
        }
      } finally {
        setSubmitting(false)
      }
    }, 1500)
  }
  
  // Reset form fields
  const resetForm = () => {
    setAction('')
    setWalletId('')
    setCashierId('')
    setCurrencyCode('')
    setAmount('')
    setNotes('')
    setSelectedWallet(null)
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader 
          title={t('treasurer.title') + " (Demo)"}
          subtitle={t('treasurer.subtitle')}
          actions={
            <div className="flex space-x-2">
              <Link to="/">
                <Button variant="outline">{t('common.back')}</Button>
              </Link>
              <Link to="/login">
                <Button variant="primary">Login</Button>
              </Link>
            </div>
          }
        />
        <CardBody>
          {loading ? (
            <div className="text-center py-4">{t('common.loading')}</div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      This is a demo version. No actual data is being modified. Changes are simulated for presentation purposes.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Demo Access:</strong> This page is accessible without login for demonstration purposes. In a real implementation, this would be protected behind authentication.
                    </p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Action Selection */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="font-medium text-lg mb-4 text-gray-700">
                    {t('treasurer.selectAction')}
                  </h3>
                  
                  <div className="flex gap-4">
                    <Button 
                      type="button"
                      variant={action === 'give' ? 'primary' : 'outline'}
                      onClick={() => setAction('give')}
                      className="flex-1"
                    >
                      {t('treasurer.giveCustody')}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant={action === 'get' ? 'primary' : 'outline'}
                      onClick={() => setAction('get')}
                      className="flex-1"
                    >
                      {t('treasurer.getCustody')}
                    </Button>
                  </div>
                </div>
                
                {action && (
                  <>
                    {/* Cashier Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('treasurer.cashierName')}
                      </label>
                      <select
                        value={cashierId}
                        onChange={(e) => setCashierId(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      >
                        <option value="">{t('common.selectOption')}</option>
                        {cashiers.map(cashier => (
                          <option key={cashier.id} value={cashier.id}>
                            {cashier.name} ({cashier.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Wallet Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('treasurer.selectWallet')}
                      </label>
                      <select
                        value={walletId}
                        onChange={(e) => setWalletId(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      >
                        <option value="">{t('common.selectOption')}</option>
                        {wallets.map(wallet => (
                          <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Currency Selection - Only show if wallet is selected */}
                    {selectedWallet && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('treasurer.selectCurrency')}
                        </label>
                        <select
                          value={currencyCode}
                          onChange={(e) => setCurrencyCode(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        >
                          <option value="">{t('common.selectOption')}</option>
                          {getAvailableCurrencies().map(currency => (
                            <option key={currency.code} value={currency.code}>
                              {currency.name} ({currency.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('treasurer.amount')}
                      </label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    
                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('treasurer.notes')}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        rows="2"
                      ></textarea>
                    </div>
                    
                    {/* Wallet Balance Display */}
                    {selectedWallet && currencyCode && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-500">
                              {t('common.availableBalance')}:
                            </div>
                            <div className="text-xl font-semibold text-gray-800">
                              {getCurrentBalance().toFixed(2)} {currencyCode}
                            </div>
                          </div>
                          
                          {action === 'give' && amount && !isNaN(Number(amount)) && (
                            <div>
                              <div className="text-sm font-medium text-red-500">
                                {t('debtManagement.afterGiving')}:
                              </div>
                              <div className="text-xl font-semibold text-red-800">
                                {Math.max(0, getCurrentBalance() - Number(amount)).toFixed(2)} {currencyCode}
                              </div>
                            </div>
                          )}
                          
                          {action === 'get' && amount && !isNaN(Number(amount)) && (
                            <div>
                              <div className="text-sm font-medium text-green-500">
                                {t('debtManagement.afterReceiving')}:
                              </div>
                              <div className="text-xl font-semibold text-green-800">
                                {(getCurrentBalance() + Number(amount)).toFixed(2)} {currencyCode}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="success"
                      disabled={submitting || !action || !cashierId || !walletId || !currencyCode || !amount}
                      fullWidth
                    >
                      {submitting 
                        ? t('treasurer.processingCustody')
                        : t('treasurer.confirmCustody')
                      }
                    </Button>
                  </>
                )}
              </form>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}