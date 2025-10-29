import { useEffect, useState } from 'react'
import Button from './Button'
import Input from './Input'
import CurrencySelect from './CurrencySelect'
import { useToast } from './Toast'
import { useI18n } from '../i18n/I18nProvider'
import { addFundsToWallet } from '../lib/wallet_management'

export default function AddFundsModal({ isOpen, onClose, wallet, onSuccess }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [currencyCode, setCurrencyCode] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrencyCode('')
      setAmount('')
    }
  }, [isOpen, wallet?.id])

  if (!isOpen || !wallet) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!currencyCode || !amount || Number(amount) <= 0) return
    try {
      setSubmitting(true)
      const res = await addFundsToWallet(wallet.id, currencyCode, Number(amount))
      if (!res?.success) throw new Error(res?.error || t('walletManagement.errorAddingFunds'))
      show({ type: 'success', title: t('walletManagement.success'), message: t('walletManagement.fundsAddedSuccessfully') })
      if (onSuccess) onSuccess(res.wallet)
      onClose()
    } catch (err) {
      console.error('Add funds failed:', err)
      show({ type: 'error', title: t('walletManagement.errorAddingFunds'), message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('walletManagement.addFunds')}</h3>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose} type="button">✕</button>
        </div>

        <div className="text-sm text-gray-600 mb-4">{wallet.name}</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">{t('walletManagement.selectCurrency')}</label>
            <CurrencySelect value={currencyCode} onChange={setCurrencyCode} required disabled={submitting} />
          </div>
          <Input
            label={t('walletManagement.amount')}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            required
            disabled={submitting}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('walletManagement.addFunds')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}


