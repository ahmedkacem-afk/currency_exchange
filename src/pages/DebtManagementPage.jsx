import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getWallets, getAllCurrencyTypes, getAllDebts, createDebt, markDebtAsPaid, deleteDebt } from '../lib/api.js'
import { supabase } from '../lib/supabase/client.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { useToast } from '../components/Toast.jsx'
import { Link } from 'react-router-dom'

/**
 * Debt Management Page
 * Interface for managing debts owed to others and debts others owe to you
 */
export default function DebtManagementPage() {
  const { t } = useI18n()
  const [wallets, setWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { show } = useToast()
  
  // Form state
  const [walletId, setWalletId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isOwed, setIsOwed] = useState(true) // true = I owe, false = owed to me
  
  // Debts data
  const [debts, setDebts] = useState({
    owed: [],      // debts you owe to others
    receivable: [] // debts others owe to you
  })
  
  // Load wallets and debts data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // First load wallets
        const walletsData = await getWallets()
        console.log('DebtManagementPage - Wallets loaded:', walletsData)
        
        if (walletsData && Array.isArray(walletsData.wallets)) {
          console.log('DebtManagementPage - Setting', walletsData.wallets.length, 'wallets')
          setWallets(walletsData.wallets)
        } else {
          console.error('DebtManagementPage - Invalid wallets data format:', walletsData)
          setWallets([])
          show('Error loading wallets', 'error')
        }
        
        // Then load debts
        // Check authentication status first
        const { data: sessionData } = await supabase.auth.getSession()
        console.log('DebtManagementPage - Auth check before loading debts:', {
          hasSession: !!sessionData?.session,
          hasUser: !!sessionData?.session?.user
        })
        
        try {
          const debtsData = await getAllDebts()
          if (debtsData) {
            // Filter out paid debts from both collections
            setDebts({
              owed: (debtsData.owed || []).filter(debt => !debt.is_paid),
              receivable: (debtsData.receivable || []).filter(debt => !debt.is_paid)
            })
            console.log('DebtManagementPage - Filtered unpaid debts:', {
              owed: (debtsData.owed || []).filter(debt => !debt.is_paid).length,
              receivable: (debtsData.receivable || []).filter(debt => !debt.is_paid).length,
              totalBefore: (debtsData.owed?.length || 0) + (debtsData.receivable?.length || 0)
            })
          }
        } catch (debtsError) {
          console.error('Error loading debts:', debtsError)
          
          // If it's an authentication error, redirect to login
          if (debtsError.message && debtsError.message.includes('User not authenticated')) {
            show(t('common.sessionExpired') || 'Your session has expired. Please login again.', 'error')
            
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/login'
            }, 2000)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        show(t('common.failedToLoadData'), 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
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
  
  // Calculate available currencies for the selected wallet
  const availableCurrencies = useMemo(() => {
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
        
        currencies.push({ code, name: code })
      })
    }
    
    return currencies
  }, [selectedWallet])
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!walletId || !currencyCode || !amount || !personName) {
      show(t('common.fillRequiredFields'), 'error')
      return
    }
    
    setSubmitting(true)
    
    try {
      // Check authentication status first
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('DebtManagementPage - Auth check before submission:', {
        hasSession: !!sessionData?.session,
        hasUser: !!sessionData?.session?.user
      })
      
      if (!sessionData?.session?.user) {
        throw new Error('User not authenticated. Please login again.')
      }
      
      // Create the debt record via API
      const debtData = {
        personName,
        walletId,
        currencyCode,
        amount: Number(amount),
        notes: notes || null,
        isOwed  // true = I owe, false = owed to me
      }
      
      await createDebt(debtData)
      
      // Show success message
      show(t('debtManagement.created'), 'success')
      
      // Reset form completely
      setPersonName('')
      setAmount('')
      setNotes('')
      setWalletId('')
      setCurrencyCode('')
      setSelectedWallet(null)
      setIsOwed(true) // Reset back to default
      
      // Refresh debt data
      const refreshedDebts = await getAllDebts()
      setDebts({
        owed: (refreshedDebts.owed || []).filter(debt => !debt.is_paid),
        receivable: (refreshedDebts.receivable || []).filter(debt => !debt.is_paid)
      })
    } catch (error) {
      console.error('Error recording debt:', error)
      
      // Show a more specific error message
      let errorMessage = error.message || t('common.failedToSave');
      
      // If it's an authentication error, redirect to login
      if (error.message && error.message.includes('User not authenticated')) {
        errorMessage = t('common.sessionExpired') || 'Your session has expired. Please login again.';
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      
      show(errorMessage, 'error');
    } finally {
      setSubmitting(false)
    }
  }

  // Handle marking a debt as paid
  const handleMarkAsPaid = async (id, type) => {
    try {
      setLoading(true)
      
      // Verify the debt ID
      if (!id) {
        throw new Error('Invalid debt ID')
      }
      
      console.log('Marking debt as paid:', { id, type })
      
      await markDebtAsPaid(id)
      
      // Refresh debt data
      const refreshedDebts = await getAllDebts()
      setDebts({
        owed: (refreshedDebts.owed || []).filter(debt => !debt.is_paid),
        receivable: (refreshedDebts.receivable || []).filter(debt => !debt.is_paid)
      })
      
      show(t('debtManagement.markedAsPaid'), 'success')
    } catch (error) {
      console.error('Error marking debt as paid:', error)
      
      // Handle authentication errors
      if (error.message && error.message.includes('User not authenticated')) {
        show(t('common.sessionExpired') || 'Your session has expired. Please login again.', 'error')
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        show(error.message || t('common.failed'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }
  
  // Handle deleting a debt
  const handleDeleteDebt = async (id, type) => {
    try {
      setLoading(true)
      await deleteDebt(id)
      
      // Refresh debt data
      const refreshedDebts = await getAllDebts()
      setDebts({
        owed: (refreshedDebts.owed || []).filter(debt => !debt.is_paid),
        receivable: (refreshedDebts.receivable || []).filter(debt => !debt.is_paid)
      })
      
      show(t('common.deleted'), 'success')
    } catch (error) {
      console.error('Error deleting debt:', error)
      show(error.message || t('common.failed'), 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader 
          title={t('debtManagement.title')} 
          subtitle={t('debtManagement.subtitle')}
          actions={
            <Link to="/">
              <Button variant="outline">{t('common.back')}</Button>
            </Link>
          }
        />
        <CardBody>
          {loading ? (
            <div className="text-center py-4">{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debt Creation Form */}
              <div>
                <h3 className="font-medium text-lg mb-4 text-gray-700">
                  {t('debtManagement.createNew')}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t('debtManagement.personName')}
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder={t('debtManagement.enterName')}
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('debtManagement.selectWallet')}
                    </label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    >
                      <option value="">{t('common.selectOption')}</option>
                      {Array.isArray(wallets) && wallets.length > 0 ? (
                        wallets.map(wallet => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name || `Wallet ${wallet.id}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No wallets available</option>
                      )}
                    </select>
                    {wallets.length === 0 && !loading && (
                      <p className="text-xs text-red-500 mt-1">
                        No wallets found. Please create a wallet first.
                      </p>
                    )}
                  </div>
                  
                  {selectedWallet && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('debtManagement.selectCurrency')}
                      </label>
                      <select
                        value={currencyCode}
                        onChange={(e) => setCurrencyCode(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      >
                        <option value="">{t('common.selectOption')}</option>
                        {availableCurrencies.map(currency => (
                          <option key={currency.code} value={currency.code}>{currency.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <Input
                    label={t('debtManagement.amount')}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  {/* Wallet balance display */}
                  {selectedWallet && currencyCode && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-500">
                            {t('common.availableBalance')}:
                          </div>
                          <div className="text-xl font-semibold text-gray-800">
                            {(() => {
                              // Get the current balance
                              let currentBalance = 0;
                              if (currencyCode === 'USD' && selectedWallet.usd !== undefined) {
                                currentBalance = Number(selectedWallet.usd);
                              } else if (currencyCode === 'LYD' && selectedWallet.lyd !== undefined) {
                                currentBalance = Number(selectedWallet.lyd);
                              } else if (selectedWallet.currencies && selectedWallet.currencies[currencyCode] !== undefined) {
                                currentBalance = Number(selectedWallet.currencies[currencyCode]);
                              }
                              return currentBalance.toLocaleString();
                            })()} {currencyCode}
                          </div>
                        </div>
                        
                        {amount && Number(amount) > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-500">
                              {isOwed ? t('debtManagement.afterGiving') : t('debtManagement.afterReceiving')}:
                            </div>
                            <div className={`text-xl font-semibold ${isOwed ? 'text-orange-600' : 'text-emerald-600'}`}>
                              {(() => {
                                // Get the current balance
                                let currentBalance = 0;
                                if (currencyCode === 'USD' && selectedWallet.usd !== undefined) {
                                  currentBalance = Number(selectedWallet.usd);
                                } else if (currencyCode === 'LYD' && selectedWallet.lyd !== undefined) {
                                  currentBalance = Number(selectedWallet.lyd);
                                } else if (selectedWallet.currencies && selectedWallet.currencies[currencyCode] !== undefined) {
                                  currentBalance = Number(selectedWallet.currencies[currencyCode]);
                                }
                                
                                // Calculate new balance after this transaction
                                const newBalance = isOwed 
                                  ? currentBalance - Number(amount) 
                                  : currentBalance + Number(amount);
                                
                                return newBalance.toLocaleString();
                              })()} {currencyCode}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Record Debt Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      type="button"
                      variant={isOwed ? 'primary' : 'outline'}
                      onClick={() => setIsOwed(true)}
                    >
                      {t('debtManagement.give')}
                    </Button>
                    <Button
                      type="button"
                      variant={!isOwed ? 'primary' : 'outline'}
                      onClick={() => setIsOwed(false)}
                    >
                      {t('debtManagement.get')}
                    </Button>
                  </div>
                  
                  <Button
                    type="submit"
                    variant="success"
                    disabled={submitting || !walletId || !currencyCode || !amount || !personName}
                    fullWidth
                  >
                    {submitting ? t('common.saving') : t('debtManagement.recordDebt')}
                  </Button>
                </form>
              </div>
              
              {/* Debt Listings Tabs */}
              <div>
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    className={`px-4 py-2 font-medium ${isOwed ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-600'}`}
                    onClick={() => setIsOwed(true)}
                  >
                    {t('debtManagement.debtsOwed')}
                    <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded-full text-xs">
                      {debts.owed.length}
                    </span>
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${!isOwed ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-600'}`}
                    onClick={() => setIsOwed(false)}
                  >
                    {t('debtManagement.debtsOwedToMe')}
                    <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded-full text-xs">
                      {debts.receivable.length}
                    </span>
                  </button>
                </div>
                
                {/* Display list of debts */}
                {debts[isOwed ? 'owed' : 'receivable'].length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">
                      {isOwed 
                        ? t('debtManagement.noDebtsOwed')
                        : t('debtManagement.noDebtsOwedToMe')
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {debts[isOwed ? 'owed' : 'receivable'].map(debt => (
                      <div key={debt.id} 
                           className={`p-4 rounded-lg border shadow-sm ${debt.is_paid 
                            ? 'bg-gray-50 border-gray-200' 
                            : isOwed 
                              ? 'bg-red-50 border-red-100' 
                              : 'bg-green-50 border-green-100'}`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{debt.person_name}</h4>
                              {debt.is_paid && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {t('debtManagement.paid')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {debt.wallet?.name || ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {parseFloat(debt.amount).toFixed(2)} {debt.currency_code}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(debt.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        {debt.notes && (
                          <p className="text-sm mt-2 pt-2 border-t border-gray-200">
                            {debt.notes}
                          </p>
                        )}
                        
                        {!debt.is_paid && (
                          <div className="flex justify-end mt-2 gap-2">
                            <Button 
                              size="xs" 
                              variant="outline"
                              onClick={() => handleDeleteDebt(debt.id, isOwed ? 'owed' : 'receivable')}
                            >
                              {t('common.delete')}
                            </Button>
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => handleMarkAsPaid(debt.id, isOwed ? 'owed' : 'receivable')}
                            >
                              {t('debtManagement.markAsPaid')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}