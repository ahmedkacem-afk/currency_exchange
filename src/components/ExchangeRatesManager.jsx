"use client"

/**
 * Exchange Rates Manager Component
 * Allows managers to edit exchange rates for all currencies
 */

import { useState, useEffect } from "react"
import { useI18n } from "../i18n/I18nProvider.jsx"
import { Card, CardHeader, CardBody } from "./Card.jsx"
import Input from "./Input.jsx"
import SaveButton from "./SaveButton.jsx"
import { useToast } from "./Toast.jsx"
import * as exchangeRatesApi from "../lib/supabase/tables/exchange_rates"
import { getAllCurrencyTypes } from "../lib/supabase/tables/currency_types"

export default function ExchangeRatesManager() {
  const { t } = useI18n()
  const { show } = useToast()
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingRates, setEditingRates] = useState({})

  useEffect(() => {
    loadRates()
  }, [])

  const loadRates = async () => {
    try {
      setLoading(true)
      const [rateRows, currencyTypes] = await Promise.all([
        exchangeRatesApi.getExchangeRates(),
        getAllCurrencyTypes().catch(() => []),
      ])

      // Build a superset of currency codes from currency_types and existing rates
      const codes = new Set([...(rateRows || []).map((r) => r.currency_code), ...(currencyTypes || []).map((c) => c.code)])

      // Ensure USD and LYD exist
      codes.add("USD")
      codes.add("LYD")

      // Create a merged list ensuring every code appears at least with defaults
      const merged = Array.from(codes)
        .sort()
        .map((code) => {
          const existing = rateRows.find((r) => r.currency_code === code)
          if (existing) return existing
          return {
            currency_code: code,
            rate_to_usd: code === "USD" ? 1 : 0,
            rate_to_lyd: code === "LYD" ? 1 : 0,
          }
        })

      setRates(merged)

      // Initialize editing state for all merged rows
      const initialEditing = {}
      merged.forEach((rate) => {
        initialEditing[rate.currency_code] = {
          rate_to_usd: rate.rate_to_usd,
          rate_to_lyd: rate.rate_to_lyd,
        }
      })
      setEditingRates(initialEditing)
    } catch (error) {
      console.error("Error loading exchange rates:", error)
      show("Failed to load exchange rates", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleRateChange = (currencyCode, field, value) => {
    setEditingRates((prev) => ({
      ...prev,
      [currencyCode]: {
        ...prev[currencyCode],
        [field]: Number.parseFloat(value) || 0,
      },
    }))
  }

  const handleSaveRate = async (currencyCode) => {
    try {
      setSaving(true)
      const edited = editingRates[currencyCode]
      // Decide to create or update based on whether it exists in rates state
      const exists = rates.some((r) => r.currency_code === currencyCode && r.id !== undefined)
      if (exists) {
        await exchangeRatesApi.updateExchangeRate(currencyCode, edited.rate_to_usd, edited.rate_to_lyd)
      } else {
        await exchangeRatesApi.createExchangeRate(currencyCode, edited.rate_to_usd, edited.rate_to_lyd)
      }

      // Update local state
      setRates(
        rates.map((r) =>
          r.currency_code === currencyCode
            ? { ...r, rate_to_usd: edited.rate_to_usd, rate_to_lyd: edited.rate_to_lyd }
            : r,
        ),
      )

      show(`Exchange rate for ${currencyCode} updated successfully`, "success")
    } catch (error) {
      console.error("Error saving exchange rate:", error)
      show("Failed to save exchange rate", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading exchange rates...</div>
  }

  return (
    <Card>
      <CardHeader title={t("exchangeRates.title")} subtitle={t("exchangeRates.subtitle")} />
      <CardBody>
        <div className="space-y-4">
          {rates.length === 0 ? (
            <div className="text-center text-gray-500 py-4">{t("exchangeRates.noRates")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold">{t("exchangeRates.currency")}</th>
                    <th className="text-left py-2 px-3 font-semibold">{t("exchangeRates.rateToUsd")}</th>
                    <th className="text-left py-2 px-3 font-semibold">{t("exchangeRates.rateToLyd")}</th>
                    <th className="text-left py-2 px-3 font-semibold">{t("exchangeRates.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.currency_code} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{rate.currency_code}</td>
                      <td className="py-3 px-3">
                        <Input
                          type="number"
                          step="0.0001"
                          value={editingRates[rate.currency_code]?.rate_to_usd ?? rate.rate_to_usd}
                          onChange={(e) => handleRateChange(rate.currency_code, "rate_to_usd", e.target.value)}
                          className="w-32"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <Input
                          type="number"
                          step="0.0001"
                          value={editingRates[rate.currency_code]?.rate_to_lyd ?? rate.rate_to_lyd}
                          onChange={(e) => handleRateChange(rate.currency_code, "rate_to_lyd", e.target.value)}
                          className="w-32"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <SaveButton
                          disabled={saving}
                          onClick={() => handleSaveRate(rate.currency_code)}
                          variant="success"
                          size="sm"
                        >
                          {saving ? "..." : t("exchangeRates.save")}
                        </SaveButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-1">{t("exchangeRates.info")}:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("exchangeRates.usdAlways1")}</li>
              <li>{t("exchangeRates.lydAlways1")}</li>
              <li>{t("exchangeRates.otherCurrencies")}</li>
              <li>{t("exchangeRates.example")}</li>
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
