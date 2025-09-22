import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getWallets, withdraw, exportPdf } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { useToast } from '../components/Toast.jsx'

export default function WithdrawalsPage() {
  const { t } = useI18n()
  const [wallets, setWallets] = useState([])
  const [walletId, setWalletId] = useState('')
  const [usd, setUsd] = useState('')
  const [lyd, setLyd] = useState('')
  const [reason, setReason] = useState('')
  const [reportType, setReportType] = useState('summary')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()

  useEffect(() => {
    getWallets().then(setWallets)
  }, [])

  async function onWithdraw(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const res = await withdraw(walletId, { usd: Number(usd) || 0, lyd: Number(lyd) || 0, reason })
      setMessage('Updated balances')
      show('Withdrawal applied', 'success')
    } catch (e) {
      show('Withdrawal failed', 'error')
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('withdrawals.title')} subtitle={t('nav.withdrawals')} />
        <CardBody>
          <form onSubmit={onWithdraw} className="space-y-4">
            <div>
              <div className="text-sm mb-1 text-gray-600">{t('withdrawals.chooseWallet')}</div>
              <select className="border rounded-md px-3 py-2" value={walletId} onChange={e => setWalletId(e.target.value)}>
                <option value="">--</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input placeholder="100" label={t('withdrawals.usd')} value={usd} onChange={e => setUsd(e.target.value)} />
              <Input placeholder="250" label={t('withdrawals.lyd')} value={lyd} onChange={e => setLyd(e.target.value)} />
            </div>
            <Input placeholder="Cash payout / Office expense" label={t('withdrawals.reason')} value={reason} onChange={e => setReason(e.target.value)} />
            <Button disabled={loading} type="submit" variant="success">{loading ? '...' : t('withdrawals.confirm')}</Button>
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


