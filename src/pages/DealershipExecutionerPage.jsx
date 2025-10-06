import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getPrices } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { useToast } from '../components/Toast.jsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext.jsx'
import { getRecentTransactions } from '../lib/supabase/tables/transactions'

/**
 * Dealership Executioner Page - Interface for monitoring and validating currency transactions
 * Shows current rates and transactions with validation status
 */
export default function DealershipExecutionerPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [prices, setPrices] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'validated'
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [profiles, setProfiles] = useState({})
  const [wallets, setWallets] = useState({})
  const { show } = useToast()
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // Load prices
        const priceData = await getPrices()
        setPrices(priceData)
        
        // Load users for mapping IDs to names
        const { data: profilesData, error: profilesError } = await supabase
          .from('users')
          .select('id, name')
          
        if (profilesError) throw profilesError
        
        // Create a mapping of user_id to name
        const profileMap = {}
        profilesData.forEach(user => {
          profileMap[user.id] = user.name || ''
        })
        setProfiles(profileMap)
        
        // Load wallets for mapping wallet IDs to names
        const { data: walletsData, error: walletsError } = await supabase
          .from('wallets')
          .select('id, name')
          
        if (walletsError) throw walletsError
        
        // Create a mapping of wallet_id to name
        const walletMap = {}
        walletsData.forEach(wallet => {
          walletMap[wallet.id] = wallet.name
        })
        setWallets(walletMap)
        
        // Load users for mapping user IDs to names (for cashiers/clients)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          
        if (usersError) throw usersError
        
        // Create a mapping of user_id to name
        const userMap = {}
        usersData.forEach(user => {
          userMap[user.id] = user.name || user.email
        })
        
        // Load real transactions from transactions table
        const { transactions: transactionsData, error: txError } = await getRecentTransactions({ limit: 50 })
        
        if (txError) throw txError
        
        // Transform the transaction data into the format needed for the UI
        const transformedTransactions = transactionsData.map(tx => {
          // Format date and time
          const createdAt = new Date(tx.createdat || Date.now())
          const date = createdAt.toLocaleDateString('en-US')
          const time = createdAt.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
          
          // Determine validation status - default transactions need validation
          const status = tx.is_validated ? 'validated' : (tx.needs_validation ? 'needs-validation' : 'needs-validation')
          
          // Use the actual transaction amount fields
          const amount = parseFloat(tx.amount || 0)
          const exchangeRate = parseFloat(tx.exchange_rate || 0)
          const totalAmount = parseFloat(tx.total_amount || 0)
          
          // Determine client name from client_name field or use default
          const clientName = tx.client_name || 'Walk-in Client'
          
          // Get cashier name if available
          const cashierName = tx.cashier_id ? 
            (userMap[tx.cashier_id] || profiles[tx.cashier_id] || 'Unknown Cashier') : 
            'System'
          
          // Use the actual source and destination from the database if available
          // Otherwise fallback to type-based logic
          const source = tx.source || (tx.type === 'buy' ? 'Client' : walletMap[tx.walletid] || 'Wallet')
          const destination = tx.destination || (tx.type === 'buy' ? walletMap[tx.walletid] || 'Wallet' : 'Client')
          
          return {
            id: tx.id,
            type: tx.type || 'unknown', // 'buy' or 'sell'
            cashierName: cashierName,
            clientName: clientName,
            source: source,
            destination: destination,
            currency: tx.currency_code || 'USD', // Use actual currency code
            amount: amount.toString(),
            exchangeCurrency: tx.exchange_currency_code || 'LYD', // Use actual exchange currency code
            exchangeRate: exchangeRate.toString(),
            totalAmount: totalAmount.toString(),
            status: status,
            date: date,
            time: time,
            rawData: tx // Store the raw data for reference
          }
        })
        
        setTransactions(transformedTransactions)
      } catch (error) {
        console.error('Error loading data:', error)
        show('Failed to load transaction data', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [show, supabase])
  
  const handleValidate = async (id) => {
    try {
      // Update the transaction record to mark it as validated
      // Get the current user first
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('transactions')
        .update({ 
          is_validated: true, 
          validated_at: Date.now(), // Using consistent timestamp format
          // Get the current user's ID
          validator_id: user?.id // Correct column name based on schema
        })
        .eq('id', id)
      
      if (error) throw error
      
      // Update local state
      setTransactions(prevTransactions => 
        prevTransactions.map(transaction => 
          transaction.id === id ? { ...transaction, status: 'validated' } : transaction
        )
      )
      
      show('Transaction validated successfully', 'success')
      
      // Create a notification for the cashier if we have their ID
      const transaction = transactions.find(t => t.id === id)
      if (transaction && transaction.rawData.cashier_id) {
        try {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              id: crypto.randomUUID(),
              user_id: transaction.rawData.cashier_id,
              title: 'Transaction Validated',
              message: `Your ${transaction.type} transaction for ${transaction.amount} ${transaction.currency} has been validated`,
              type: 'transaction_validation',
              reference_id: id,
              requires_action: false,
              is_read: false
            })
          
          if (notificationError) {
            console.error('Error creating notification:', notificationError)
          }
        } catch (notifyError) {
          console.error('Error creating notification:', notifyError)
          // Continue - notification is not critical to validation success
        }
      }
    } catch (error) {
      console.error('Error validating transaction:', error)
      show('Failed to validate transaction', 'error')
    }
  }
  
  const handleShowDetails = (transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(true)
  }
  
  const handleCloseModal = () => {
    setShowDetailsModal(false)
    setSelectedTransaction(null)
  }
  
  const filteredTransactions = transactions.filter(transaction => {
    // Apply search term filter
    const matchesSearch = 
      transaction.cashierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.treasurerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.clientName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.currency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Apply status filter
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'pending' && transaction.status === 'needs-validation') ||
      (filter === 'validated' && transaction.status === 'validated')
    
    return matchesSearch && matchesFilter
  })

  return (
    <>
      <div className="space-y-6">
        {/* Current Rates Section */}
        <Card>
          <CardHeader 
            title={t('executioner.title')} 
            subtitle={t('executioner.subtitle')}
          />
          <CardBody>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-4">{t('executioner.currentRates')}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Buy Rates */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">{t('cashier.buyRates')}</h4>
                      {prices && (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>{t('cashier.oldDinar')}:</span>
                            <span className="font-semibold">{prices.buyold}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('cashier.newDinar')}:</span>
                            <span className="font-semibold">{prices.buynew}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Sell Rates */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">{t('cashier.sellRates')}</h4>
                      {prices && (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>{t('cashier.oldDinar')}:</span>
                            <span className="font-semibold">{prices.sellold}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('cashier.newDinar')}:</span>
                            <span className="font-semibold">{prices.sellnew}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>
        
        {/* Transactions Table Section */}
        <Card>
          <CardHeader 
            title={t('executioner.transactions')} 
          />
          <CardBody>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <>
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <div className="w-full md:w-1/3">
                    <Input
                      type="text"
                      placeholder={t('executioner.searchTransactions')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('executioner.filter')}:</span>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      <option value="all">All</option>
                      <option value="pending">{t('executioner.pending')}</option>
                      <option value="validated">{t('executioner.validated')}</option>
                    </select>
                  </div>
                </div>
                
                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cashier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Treasurer/Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source / Destination
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('executioner.amount')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('executioner.date')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('executioner.status')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('executioner.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.type === 'custody' ? 'bg-purple-100 text-purple-800' : 
                                transaction.type === 'buy' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {transaction.type === 'custody' ? 'Cash Custody' : 
                                 transaction.type === 'buy' ? t('executioner.buy') : t('executioner.sell')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {transaction.cashierName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {transaction.type === 'custody' ? transaction.treasurerName : transaction.clientName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span>{t('executioner.source')}: {transaction.source}</span>
                                <span>{t('executioner.destination')}: {transaction.destination}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span>{transaction.amount} {transaction.currency}</span>
                                {transaction.type !== 'custody' && transaction.totalAmount && (
                                  <span className="text-xs text-gray-500">
                                    {transaction.totalAmount} {transaction.exchangeCurrency}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span>{transaction.date}</span>
                                <span className="text-xs text-gray-500">{transaction.time}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.status === 'needs-validation' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {transaction.status === 'needs-validation' 
                                  ? t('executioner.needsValidation')
                                  : t('executioner.validated')
                                }
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleShowDetails(transaction)}
                                >
                                  {t('executioner.details')}
                                </Button>
                                {transaction.status === 'needs-validation' && (
                                  <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => handleValidate(transaction.id)}
                                  >
                                    {t('executioner.validate')}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                            {t('executioner.noTransactions')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {t('executioner.details')} - {
                  selectedTransaction.type === 'buy' ? t('executioner.buy') : 
                  selectedTransaction.type === 'sell' ? t('executioner.sell') : 'Transaction'
                } #{selectedTransaction.id.substring(0, 8)}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Transaction Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t('executioner.transactionType')}</h4>
                    <p className="text-base">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTransaction.type === 'custody' ? 'bg-purple-100 text-purple-800' :
                        selectedTransaction.type === 'buy' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedTransaction.type === 'custody' ? 'Cash Custody' :
                         selectedTransaction.type === 'buy' ? t('executioner.buy') : t('executioner.sell')}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t('executioner.cashierName')}</h4>
                    <p className="text-base">{selectedTransaction.cashierName}</p>
                  </div>
                  
                  {selectedTransaction.type === 'custody' ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Treasurer</h4>
                      <p className="text-base">{selectedTransaction.treasurerName}</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">{t('executioner.clientName')}</h4>
                      <p className="text-base">{selectedTransaction.clientName}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t('executioner.date')}</h4>
                    <p className="text-base">{selectedTransaction.date} {selectedTransaction.time}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t('executioner.source')}</h4>
                    <p className="text-base">{selectedTransaction.source}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t('executioner.destination')}</h4>
                    <p className="text-base">{selectedTransaction.destination}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t('executioner.status')}</h4>
                    <p className="text-base">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTransaction.status === 'needs-validation' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedTransaction.status === 'needs-validation' 
                          ? t('executioner.needsValidation')
                          : t('executioner.validated')
                        }
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Transaction Details */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="text-md font-medium mb-3">{t('cashier.transactionSummary')}</h4>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {selectedTransaction.type === 'buy' || selectedTransaction.type === 'sell' ? (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">
                          {selectedTransaction.type === 'buy' 
                            ? `${selectedTransaction.currency} Amount (Received)` 
                            : `${selectedTransaction.currency} Amount (Sold)`}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.amount} {selectedTransaction.currency}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">Exchange Rate</div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.exchangeRate} {selectedTransaction.exchangeCurrency}/{selectedTransaction.currency}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">
                          {selectedTransaction.type === 'buy' 
                            ? `${selectedTransaction.exchangeCurrency} Amount (Given)` 
                            : `${selectedTransaction.exchangeCurrency} Amount (Received)`}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.totalAmount} {selectedTransaction.exchangeCurrency}
                        </div>
                      </div>
                    </>

                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">
                          {selectedTransaction.type === 'buy' 
                            ? t('cashier.amountReceiving')
                            : t('cashier.amountSelling')}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.amount} {selectedTransaction.currency}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">{t('cashier.exchangeRate')}</div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.exchangeRate} {selectedTransaction.exchangeCurrency}/{selectedTransaction.currency}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1 pt-2 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-700">{t('cashier.totalAmount')}</div>
                        <div className="text-sm font-bold text-right">
                          {selectedTransaction.totalAmount} {selectedTransaction.exchangeCurrency}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button 
                variant="outline" 
                onClick={handleCloseModal}
              >
                {t('common.cancel')}
              </Button>
              {selectedTransaction.status === 'needs-validation' && (
                <Button 
                  variant="primary" 
                  className="ml-3"
                  onClick={() => {
                    handleValidate(selectedTransaction.id);
                    handleCloseModal();
                  }}
                >
                  {t('executioner.validate')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}