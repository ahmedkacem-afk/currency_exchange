import { useEffect, useState } from 'react'
import Button from './Button'
import Input from './Input'
import { useToast } from './Toast'
import { useI18n } from '../i18n/I18nProvider'
import { createCurrencyType } from '../lib/api'
import * as exchangeRatesApi from '../lib/supabase/tables/exchange_rates'

export default function CreateCurrencyTypeModal({ isOpen, onClose, onSuccess }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCode('')
      setName('')
      setSymbol('')
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code || !name) return
    try {
      setSubmitting(true)
      const payload = { code: code.toUpperCase().trim(), name: name.trim(), symbol: symbol.trim() || null }
      await createCurrencyType(payload)
      // Ensure an exchange rate row exists for this new currency so it appears in the manager
      try {
        await exchangeRatesApi.createExchangeRate(payload.code, 0, 0)
      } catch (_) {
        // If it already exists or fails, ignore; user can edit in the manager
      }
      show({ type: 'success', title: t('walletManagement.success'), message: t('exchangeRates.updated') })
      if (onSuccess) onSuccess(payload)
      onClose()
    } catch (err) {
      console.error('Create currency type failed:', err)
      show({ type: 'error', title: t('common.failed'), message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('create.currencyType')}</h3>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose} type="button">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('create.currencyCode')} value={code} onChange={(e) => setCode(e.target.value)} required disabled={submitting} />
          <Input label={t('create.currencyName')} value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
          <Input label={t('create.currencySymbol')} value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={submitting} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('create.addCurrency')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}


