import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getSummary, getWallets, getAllStats, getWalletStats, getPrices, setPrices } from '../lib/supabaseApi.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { UsdIcon, LydIcon } from '../components/Icons.jsx'
import { useToast } from '../components/Toast.jsx'

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
  const { show } = useToast()

  useEffect(() => {
    setLoading(true)
    Promise.all([getSummary(), getWallets(), getAllStats(), getPrices()]).then(([s, ws, sa, p]) => {
      console.log('Dashboard data loaded:', { summary: s, wallets: ws, stats: sa, prices: p })
      setSummary(s)
      // Extract wallets from the response
      if (ws && ws.wallets) {
        console.log('Setting wallets:', ws.wallets)
        setWallets(ws.wallets)
      } else {
        console.error('No wallets found in response:', ws)
        setWallets([])
      }
      setStatsAll(sa)
      setPricesState(p)
    }).catch(err => {
      console.error('Error loading dashboard data:', err)
      show('Error loading dashboard data', 'error')
    }).finally(()=>setLoading(false))
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
        buynew: Number(prices.buynew)
      })
      
      const updated = await setPrices({
        sellold: Number(prices.sellold),
        sellnew: Number(prices.sellnew),
        buyold: Number(prices.buyold),
        buynew: Number(prices.buynew),
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
        <Card>
          <CardHeader icon={<UsdIcon />} title={Intl.NumberFormat().format(summary?.totalUsd ?? 0)} subtitle={t('dashboard.totalUsd')} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>
        <Card>
          <CardHeader icon={<LydIcon />} title={Intl.NumberFormat().format(summary?.totalLyd ?? 0)} subtitle={t('dashboard.totalLyd')} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>
        <Card>
          <CardHeader title={summary?.count ?? '-'} subtitle={t('dashboard.numWallets')} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('dashboard.walletBalances')} subtitle={t('dashboard.selectWallet')} />
        <CardBody className="space-y-3">
          <select className="border rounded-md px-3 py-2" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">--</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {selectedWallet && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card><CardHeader icon={<UsdIcon />} title={Intl.NumberFormat().format(selectedWallet.usd)} subtitle={t('dashboard.usd')} /></Card>
              <Card><CardHeader icon={<LydIcon />} title={Intl.NumberFormat().format(selectedWallet.lyd)} subtitle={t('dashboard.lyd')} /></Card>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('dashboard.sellOld')} value={prices?.sellold ?? ''} onChange={e => setPricesState(p => ({ ...p, sellold: e.target.value }))} />
              <Input label={t('dashboard.sellNew')} value={prices?.sellnew ?? ''} onChange={e => setPricesState(p => ({ ...p, sellnew: e.target.value }))} />
              <Input label={t('dashboard.buyOld')} value={prices?.buyold ?? ''} onChange={e => setPricesState(p => ({ ...p, buyold: e.target.value }))} />
              <Input label={t('dashboard.buyNew')} value={prices?.buynew ?? ''} onChange={e => setPricesState(p => ({ ...p, buynew: e.target.value }))} />
            </div>
            <Button disabled={saving} type="submit" variant="success">{saving ? '...' : t('dashboard.save')}</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}


