import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getSummary, getAllStats, getWalletStats, getPrices, setPrices, getWallets } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { UsdIcon, LydIcon } from '../components/Icons.jsx'
import { useToast } from '../components/Toast.jsx'
import AddCurrencyModal from '../components/AddCurrencyModal.jsx'
import AddCurrencyButton from '../components/AddCurrencyButton.jsx'
import SaveButton from '../components/SaveButton.jsx'

function StatCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function Trio({ title, dataset }) {
  const { t } = useI18n()
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-medium mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div><div className="text-gray-600">{t('dashboard.lowest')}</div><div className="font-semibold">{dataset?.min ?? '-'}</div></div>
        <div><div className="text-gray-600">{t('dashboard.median')}</div><div className="font-semibold">{dataset?.median ?? '-'}</div></div>
        <div><div className="text-gray-600">{t('dashboard.highest')}</div><div className="font-semibold">{dataset?.max ?? '-'}</div></div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState(null)
  const [wallets, setWallets] = useState([])
  const [selected, setSelected] = useState('')
  const [statsAll, setStatsAll] = useState(null)
  const [statsWallet, setStatsWallet] = useState(null)
  const [prices, setPricesState] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false)
  const { show } = useToast()

  useEffect(() => {
    setLoading(true)
    
    // Load all data in parallel
    Promise.all([
      // Get summary data
      getSummary().catch(error => {
        console.error('Error loading summary:', error);
        return null;
      }),
      
      // Get wallets directly from Supabase
      getWallets().catch(error => {
        console.error('Error loading wallets:', error);
        return { wallets: [] };
      }),
      
      // Get stats
      getAllStats().catch(error => {
        console.error('Error loading stats:', error);
        return null;
      }),
      
      // Get prices
      getPrices().catch(error => {
        console.error('Error loading prices:', error);
        return null;
      })
    ]).then(([s, ws, sa, p]) => {
      console.log('DashboardPage - All data loaded:', { 
        summary: s, 
        wallets: ws, 
        stats: sa, 
        prices: p 
      });
      
      // Set summary data
      setSummary(s);
      
      // Extract wallets from the response
      if (ws && ws.wallets) {
        console.log('DashboardPage - Setting wallets:', ws.wallets);
        setWallets(ws.wallets);
      } else {
        console.error('DashboardPage - No wallets found in response:', ws);
        setWallets([]);
      }
      
      // Set other data
      setStatsAll(sa);
      setPricesState(p);
    }).catch(err => {
      console.error('DashboardPage - Error loading dashboard data:', err);
      show('Error loading dashboard data', 'error');
    }).finally(() => {
      setLoading(false);
    });
  }, [])

  useEffect(() => {
    if (selected) {
      getWalletStats(selected).then(setStatsWallet)
    } else {
      setStatsWallet(null)
    }
  }, [selected])

  const selectedWallet = useMemo(() => wallets.find(w => w.id === selected), [wallets, selected])

  async function onSavePrices(e) {
    e.preventDefault()
    try {
      setSaving(true)
      console.log('Saving prices:', {
        sellold: Number(prices.sellold),
        sellnew: Number(prices.sellnew),
        buyold: Number(prices.buyold),
        buynew: Number(prices.buynew),
        sellDisabled: Boolean(prices.sellDisabled),
        buyDisabled: Boolean(prices.buyDisabled)
      })
      
      const updated = await setPrices({
        sellold: Number(prices.sellold),
        sellnew: Number(prices.sellnew),
        buyold: Number(prices.buyold),
        buynew: Number(prices.buynew),
        sellDisabled: Boolean(prices.sellDisabled),
        buyDisabled: Boolean(prices.buyDisabled)
      })
      
      console.log('Prices updated response:', updated)
      setPricesState(updated)
      show('Prices saved successfully', 'success')
    } catch (error) {
      console.error('Error saving prices:', error)
      show('Error saving prices: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Legacy USD card */}
        <Card>
          <CardHeader icon={<UsdIcon />} title={Intl.NumberFormat().format(summary?.totalUsd ?? 0)} subtitle={t('dashboard.totalUsd')} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>
        
        {/* Legacy LYD card */}
        <Card>
          <CardHeader icon={<LydIcon />} title={Intl.NumberFormat().format(summary?.totalLyd ?? 0)} subtitle={t('dashboard.totalLyd')} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>
        
        {/* Number of wallets */}
        <Card>
          <CardHeader title={summary?.count ?? '-'} subtitle={t('dashboard.numWallets')} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>
        
        {/* Dynamic currency totals */}
        {summary?.currencyTotals && Object.entries(summary.currencyTotals)
          // Filter out USD and LYD since they're already displayed above
          .filter(([code]) => code !== 'USD' && code !== 'LYD')
          .map(([code, total]) => (
            <Card key={code}>
              <CardHeader 
                title={Intl.NumberFormat().format(total)} 
                subtitle={`Total ${code}`} 
              />
              <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
            </Card>
          ))
        }
      </div>

      <Card>
        <CardHeader title={t('dashboard.walletBalances')} subtitle={t('dashboard.selectWallet')} />
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <select 
              className="border rounded-md px-3 py-2 flex-grow" 
              value={selected} 
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">--</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            
            {/* Add button for adding currencies to wallet */}
            {selected && (
              <AddCurrencyButton
                variant="primary"
                className="ml-2"
                onClick={() => setIsAddCurrencyModalOpen(true)}
                title="Add Currency"
              >
                Add Currency
              </AddCurrencyButton>
            )}
          </div>
          
          {selectedWallet && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Show legacy USD and LYD if present */}
              {selectedWallet.usd !== undefined && (
                <Card>
                  <CardHeader 
                    icon={<UsdIcon />} 
                    title={Intl.NumberFormat().format(selectedWallet.usd)} 
                    subtitle={t('dashboard.usd')} 
                  />
                </Card>
              )}
              
              {selectedWallet.lyd !== undefined && (
                <Card>
                  <CardHeader 
                    icon={<LydIcon />} 
                    title={Intl.NumberFormat().format(selectedWallet.lyd)} 
                    subtitle={t('dashboard.lyd')} 
                  />
                </Card>
              )}
              
              {/* Show all other currencies from the currencies object */}
              {selectedWallet.currencies && Object.entries(selectedWallet.currencies)
                // Filter out USD/LYD if they're already shown from legacy fields
                .filter(([code]) => 
                  (code !== 'USD' || selectedWallet.usd === undefined) && 
                  (code !== 'LYD' || selectedWallet.lyd === undefined)
                )
                .map(([code, balance]) => (
                  <Card key={code}>
                    <CardHeader 
                      title={Intl.NumberFormat().format(balance)} 
                      subtitle={code} 
                    />
                  </Card>
                ))
              }
            </div>
          )}
        </CardBody>
      </Card>

      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={t('dashboard.buyInfo')} />
          <CardBody>
            <Trio 
              title="" 
              dataset={selected 
                ? statsWallet?.buy 
                : statsAll ? {
                    median: statsAll.buyAverage,
                    min: statsAll.buyAverage,
                    max: statsAll.buyAverage
                  } : null
              } 
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('dashboard.sellInfo')} />
          <CardBody>
            <Trio 
              title="" 
              dataset={selected 
                ? statsWallet?.sell 
                : statsAll ? {
                    median: statsAll.sellAverage,
                    min: statsAll.sellAverage,
                    max: statsAll.sellAverage
                  } : null
              } 
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('dashboard.managerPrices')} />
        <CardBody>
          <form onSubmit={onSavePrices} className="space-y-4">
            {/* Selling Section */}
            <div className="border p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Selling Prices</h3>
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-600">
                    {prices?.sellDisabled ? 'Disabled' : 'Enabled'}
                  </span>
                  <Button
                    type="button"
                    variant={prices?.sellDisabled ? "success" : "danger"}
                    size="sm"
                    onClick={() => setPricesState(p => ({ 
                      ...p, 
                      sellDisabled: !p?.sellDisabled
                    }))}
                  >
                    {prices?.sellDisabled ? 'Enable' : 'Disable'}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label={t('dashboard.sellold')} 
                  value={prices?.sellold ?? ''} 
                  onChange={e => setPricesState(p => ({ ...p, sellold: e.target.value }))}
                  disabled={prices?.sellDisabled}
                />
                <Input 
                  label={t('dashboard.sellnew')} 
                  value={prices?.sellnew ?? ''} 
                  onChange={e => setPricesState(p => ({ ...p, sellnew: e.target.value }))}
                  disabled={prices?.sellDisabled}
                />
              </div>
            </div>
            
            {/* Buying Section */}
            <div className="border p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Buying Prices</h3>
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-600">
                    {prices?.buyDisabled ? 'Disabled' : 'Enabled'}
                  </span>
                  <Button
                    type="button"
                    variant={prices?.buyDisabled ? "success" : "danger"}
                    size="sm"
                    onClick={() => setPricesState(p => ({ 
                      ...p, 
                      buyDisabled: !p?.buyDisabled
                    }))}
                  >
                    {prices?.buyDisabled ? 'Enable' : 'Disable'}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label={t('dashboard.buyold')} 
                  value={prices?.buyold ?? ''} 
                  onChange={e => setPricesState(p => ({ ...p, buyold: e.target.value }))}
                  disabled={prices?.buyDisabled}
                />
                <Input 
                  label={t('dashboard.buynew')} 
                  value={prices?.buynew ?? ''} 
                  onChange={e => setPricesState(p => ({ ...p, buynew: e.target.value }))}
                  disabled={prices?.buyDisabled}
                />
              </div>
            </div>
            
            <SaveButton disabled={saving} type="submit" variant="success">
              {saving ? '...' : t('dashboard.save')}
            </SaveButton>
          </form>
        </CardBody>
      </Card>
      
      {/* Modals */}
      <AddCurrencyModal 
        isOpen={isAddCurrencyModalOpen}
        onClose={() => setIsAddCurrencyModalOpen(false)}
        onSuccess={() => {
          // Refresh wallet data after adding a currency
          const refreshData = async () => {
            try {
              const [s, ws] = await Promise.all([getSummary(), getWallets()]);
              setSummary(s);
              if (ws && ws.wallets) {
                setWallets(ws.wallets);
              }
            } catch (err) {
              console.error('Error refreshing data:', err);
              show('Error refreshing data', 'error');
            }
          };
          refreshData();
        }}
        wallet={selectedWallet}
      />
    </div>
  )
}


