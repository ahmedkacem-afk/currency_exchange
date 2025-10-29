"use client"

/**
 * Exchange Rates Display Component
 * Shows current exchange rates for the cashier interface
 */

import { useEffect, useState } from "react"
import { useI18n } from "../i18n/I18nProvider.jsx"
import { Card, CardHeader, CardBody } from "./Card.jsx"
import * as exchangeRatesApi from "../lib/supabase/tables/exchange_rates"

export default function ExchangeRatesDisplay() {
  const { t } = useI18n()
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRates()

    // Refresh rates every 30 seconds
    const interval = setInterval(loadRates, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRates = async () => {
    try {
      const data = await exchangeRatesApi.getExchangeRates()
      setRates(data)
    } catch (error) {
      console.error("Error loading exchange rates:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-4">{t("exchangeRates.loading")}</div>
  }

  return (
    <Card>
      <CardHeader title={t("exchangeRates.current")} />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((rate) => (
            <div key={rate.currency_code} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold text-lg mb-3 text-center">{rate.currency_code}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("exchangeRates.toUsd")}:</span>
                  <span className="font-medium">{Number(rate.rate_to_usd).toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("exchangeRates.toLyd")}:</span>
                  <span className="font-medium">{Number(rate.rate_to_lyd).toFixed(4)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
