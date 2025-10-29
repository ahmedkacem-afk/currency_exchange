"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useI18n } from "../i18n/I18nProvider.jsx"
import { getWallets, getAllCurrencyTypes } from "../lib/api.js"
import { getExchangeRates } from "../lib/supabase/tables/exchange_rates.js"
import { Card, CardHeader, CardBody } from "../components/Card.jsx"
import Button from "../components/Button.jsx"
import Input from "../components/Input.jsx"
import CurrencySelect from "../components/CurrencySelect.jsx"
import { useToast } from "../components/Toast.jsx"
import { getUserCustodyRecords } from "../lib/supabase/tables/custody.js"
import { getSellRate } from "../lib/exchangeRateCalculator.js"

/**
 * Sell Currency Page - Interface for selling currency to customers
 * Part of the cashier operations
 */
export default function SellCurrencyPage() {
  const { t } = useI18n()
  const [exchangeRates, setExchangeRates] = useState([])
  const [wallets, setWallets] = useState([])
  const [custodyRecords, setCustodyRecords] = useState([])
  const [currencyTypes, setCurrencyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { show } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    sellCurrencyCode: "", // Currency code to sell to customer (e.g., 'USDT', 'EUR')
    receiveCurrencyCode: "", // Currency code to receive from customer (e.g., 'USD', 'LYD')
    amount: "", // Amount of currency to sell
    sourceWallet: "", // Wallet/custody where we get currency to sell
    destinationWallet: "", // Wallet/custody where we deposit received currency
    price: "", // Price/rate of the currency exchange
    receivedAmount: "", // Amount received from customer (if paid to custody)
  })

  // Calculate the total based on amount and price
  const total =
    formData.amount && formData.price
      ? (Number.parseFloat(formData.amount) * Number.parseFloat(formData.price)).toFixed(2)
      : "0.00"

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        const [exchangeRatesData, walletsData, custodyData, currencyTypesData] = await Promise.all([
          getExchangeRates(),
          getWallets(),
          getUserCustodyRecords(),
          getAllCurrencyTypes(),
        ])

        setExchangeRates(exchangeRatesData)
        setWallets(walletsData?.wallets?.filter((wallet) => !wallet.is_treasury) || [])
        setCustodyRecords(custodyData?.data || custodyData || [])
        setCurrencyTypes(currencyTypesData || [])
      } catch (error) {
        console.error("[v0] Error loading data:", error)
        show("Failed to load data", "error")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [show])

  useEffect(() => {
    if (exchangeRates.length > 0 && formData.sellCurrencyCode && formData.receiveCurrencyCode) {
      // For SELL: we're selling sellCurrencyCode for receiveCurrencyCode
      // Use the sell rate of the currency we're selling
      const sellRate = getSellRate(formData.sellCurrencyCode, formData.receiveCurrencyCode, exchangeRates)

      setFormData((prev) => ({
        ...prev,
        price: sellRate.toFixed(6),
      }))

      if (formData.sourceWallet.startsWith("custody:")) {
        const custodyId = formData.sourceWallet.split(":")[1]
        const selectedCustody = custodyRecords.find((c) => c.id === custodyId)

        if (selectedCustody && selectedCustody.currencyCode !== formData.sellCurrencyCode) {
          setFormData((prev) => ({ ...prev, sourceWallet: "" }))
        }
      }
    }
  }, [formData.sellCurrencyCode, formData.receiveCurrencyCode, exchangeRates, custodyRecords])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const getSourceOptions = () => {
    const options = []

    if (formData.sellCurrencyCode) {
      const filteredCustody = custodyRecords.filter((c) => c.currencyCode === formData.sellCurrencyCode)
      if (filteredCustody.length > 0) {
        options.push(
          <optgroup key="custody" label="Personal Custody">
            {filteredCustody.map((custody) => (
              <option key={custody.id} value={custody.value || `custody:${custody.id}`}>
                {custody.displayName}
              </option>
            ))}
          </optgroup>,
        )
      }

      const filteredWallets = wallets.filter((w) => w.currencies && w.currencies[formData.sellCurrencyCode])
      if (filteredWallets.length > 0) {
        options.push(
          <optgroup key="wallets" label="Wallets">
            {filteredWallets.map((wallet) => (
              <option key={wallet.id} value={`wallet:${wallet.id}`}>
                {wallet.name}
              </option>
            ))}
          </optgroup>,
        )
      }
    }

    return options
  }

  const getDestinationOptions = () => {
    const options = []

    if (formData.receiveCurrencyCode) {
      const filteredCustody = custodyRecords.filter((c) => c.currencyCode === formData.receiveCurrencyCode)
      if (filteredCustody.length > 0) {
        options.push(
          <optgroup key="custody" label="Personal Custody">
            {filteredCustody.map((custody) => (
              <option key={custody.id} value={custody.value || `custody:${custody.id}`}>
                {custody.displayName}
              </option>
            ))}
          </optgroup>,
        )
      }

      const filteredWallets = wallets.filter((w) => w.currencies && w.currencies[formData.receiveCurrencyCode])
      if (filteredWallets.length > 0) {
        options.push(
          <optgroup key="wallets" label="Wallets">
            {filteredWallets.map((wallet) => (
              <option key={wallet.id} value={`wallet:${wallet.id}`}>
                {wallet.name}
              </option>
            ))}
          </optgroup>,
        )
      }
    }

    return options
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Import the transaction service
      const { transactionService } = await import("../lib/transactionService")

      const extractId = (value) => {
        if (value.startsWith("wallet:") || value.startsWith("custody:")) {
          return value.split(":")[1]
        }
        return value
      }

      // Create a sell transaction (us selling to customer)
      const result = await transactionService.createSellTransaction({
        ...formData,
        sourceWallet: extractId(formData.sourceWallet),
        destinationWallet: extractId(formData.destinationWallet),
        total: Number.parseFloat(total),
      })

      // Show success message
      show("Currency sale recorded successfully", "success")

      // Reset form
      setFormData({
        sellCurrencyCode: "",
        receiveCurrencyCode: "",
        amount: "",
        sourceWallet: "",
        destinationWallet: "",
        price: "",
        receivedAmount: "",
      })
    } catch (error) {
      console.error("[v0] Error recording currency sale:", error)
      show(error.message || "Failed to record sale", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Use currency types directly from the database
  const prepareCurrencyOptions = () => {
    return [...currencyTypes]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("cashier.sellTitle")}
          subtitle={t("cashier.sellSubtitle")}
          actions={
            <Link to="/cashier">
              <Button variant="outline">{t("common.back")}</Button>
            </Link>
          }
        />
        <CardBody>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Currency exchange section */}
              <div className="space-y-6">
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium text-lg mb-4 text-orange-700">{t("cashier.sellTitle")}</h3>

                  {/* Currency to sell to customer */}
                  <div className="bg-orange-50 p-4 rounded-lg mb-4">
                    <label className="block text-sm font-medium text-orange-800 mb-2">
                      {t("cashier.currencyToSell")}
                    </label>
                    <CurrencySelect
                      value={formData.sellCurrencyCode}
                      onChange={(value) => setFormData((prev) => ({ ...prev, sellCurrencyCode: value }))}
                      customCurrencies={prepareCurrencyOptions()}
                      required
                    />
                    <div className="text-xs text-orange-700 mt-2">
                      {t("cashier.selling")} ({t("cashier.toCustomer")})
                    </div>
                  </div>

                  {/* Currency to receive from customer */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-green-800 mb-2">
                      {t("cashier.currencyToReceive")}
                    </label>
                    <CurrencySelect
                      value={formData.receiveCurrencyCode}
                      onChange={(value) => setFormData((prev) => ({ ...prev, receiveCurrencyCode: value }))}
                      customCurrencies={prepareCurrencyOptions()}
                      required
                    />
                    <div className="text-xs text-green-700 mt-2">
                      {t("cashier.receiving")} ({t("cashier.fromCustomer")})
                    </div>
                  </div>
                </div>

                {/* Selected currencies info */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold mb-2">{t("cashier.exchangeDescription")}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1">
                      {formData.sellCurrencyCode && formData.receiveCurrencyCode ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{t("cashier.selling")}:</span>
                            <span className="bg-orange-100 px-2 py-1 rounded font-medium">
                              {formData.sellCurrencyCode}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{t("cashier.receiving")}:</span>
                            <span className="bg-green-100 px-2 py-1 rounded font-medium">
                              {formData.receiveCurrencyCode}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">{t("cashier.selectBothCurrencies")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount and Price section */}
              <div className="border-t pt-4 mt-2">
                <h3 className="font-medium text-lg mb-4 text-gray-700">{t("cashier.transactionDetails")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Input
                      label={
                        <div className="flex items-center">
                          <span className="mr-2">{t("cashier.amountToSell")}</span>
                          {formData.sellCurrencyCode && (
                            <span className="bg-orange-100 px-2 py-1 text-xs rounded font-medium">
                              {formData.sellCurrencyCode}
                            </span>
                          )}
                        </div>
                      }
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">{t("cashier.amountHelp")}</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Input
                      label={
                        <div className="flex flex-col">
                          <span>{t("cashier.exchangeRate")}</span>
                          {formData.receiveCurrencyCode && formData.sellCurrencyCode && (
                            <span className="text-xs text-gray-600 mt-1">
                              {formData.receiveCurrencyCode} / {formData.sellCurrencyCode}
                            </span>
                          )}
                        </div>
                      }
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("cashier.sourceWallet")} ({t("cashier.whereToWithdrawFrom")})
                  </label>
                  <select
                    name="sourceWallet"
                    value={formData.sourceWallet}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  >
                    <option value="">{t("cashier.selectWallet")}</option>
                    {getSourceOptions()}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("cashier.destinationWallet")} ({t("cashier.whereToDepositTo")})
                  </label>
                  <select
                    name="destinationWallet"
                    value={formData.destinationWallet}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  >
                    <option value="">{t("cashier.selectWallet")}</option>
                    {getDestinationOptions()}
                  </select>
                </div>
              </div>

              {/* Total calculation display */}
              <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 mt-4">
                <h4 className="font-medium text-blue-800 mb-2">{t("cashier.transactionSummary")}</h4>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">{t("cashier.amountSelling")}:</span>
                    <span className="font-medium">
                      {formData.amount || "0.00"} {formData.sellCurrencyCode || ""}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">{t("cashier.atRate")}:</span>
                    <span className="font-medium">
                      {formData.price || "0.00"}{" "}
                      {formData.receiveCurrencyCode
                        ? `${formData.receiveCurrencyCode}/${formData.sellCurrencyCode}`
                        : ""}
                    </span>
                  </div>

                  <div className="border-t border-blue-200 my-2 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-blue-900">{t("cashier.totalAmount")}:</span>
                    <span className="text-xl font-bold text-blue-900">
                      {total} {formData.receiveCurrencyCode ? formData.receiveCurrencyCode.split("-")[0] : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                  {submitting ? t("cashier.processing") : t("cashier.completeSale")}
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
