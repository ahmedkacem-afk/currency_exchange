import { useEffect, useState, useMemo } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { exportPdf, getWallets as fetchWallets, withdrawCurrency, getAllCurrencyTypes } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { useToast } from '../components/Toast.jsx'
import CurrencySelect from '../components/CurrencySelect.jsx'
import WithdrawButton from '../components/WithdrawButton.jsx'

export default function WithdrawalsPage() {
  const { t } = useI18n()
  const [wallets, setWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [walletId, setWalletId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [reportType, setReportType] = useState('summary')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()

  useEffect(() => {
    async function getWallets() {
      try {
        console.log('WithdrawalsPage - Fetching wallets directly from Supabase...');
        setLoading(true);
        
        // Use the Supabase wallets API directly
        const response = await fetchWallets();
        
        if (response && response.wallets) {
          console.log('WithdrawalsPage - Wallets loaded successfully:', response.wallets);
          setWallets(response.wallets);
        } else {
          console.error('WithdrawalsPage - Unexpected wallet data format:', response);
          setWallets([]);
        }
      } catch (error) {
        console.error('WithdrawalsPage - Error fetching wallets:', error);
        show('Failed to load wallets', 'error');
        setWallets([]);
      } finally {
        setLoading(false);
      }
    }
    
    getWallets();
  }, [])
  
  // Update selected wallet when walletId changes
  useEffect(() => {
    if (!walletId) {
      setSelectedWallet(null);
      return;
    }
    
    const wallet = wallets.find(w => w.id === walletId);
    console.log('WithdrawalsPage - Selected wallet:', wallet, 'from wallets:', wallets);
    
    if (wallet) {
      // Ensure currencies object exists
      if (!wallet.currencies) {
        wallet.currencies = {};
      }
      
      console.log('WithdrawalsPage - Wallet currencies:', wallet.currencies);
      setSelectedWallet(wallet);
      // Reset currency when wallet changes
      setCurrencyCode('');
    } else {
      console.warn(`WithdrawalsPage - Could not find wallet with ID ${walletId} in wallets array:`, wallets);
      setSelectedWallet(null);
    }
  }, [walletId, wallets])

  async function onWithdraw(e) {
    e.preventDefault()
    setMessage('')
    
    if (!walletId || !currencyCode || !amount) {
      show('Please select a wallet, currency, and enter an amount', 'error')
      return
    }
    
    setLoading(true)
    try {
      console.log(`WithdrawalsPage - Processing withdrawal: ${amount} ${currencyCode} from wallet ${walletId}`);
      
      // Process the withdrawal
      const res = await withdrawCurrency(walletId, currencyCode, amount, reason)
      setMessage(`Updated ${currencyCode} balance`)
      show(`Successfully withdrew ${amount} ${currencyCode}`, 'success')
      
      // Update the selected wallet with the new data
      if (res) {
        console.log('WithdrawalsPage - Withdrawal successful, updated wallet:', res);
        
        if (res && !res.currencies) {
          res.currencies = {};
        }
        
        setSelectedWallet(res);
        
        // Also refresh all wallets to keep the list up to date
        console.log('WithdrawalsPage - Refreshing all wallets after withdrawal');
        const walletsResponse = await fetchWallets();
        if (walletsResponse && walletsResponse.wallets) {
          console.log('WithdrawalsPage - Updated wallets:', walletsResponse.wallets);
          setWallets(walletsResponse.wallets);
        }
      }
      
      // Reset fields but keep the selected wallet
      setAmount('')
      setCurrencyCode('')
    } catch (e) {
      console.error('WithdrawalsPage - Withdrawal failed:', e)
      show(e.message || 'Withdrawal failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function onExport() {
    const blob = await exportPdf({ type: reportType, walletId: walletId || undefined })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportType}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // Calculate available currencies for the selected wallet
  const availableCurrencies = useMemo(() => {
    if (!selectedWallet) return [];
    
    const currencies = [];
    
    // Check currencies object only
    if (selectedWallet.currencies) {
      Object.entries(selectedWallet.currencies).forEach(([code, balance]) => {
        if (Number(balance) > 0) {
          currencies.push(code);
        }
      });
    }
    
    console.log('Available currencies for withdrawal:', currencies);
    return currencies;
  }, [selectedWallet]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('withdrawals.title')} subtitle={t('nav.withdrawals')} />
        <CardBody>
          <form onSubmit={onWithdraw} className="space-y-4">
            <div>
              <div className="text-sm mb-1 text-gray-600">{t('withdrawals.chooseWallet')}</div>
              <select 
                className="border rounded-md px-3 py-2 w-full" 
                value={walletId} 
                onChange={e => setWalletId(e.target.value)}
              >
                <option value="">--</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            
            {selectedWallet && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <CurrencySelect
                    label={t('withdrawals.currency')}
                    value={currencyCode}
                    onChange={setCurrencyCode}
                    // Only include currencies that have a balance in this wallet
                    includeOnlyCodes={availableCurrencies}
                    required
                  />
                </div>
                <Input
                  placeholder="100"
                  label={t('withdrawals.amount')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
            )}
            
            <Input placeholder="Cash payout / Office expense" label={t('withdrawals.reason')} value={reason} onChange={e => setReason(e.target.value)} />
            
            <div className="flex items-center justify-between">
              <WithdrawButton 
                disabled={loading || !walletId || !currencyCode || !amount} 
                type="submit" 
                variant="success"
              >
                {loading ? '...' : t('withdrawals.confirm')}
              </WithdrawButton>
              
              {selectedWallet && currencyCode && (
                <div className="text-sm text-gray-600">
                  Available: {(() => {
                    if (selectedWallet.currencies && selectedWallet.currencies[currencyCode] !== undefined) {
                      return Number(selectedWallet.currencies[currencyCode]).toLocaleString();
                    }
                    return '0';
                  })()} {currencyCode}
                </div>
              )}
            </div>
            
            {message && <div className="text-green-700 text-sm">{message}</div>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('withdrawals.reportType')} />
        <CardBody className="flex items-end gap-3 flex-wrap">
          <select className="border rounded-md px-3 py-2" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="summary">Summary</option>
            <option value="wallet">Wallet</option>
          </select>
          <Button onClick={async()=>{ show('Generating PDF...', 'info'); await onExport(); show('Download started', 'success')}} variant="secondary">{t('withdrawals.exportPdf')}</Button>
        </CardBody>
      </Card>
    </div>
  )
}


