"use client"

import { useState, useEffect, useMemo } from "react"
import { useI18n } from "../i18n/I18nProvider.jsx"
import { getExchangeRates } from "../lib/supabase/tables/exchange_rates.js"
import { Card, CardHeader, CardBody } from "../components/Card.jsx"
import Button from "../components/Button.jsx"
import Input from "../components/Input.jsx"
import { useToast } from "../components/Toast.jsx"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/AuthContext.jsx"
import { getRecentTransactions } from "../lib/supabase/tables/transactions"

/**
 * Dealership Executioner Page - Interface for monitoring and validating currency transactions
 * Shows current rates and transactions with validation status
 */
export default function DealershipExecutionerPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [exchangeRates, setExchangeRates] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all") // 'all', 'pending', 'validated'
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [profiles, setProfiles] = useState({})
  const [wallets, setWallets] = useState({})
  const { show } = useToast()
  const [refsLoaded, setRefsLoaded] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Load reference data once (exchange rates, users, wallets)
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const exchangeRatesData = await getExchangeRates()
        setExchangeRates(exchangeRatesData)

        const { data: profilesData, error: profilesError } = await supabase.from("users").select("id, name")

        if (profilesError) throw profilesError

        const profileMap = {}
        profilesData.forEach((user) => {
          profileMap[user.id] = user.name || ""
        })
        setProfiles(profileMap)

        const { data: walletsData, error: walletsError } = await supabase.from("wallets").select("id, name")

        if (walletsError) throw walletsError

        const walletMap = {}
        walletsData.forEach((wallet) => {
          walletMap[wallet.id] = wallet.name
        })
        setWallets(walletMap)

        const { data: usersData, error: usersError } = await supabase.from("users").select("id, name, email")

        if (usersError) throw usersError

        const userMap = {}
        usersData.forEach((user) => {
          userMap[user.id] = user.name || user.email
        })
        setRefsLoaded(true)
      } catch (error) {
        console.error("Error loading reference data:", error)
        show("Failed to load reference data", "error")
      }
    }

    loadReferenceData()
  }, [])

  useEffect(() => {
    async function loadTransactionData() {
      try {
        setLoading(true)

        let onlyNeedsValidation = false
        let onlyValidated = false

        if (filter === "pending") {
          onlyNeedsValidation = true
        } else if (filter === "validated") {
          onlyValidated = true
        }

        const { transactions: transactionsData, error: txError } = await getRecentTransactions({
          limit: 50,
          onlyNeedsValidation: onlyNeedsValidation,
        })

        if (txError) throw txError

        let filteredData = transactionsData
        if (onlyValidated) {
          filteredData = transactionsData.filter((tx) => tx.validated === true)
        }

        const transformedTransactions = filteredData.map((tx) => {
          const createdAt = new Date(tx.createdat || Date.now())
          const date = createdAt.toLocaleDateString("en-US")
          const time = createdAt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })

          const status = tx.validated ? "validated" : tx.needsvalidation ? "needs-validation" : "needs-validation"

          const amount = Number.parseFloat(tx.amount || 0)
          const exchangeRate = Number.parseFloat(tx.exchange_rate || 0)
          const totalAmount = Number.parseFloat(tx.total_amount || 0)

          const clientName = tx.client_name || "Walk-in Client"

          const cashierName = tx.cashier_id ? profiles[tx.cashier_id] || "Unknown Cashier" : "System"

          const source = tx.source || (tx.type === "buy" ? "Client" : wallets[tx.walletid] || "Wallet")
          const destination = tx.destination || (tx.type === "buy" ? wallets[tx.walletid] || "Wallet" : "Client")

          return {
            id: tx.id,
            type: tx.type || "unknown",
            cashierName: cashierName,
            clientName: clientName,
            source: source,
            destination: destination,
            currency: tx.currency_code || "USD",
            amount: amount.toString(),
            exchangeCurrency: tx.exchange_currency_code || "LYD",
            exchangeRate: exchangeRate.toString(),
            totalAmount: totalAmount.toString(),
            status: status,
            date: date,
            time: time,
            rawData: tx,
          }
        })

        setTransactions(transformedTransactions)
      } catch (error) {
        console.error("Error loading transaction data:", error)
        show("Failed to load transaction data", "error")
      } finally {
        setLoading(false)
      }
    }

    if (refsLoaded) {
      loadTransactionData()
    }
  }, [filter, refsLoaded])

  const handleValidateTransaction = async (transactionId, decision, notes = "") => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error: txError } = await supabase
        .from("transactions")
        .update({
          is_validated: decision === "approve",
          validator_id: user.id,
          validated_at: Date.now(),
          needs_validation: false,
        })
        .eq("id", transactionId)

      if (txError) throw txError

      if (filter === "pending") {
        setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId))
      } else {
        setTransactions((prev) =>
          prev.map((tx) => {
            if (tx.id === transactionId) {
              return {
                ...tx,
                status: decision === "approve" ? "validated" : "rejected",
                validatedById: user.id,
                validatedByName: profiles[user.id] || user.email,
                notes: notes,
              }
            }
            return tx
          }),
        )
      }

      setShowDetailsModal(false)

      show("success", t("executioner.validationSuccess"), t("executioner.transactionProcessed"))
    } catch (error) {
      console.error("Error validating transaction:", error)
      show("error", t("common.errorOccurred"), error.message)
    }
  }

  const handleValidate = (id) => {
    handleValidateTransaction(id, "approve")
  }

  const handleShowDetails = (transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(true)
  }

  const handleCloseModal = () => {
    setShowDetailsModal(false)
    setSelectedTransaction(null)
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      searchTerm === "" ||
      transaction.cashierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.treasurerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.currency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })
  const allSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size === filteredTransactions.length,
    [selectedIds, filteredTransactions.length],
  )

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected transaction(s)? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from("transactions").delete().in("id", Array.from(selectedIds))
      if (error) throw error
      setTransactions((prev) => prev.filter((tx) => !selectedIds.has(tx.id)))
      setSelectedIds(new Set())
      show("Transactions deleted", "success")
    } catch (e) {
      console.error("Delete selected failed:", e)
      show("Failed to delete selected transactions", "error")
    }
  }

  const handleDeleteAll = async () => {
    if (filteredTransactions.length === 0) return
    if (!confirm(`Delete all ${filteredTransactions.length} transaction(s) in view? This cannot be undone.`)) return
    try {
      const ids = filteredTransactions.map((t) => t.id)
      const { error } = await supabase.from("transactions").delete().in("id", ids)
      if (error) throw error
      setTransactions((prev) => prev.filter((tx) => !ids.includes(tx.id)))
      setSelectedIds(new Set())
      show("Transactions deleted", "success")
    } catch (e) {
      console.error("Delete all failed:", e)
      show("Failed to delete transactions", "error")
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader title={t("executioner.title")} subtitle={t("executioner.subtitle")} />
          <CardBody>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-4">{t("executioner.currentExchangeRates")}</h3>

                  {exchangeRates && exchangeRates.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("executioner.currency")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("executioner.toUSD")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("executioner.toLYD")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {t("executioner.lastUpdated")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {exchangeRates.map((rate) => (
                            <tr key={rate.currency_code}>
                              <td className="px-4 py-3 whitespace-nowrap font-medium">{rate.currency_code}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {rate.rate_to_usd ? rate.rate_to_usd.toFixed(6) : "N/A"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {rate.rate_to_lyd ? rate.rate_to_lyd.toFixed(6) : "N/A"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {rate.updated_at ? new Date(rate.updated_at).toLocaleDateString() : "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">{t("executioner.noExchangeRates")}</div>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("executioner.transactions")} />
          <CardBody>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <div className="w-full md:w-1/3">
                    <Input
                      type="text"
                      placeholder={t("executioner.searchTransactions")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t("executioner.filter")}:</span>
                    <select
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value)
                        setSearchTerm("")
                      }}
                      className="border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      <option value="all">All</option>
                      <option value="pending">{t("executioner.pending")}</option>
                      <option value="validated">{t("executioner.validated")}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" onClick={handleDeleteSelected} disabled={selectedIds.size === 0}>
                      Delete selected
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAll} disabled={filteredTransactions.length === 0}>
                      Delete all in view
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3">
                          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cashier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Treasurer/Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source / Destination
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("executioner.amount")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("executioner.date")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("executioner.status")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("executioner.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(transaction.id)}
                                onChange={() => toggleSelectOne(transaction.id)}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  transaction.type === "custody"
                                    ? "bg-purple-100 text-purple-800"
                                    : transaction.type === "buy"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {transaction.type === "custody"
                                  ? "Cash Custody"
                                  : transaction.type === "buy"
                                    ? t("executioner.buy")
                                    : t("executioner.sell")}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{transaction.cashierName}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {transaction.type === "custody"
                                ? transaction.treasurerName
                                : transaction.clientName || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span>
                                  {t("executioner.source")}: {transaction.source}
                                </span>
                                <span>
                                  {t("executioner.destination")}: {transaction.destination}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span>
                                  {transaction.amount} {transaction.currency}
                                </span>
                                {transaction.type !== "custody" && transaction.totalAmount && (
                                  <span className="text-xs text-gray-500">
                                    {transaction.totalAmount} {transaction.exchangeCurrency}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span>{transaction.date}</span>
                                <span className="text-xs text-gray-500">{transaction.time}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  transaction.status === "needs-validation"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {transaction.status === "needs-validation"
                                  ? t("executioner.needsValidation")
                                  : t("executioner.validated")}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleShowDetails(transaction)}>
                                  {t("executioner.details")}
                                </Button>
                                {transaction.status === "needs-validation" && (
                                  <Button variant="primary" size="sm" onClick={() => handleValidate(transaction.id)}>
                                    {t("executioner.validate")}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                            {t("executioner.noTransactions")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {t("executioner.details")} -{" "}
                {selectedTransaction.type === "buy"
                  ? t("executioner.buy")
                  : selectedTransaction.type === "sell"
                    ? t("executioner.sell")
                    : "Transaction"}{" "}
                #{selectedTransaction.id.substring(0, 8)}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("executioner.transactionType")}</h4>
                    <p className="text-base">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedTransaction.type === "custody"
                            ? "bg-purple-100 text-purple-800"
                            : selectedTransaction.type === "buy"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {selectedTransaction.type === "custody"
                          ? "Cash Custody"
                          : selectedTransaction.type === "buy"
                            ? t("executioner.buy")
                            : t("executioner.sell")}
                      </span>
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("executioner.cashierName")}</h4>
                    <p className="text-base">{selectedTransaction.cashierName}</p>
                  </div>

                  {selectedTransaction.type === "custody" ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Treasurer</h4>
                      <p className="text-base">{selectedTransaction.treasurerName}</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">{t("executioner.clientName")}</h4>
                      <p className="text-base">{selectedTransaction.clientName}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("executioner.date")}</h4>
                    <p className="text-base">
                      {selectedTransaction.date} {selectedTransaction.time}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("executioner.source")}</h4>
                    <p className="text-base">{selectedTransaction.source}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("executioner.destination")}</h4>
                    <p className="text-base">{selectedTransaction.destination}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">{t("executioner.status")}</h4>
                    <p className="text-base">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedTransaction.status === "needs-validation"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedTransaction.status === "needs-validation"
                          ? t("executioner.needsValidation")
                          : t("executioner.validated")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="text-md font-medium mb-3">{t("cashier.transactionSummary")}</h4>

                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {selectedTransaction.type === "buy" || selectedTransaction.type === "sell" ? (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">
                          {selectedTransaction.type === "buy"
                            ? `${selectedTransaction.currency} Amount (Received)`
                            : `${selectedTransaction.currency} Amount (Sold)`}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.amount} {selectedTransaction.currency}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">Exchange Rate</div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.exchangeRate} {selectedTransaction.exchangeCurrency}/
                          {selectedTransaction.currency}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">
                          {selectedTransaction.type === "buy"
                            ? `${selectedTransaction.exchangeCurrency} Amount (Given)`
                            : `${selectedTransaction.exchangeCurrency} Amount (Received)`}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.totalAmount} {selectedTransaction.exchangeCurrency}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">
                          {selectedTransaction.type === "buy"
                            ? t("cashier.amountReceiving")
                            : t("cashier.amountSelling")}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.amount} {selectedTransaction.currency}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm text-gray-500">{t("cashier.exchangeRate")}</div>
                        <div className="text-sm font-medium text-right">
                          {selectedTransaction.exchangeRate} {selectedTransaction.exchangeCurrency}/
                          {selectedTransaction.currency}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-2 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-700">{t("cashier.totalAmount")}</div>
                        <div className="text-sm font-bold text-right">
                          {selectedTransaction.totalAmount} {selectedTransaction.exchangeCurrency}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={handleCloseModal}>
                {t("common.cancel")}
              </Button>
              {selectedTransaction.status === "needs-validation" && (
                <Button
                  variant="primary"
                  className="ml-3"
                  onClick={() => {
                    handleValidate(selectedTransaction.id)
                    handleCloseModal()
                  }}
                >
                  {t("executioner.validate")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
