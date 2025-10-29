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
import { getBuyRate } from "../lib/exchangeRateCalculator.js"

/**
 * Buy Currency Page - Interface for buying currency from customers
 * Part of the cashier operations
 */
export default function BuyCurrencyPage() {
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
    receiveCurrencyCode: "", // Currency code to receive from customer (e.g., 'USDT', 'EUR')
    payCurrencyCode: "", // Currency code to pay to customer (e.g., 'USD', 'LYD')
    amount: "", // Amount of currency to buy
    sourceWallet: "", // Wallet/custody where we get money to pay customer
    destinationWallet: "", // Wallet/custody where we deposit the currency received
    price: "", // Price/rate of the currency exchange
    receivedAmount: "", // Amount received from customer
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
    if (exchangeRates.length > 0 && formData.receiveCurrencyCode && formData.payCurrencyCode) {
      // For BUY: we're buying receiveCurrencyCode with payCurrencyCode
      // Use the buy rate of the currency we're receiving
      const buyRate = getBuyRate(formData.receiveCurrencyCode, formData.payCurrencyCode, exchangeRates)

      setFormData((prev) => ({
        ...prev,
        price: buyRate.toFixed(6),
      }))

      if (formData.destinationWallet.startsWith("custody:")) {
        const custodyId = formData.destinationWallet.split(":")[1]
        const selectedCustody = custodyRecords.find((c) => c.id === custodyId)

        if (selectedCustody && selectedCustody.currencyCode !== formData.receiveCurrencyCode) {
          setFormData((prev) => ({ ...prev, destinationWallet: "" }))
        }
      }
    }
  }, [formData.receiveCurrencyCode, formData.payCurrencyCode, exchangeRates, custodyRecords])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const getSourceOptions = () => {
    const options = []

    if (formData.payCurrencyCode) {
      const filteredCustody = custodyRecords.filter((c) => c.currencyCode === formData.payCurrencyCode)
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

      const filteredWallets = wallets.filter((w) => w.currencies && w.currencies[formData.payCurrencyCode])
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
      const { transactionService, getWalletNameForTransaction, getCustodyNameForTransaction } = await import("../lib/transactionService")

      // Helper to resolve name from value
      const resolveName = async (value) => {
        if (!value || value === "client") return "Client"
        if (value.startsWith("wallet:")) {
          const id = value.split(":")[1]
          return await getWalletNameForTransaction(id)
        }
        if (value.startsWith("custody:")) {
          const id = value.split(":")[1]
          return await getCustodyNameForTransaction(id)
        }
        return value
      }

      const sourceName = await resolveName(formData.sourceWallet)
      const destinationName = await resolveName(formData.destinationWallet)

      // Create a buy transaction (customer selling to us)
      const result = await transactionService.createBuyTransaction({
        ...formData,
        total: Number.parseFloat(total),
        source: sourceName,
        destination: destinationName,
      })

      // Show success message
      show("Currency purchase recorded successfully", "success")

      // Reset form
      setFormData({
        receiveCurrencyCode: "",
        payCurrencyCode: "",
        amount: "",
        sourceWallet: "",
        destinationWallet: "",
        price: "",
        receivedAmount: "",
      })
    } catch (error) {
      console.error("[v0] Error recording currency purchase:", error)
      show(error.message || "Failed to record purchase", "error")
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
          title={t("cashier.buyTitle")}
          subtitle={t("cashier.buySubtitle")}
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
                  <h3 className="font-medium text-lg mb-4 text-blue-700">{t("cashier.buyTitle")}</h3>

                  {/* Currency to receive from customer */}
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
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
                      {t("cashier.buying")} ({t("cashier.fromCustomer")})
                    </div>
                  </div>

                  {/* Currency to pay to customer */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-blue-800 mb-2">{t("cashier.currencyToPay")}</label>
                    <CurrencySelect
                      value={formData.payCurrencyCode}
                      onChange={(value) => setFormData((prev) => ({ ...prev, payCurrencyCode: value }))}
                      customCurrencies={prepareCurrencyOptions()}
                      required
                    />
                    <div className="text-xs text-blue-700 mt-2">
                      {t("cashier.paying")} ({t("cashier.toCustomer")})
                    </div>
                  </div>
                </div>

                {/* Selected currencies info */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold mb-2">{t("cashier.exchangeDescription")}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1">
                      {formData.receiveCurrencyCode && formData.payCurrencyCode ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{t("cashier.buying")}:</span>
                            <span className="bg-green-100 px-2 py-1 rounded font-medium">
                              {formData.receiveCurrencyCode}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{t("cashier.paying")}:</span>
                            <span className="bg-blue-100 px-2 py-1 rounded font-medium">
                              {formData.payCurrencyCode}
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
                          <span className="mr-2">{t("cashier.amountToBuy")}</span>
                          {formData.receiveCurrencyCode && (
                            <span className="bg-green-100 px-2 py-1 text-xs rounded font-medium">
                              {formData.receiveCurrencyCode}
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
                          {formData.payCurrencyCode && formData.receiveCurrencyCode && (
                            <span className="text-xs text-gray-600 mt-1">
                              {formData.payCurrencyCode} / {formData.receiveCurrencyCode}
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
                    {t("cashier.sourceWallet")} ({t("cashier.whereToPayFrom")})
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
                    <span className="text-blue-700">{t("cashier.amountReceiving")}:</span>
                    <span className="font-medium">
                      {formData.amount || "0.00"} {formData.receiveCurrencyCode || ""}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">{t("cashier.atRate")}:</span>
                    <span className="font-medium">
                      {formData.price || "0.00"}{" "}
                      {formData.payCurrencyCode ? `${formData.payCurrencyCode}/${formData.receiveCurrencyCode}` : ""}
                    </span>
                  </div>

                  <div className="border-t border-blue-200 my-2 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-blue-900">{t("cashier.totalAmount")}:</span>
                    <span className="text-xl font-bold text-blue-900">
                      {total} {formData.payCurrencyCode ? formData.payCurrencyCode.split("-")[0] : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                  {submitting ? t("cashier.processing") : t("cashier.completePurchase")}
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
