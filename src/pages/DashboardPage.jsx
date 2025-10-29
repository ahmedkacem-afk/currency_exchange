"use client"

import { useEffect, useMemo, useState } from "react"
import { useI18n } from "../i18n/I18nProvider.jsx"
import {
  getSummary,
  getAllStats,
  getWalletStats,
  getPrices,
  setPrices,
  getWallets,
  getUserCustodyRecords,
} from "../lib/api.js"
import {
  getWalletCurrencyPairsAnalysis,
  getCustodyCurrencyPairsAnalysis,
  getOverallCurrencyPairsAnalysis,
} from "../lib/transactionAnalysis.js"
import { useNavigate } from "react-router-dom"
import { Card, CardHeader, CardBody } from "../components/Card.jsx"
import Button from "../components/Button.jsx"
import Input from "../components/Input.jsx"
import { UsdIcon, LydIcon } from "../components/Icons.jsx"
import { useToast } from "../components/Toast.jsx"
import AddCurrencyModal from "../components/AddCurrencyModal.jsx"
import AddCurrencyButton from "../components/AddCurrencyButton.jsx"
import SaveButton from "../components/SaveButton.jsx"
import CurrencyPairsTable from "../components/CurrencyPairsTable.jsx"
import OverallMedianRatesTable from "../components/OverallMedianRatesTable.jsx"
import { useAuth } from "../lib/AuthContext"

function StatCard({ title, value, onClick }) {
  return (
    <div
      className={`bg-white p-4 rounded shadow ${onClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
      onClick={onClick}
    >
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
        <div>
          <div className="text-gray-600">{t("dashboard.lowest")}</div>
          <div className="font-semibold">{dataset?.min ?? "-"}</div>
        </div>
        <div>
          <div className="text-gray-600">{t("dashboard.median")}</div>
          <div className="font-semibold">{dataset?.median ?? "-"}</div>
        </div>
        <div>
          <div className="text-gray-600">{t("dashboard.highest")}</div>
          <div className="font-semibold">{dataset?.max ?? "-"}</div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { userRole } = useAuth() // Get user role from auth context
  const { showToast } = useToast()

  useEffect(() => {
    if (userRole && userRole !== "manager") {
      navigate("/cashier", { replace: true })
    }
  }, [userRole, navigate])

  const [summary, setSummary] = useState(null)
  const [wallets, setWallets] = useState([])
  const [treasuryWallets, setTreasuryWallets] = useState([])
  const [custodyRecords, setCustodyRecords] = useState([])
  const [selected, setSelected] = useState("")
  const [statsAll, setStatsAll] = useState(null)
  const [statsWallet, setStatsWallet] = useState(null)
  const [prices, setPricesState] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false)

  // Currency pairs analysis state
  const [walletCurrencyAnalysis, setWalletCurrencyAnalysis] = useState(null)
  const [overallCurrencyAnalysis, setOverallCurrencyAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const { show } = useToast()

  const setSelectedWallet = (walletId) => {
    setSelected(walletId)
  }

  useEffect(() => {
    setLoading(true)

    // Load all data in parallel
    Promise.all([
      // Get summary data
      getSummary().catch((error) => {
        console.error("Error loading summary:", error)
        return null
      }),

      // Get wallets directly from Supabase
      getWallets().catch((error) => {
        console.error("Error loading wallets:", error)
        return { wallets: [] }
      }),

      getUserCustodyRecords().catch((error) => {
        console.error("Error loading custody records:", error)
        return []
      }),

      // Get stats
      getAllStats().catch((error) => {
        console.error("Error loading stats:", error)
        return null
      }),

      // Get prices
      getPrices().catch((error) => {
        console.error("Error loading prices:", error)
        return null
      }),
    ])
      .then(([s, ws, custody, sa, p]) => {
        console.log("DashboardPage - All data loaded:", {
          summary: s,
          wallets: ws,
          custody: custody,
          stats: sa,
          prices: p,
        })

        // Add detailed logging for wallets structure
        if (ws && ws.wallets) {
          console.log("Wallets structure check:", {
            count: ws.wallets.length,
            firstWallet: ws.wallets[0]
              ? {
                  id: ws.wallets[0].id,
                  name: ws.wallets[0].name,
                  hasIsTreasury: "isTreasury" in ws.wallets[0],
                  isTreasury: ws.wallets[0].isTreasury,
                  actualIsTreasury: ws.wallets[0].is_treasury,
                }
              : "No wallets found",
            allProps: ws.wallets[0] ? Object.keys(ws.wallets[0]) : [],
          })
        }

        // Set summary data
        setSummary(s)

        // Extract wallets from the response
        if (ws && ws.wallets && Array.isArray(ws.wallets)) {
          console.log("DashboardPage - Setting wallets:", ws.wallets)

          // For now, don't separate wallets since we don't have the is_treasury column
          // Just use all wallets as regular wallets
          setWallets(ws.wallets)
          setTreasuryWallets([]) // No treasury wallets for now
        } else {
          console.error("DashboardPage - No wallets found in response:", ws)
          setWallets([])
          setTreasuryWallets([])
        }

        if (custody && Array.isArray(custody)) {
          console.log("DashboardPage - Processing custody records:", custody)
          setCustodyRecords(custody)
        } else {
          console.log("DashboardPage - No custody records found")
          setCustodyRecords([])
        }

        // Set other data
        setStatsAll(sa)
        setPricesState(p)
      })
      .catch((err) => {
        console.error("DashboardPage - Error loading dashboard data:", err)
        show("Error loading dashboard data", "error")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selected) {
      // Check if it's a wallet or custody record
      const isWallet = wallets.some((w) => w.id === selected) || treasuryWallets.some((w) => w.id === selected)
      const isCustody = custodyRecords.some((c) => c.id === selected)

      if (isWallet) {
        getWalletStats(selected).then(setStatsWallet)
        // Load currency pairs analysis for selected wallet
        loadWalletCurrencyAnalysis(selected)
      } else if (isCustody) {
        setStatsWallet(null) // No wallet stats for custody
        // Load currency pairs analysis for selected custody
        loadCustodyCurrencyAnalysis(selected)
      }
    } else {
      setStatsWallet(null)
      setWalletCurrencyAnalysis(null)
    }
  }, [selected, wallets, treasuryWallets, custodyRecords])

  // Load overall currency analysis on mount
  useEffect(() => {
    loadOverallCurrencyAnalysis()
  }, [])

  // Function to load currency pairs analysis for a specific wallet
  const loadWalletCurrencyAnalysis = async (walletId) => {
    try {
      setAnalysisLoading(true)
      const analysis = await getWalletCurrencyPairsAnalysis(walletId)
      setWalletCurrencyAnalysis(analysis)
    } catch (error) {
      console.error("Error loading wallet currency analysis:", error)
      setWalletCurrencyAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Function to load currency pairs analysis for a specific custody record
  const loadCustodyCurrencyAnalysis = async (custodyId) => {
    try {
      setAnalysisLoading(true)
      const analysis = await getCustodyCurrencyPairsAnalysis(custodyId)
      setWalletCurrencyAnalysis(analysis) // Reuse the same state for consistency
    } catch (error) {
      console.error("Error loading custody currency analysis:", error)
      setWalletCurrencyAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Function to load overall currency pairs analysis
  const loadOverallCurrencyAnalysis = async () => {
    try {
      const analysis = await getOverallCurrencyPairsAnalysis()
      setOverallCurrencyAnalysis(analysis)
    } catch (error) {
      console.error("Error loading overall currency analysis:", error)
      setOverallCurrencyAnalysis(null)
    }
  }

  const selectedWallet = useMemo(() => {
    // Find the wallet in either regular wallets or treasury wallets
    const wallet = [...wallets, ...treasuryWallets].find((w) => w.id === selected)
    console.log("Selected wallet:", wallet)
    return wallet
  }, [wallets, treasuryWallets, selected])

  const selectedCustody = useMemo(() => {
    // Find the custody record if selected
    const custody = custodyRecords.find((c) => c.id === selected)
    console.log("Selected custody:", custody)
    return custody
  }, [custodyRecords, selected])

  async function onSavePrices(e) {
    e.preventDefault()
    try {
      setSaving(true)
      console.log("Saving prices:", {
        sellold: Number(prices.sellold),
        sellnew: Number(prices.sellnew),
        buyold: Number(prices.buyold),
        buynew: Number(prices.buynew),
        sellDisabled: Boolean(prices.sellDisabled),
        buyDisabled: Boolean(prices.buyDisabled),
      })

      const updated = await setPrices({
        sellold: Number(prices.sellold),
        sellnew: Number(prices.sellnew),
        buyold: Number(prices.buyold),
        buynew: Number(prices.buynew),
        sellDisabled: Boolean(prices.sellDisabled),
        buyDisabled: Boolean(prices.buyDisabled),
      })

      console.log("Prices updated response:", updated)
      setPricesState(updated)
      show("Prices saved successfully", "success")
    } catch (error) {
      console.error("Error saving prices:", error)
      show("Error saving prices: " + (error.message || "Unknown error"), "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Debt summary cards - if available */}
      {summary?.debtSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          {/* Debts I owe */}
          <Card>
            <CardHeader title={summary.debtSummary.countOwed || "0"} subtitle={t("debtManagement.debtsOwed")} />
            <CardBody className="p-0">
              <div
                className="bg-gradient-to-r from-red-50 to-red-100 p-3 cursor-pointer hover:bg-red-100 rounded-b-xl"
                onClick={() => navigate("/debt-management")}
              >
                {Object.entries(summary.debtSummary.totalOwed || {}).map(([code, amount]) => (
                  <div key={code} className="flex justify-between text-sm">
                    <span className="text-red-700">{code}:</span>
                    <span className="font-medium text-red-800">{Number(amount).toFixed(2)}</span>
                  </div>
                ))}
                {Object.keys(summary.debtSummary.totalOwed || {}).length === 0 && (
                  <div className="text-sm text-gray-500 text-center">{t("debtManagement.noDebts")}</div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Debts others owe me */}
          <Card>
            <CardHeader
              title={summary.debtSummary.countReceivable || "0"}
              subtitle={t("debtManagement.debtsOwedToMe")}
            />
            <CardBody className="p-0">
              <div
                className="bg-gradient-to-r from-green-50 to-green-100 p-3 cursor-pointer hover:bg-green-100 rounded-b-xl"
                onClick={() => navigate("/debt-management")}
              >
                {Object.entries(summary.debtSummary.totalReceivable || {}).map(([code, amount]) => (
                  <div key={code} className="flex justify-between text-sm">
                    <span className="text-green-700">{code}:</span>
                    <span className="font-medium text-green-800">{Number(amount).toFixed(2)}</span>
                  </div>
                ))}
                {Object.keys(summary.debtSummary.totalReceivable || {}).length === 0 && (
                  <div className="text-sm text-gray-500 text-center">{t("debtManagement.noDebts")}</div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Treasury Wallets */}
      {treasuryWallets.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
            {t("dashboard.treasuryWallets", "Treasury Wallets")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {treasuryWallets.map((wallet) => (
              <Card key={wallet.id} onClick={() => setSelectedWallet(wallet.id)}>
                <CardHeader title={wallet.name} subtitle={t("dashboard.treasuryWallet", "Treasury")} />
                <CardBody>
                  {Object.entries(wallet.currencies || {}).map(([code, balance]) => (
                    <div
                      key={code}
                      className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-gray-600">{code}:</span>
                      <span className="font-medium">{Number(balance).toFixed(2)}</span>
                    </div>
                  ))}
                  {Object.keys(wallet.currencies || {}).length === 0 && (
                    <div className="text-center text-gray-500 py-2">{t("dashboard.noFunds", "No funds")}</div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Custody Summary */}
      {custodyRecords.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
            {t("dashboard.custodySummary", "Cash Custody Summary")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Active Custody Count */}
            <Card>
              <CardHeader title={custodyRecords.length} subtitle={t("dashboard.activeCustodies", "Active Custodies")} />
              <CardBody className="bg-indigo-50 rounded-b-xl h-2"></CardBody>
            </Card>

            {/* Custody by Currency */}
            {(() => {
              const custodyByCurrency = custodyRecords.reduce((acc, record) => {
                const { currencyCode, amount } = record
                if (!currencyCode || !amount) return acc

                if (!acc[currencyCode]) acc[currencyCode] = 0
                acc[currencyCode] += Number(amount)
                return acc
              }, {})

              // Return cards for each currency
              return Object.entries(custodyByCurrency).map(([currency, total]) => (
                <Card key={`custody-${currency}`}>
                  <CardHeader title={Intl.NumberFormat().format(total)} subtitle={`${currency} in Custody`} />
                  <CardBody className="bg-indigo-50 rounded-b-xl h-2"></CardBody>
                </Card>
              ))
            })()}
          </div>
        </>
      )}

      {/* Summary Totals */}
      <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
        {t("dashboard.summaryTotals", "Summary Totals")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Legacy USD card */}
        <Card>
          <CardHeader
            icon={<UsdIcon />}
            title={Intl.NumberFormat().format(summary?.totalUsd ?? 0)}
            subtitle={t("dashboard.totalUsd")}
          />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>

        {/* Legacy LYD card */}
        <Card>
          <CardHeader
            icon={<LydIcon />}
            title={Intl.NumberFormat().format(summary?.totalLyd ?? 0)}
            subtitle={t("dashboard.totalLyd")}
          />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>

        {/* Number of wallets */}
        <Card>
          <CardHeader title={summary?.count ?? "-"} subtitle={t("dashboard.numWallets")} />
          <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
        </Card>

        {/* Dynamic currency totals */}
        {summary?.currencyTotals &&
          Object.entries(summary.currencyTotals)
            // Filter out USD and LYD since they're already displayed above
            .filter(([code]) => code !== "USD" && code !== "LYD")
            .map(([code, total]) => (
              <Card key={code}>
                <CardHeader title={Intl.NumberFormat().format(total)} subtitle={`Total ${code}`} />
                <CardBody className="cash-accent rounded-b-xl h-2"></CardBody>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader title={t("dashboard.walletBalances")} subtitle={t("dashboard.selectWallet")} />
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              className="border rounded-md px-3 py-2 flex-grow"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">--</option>
              <optgroup label="Wallets">
                {wallets
                  .filter((w, index, self) => index === self.findIndex((wallet) => wallet.id === w.id))
                  .map((w) => (
                    <option key={`wallet-${w.id}`} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </optgroup>
              {custodyRecords.length > 0 && (
                <optgroup label="Custody Records">
                  {custodyRecords
                    .filter((c, index, self) => index === self.findIndex((custody) => custody.id === c.id))
                    .map((c) => (
                      <option key={`custody-${c.id}`} value={c.id}>
                        {c.name || `Custody_${c.currencyCode}`} ({c.amount} {c.currencyCode})
                      </option>
                    ))}
                </optgroup>
              )}
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

          {(selectedWallet || selectedCustody) && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Show wallet information if a wallet is selected */}
                {selectedWallet && (
                  <>
                    {/* Show legacy USD and LYD if present */}
                    {selectedWallet.usd !== undefined && (
                      <Card>
                        <CardHeader
                          icon={<UsdIcon />}
                          title={Intl.NumberFormat().format(selectedWallet.usd)}
                          subtitle={t("dashboard.usd")}
                        />
                      </Card>
                    )}

                    {selectedWallet.lyd !== undefined && (
                      <Card>
                        <CardHeader
                          icon={<LydIcon />}
                          title={Intl.NumberFormat().format(selectedWallet.lyd)}
                          subtitle={t("dashboard.lyd")}
                        />
                      </Card>
                    )}

                    {/* Show all other currencies from the currencies object */}
                    {selectedWallet.currencies &&
                      Object.entries(selectedWallet.currencies)
                        // Filter out USD/LYD if they're already shown from legacy fields
                        .filter(
                          ([code]) =>
                            (code !== "USD" || selectedWallet.usd === undefined) &&
                            (code !== "LYD" || selectedWallet.lyd === undefined),
                        )
                        .map(([code, balance]) => (
                          <Card key={code}>
                            <CardHeader title={Intl.NumberFormat().format(balance)} subtitle={code} />
                          </Card>
                        ))}
                  </>
                )}

                {/* Show custody information if a custody record is selected */}
                {selectedCustody && (
                  <Card>
                    <CardHeader
                      title={Intl.NumberFormat().format(selectedCustody.amount)}
                      subtitle={`${selectedCustody.currencyCode} in Custody`}
                    />
                    <CardBody className="bg-indigo-50 rounded-b-xl h-2">
                      <div className="text-xs text-gray-600 mt-2">
                        <div>Name: {selectedCustody.name || `Custody_${selectedCustody.currencyCode}`}</div>
                        <div>Updated: {new Date(selectedCustody.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>

              {/* Show Custody Information if available */}
              {selectedWallet &&
                selectedWallet.custodyBalances &&
                Object.keys(selectedWallet.custodyBalances).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">
                      {t("dashboard.cashInCustody", "Cash In Custody")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(selectedWallet.custodyBalances).map(([code, amount]) => (
                        <Card key={`custody-${code}`}>
                          <CardHeader title={Intl.NumberFormat().format(amount)} subtitle={`${code} in Custody`} />
                          <CardBody className="bg-indigo-50 rounded-b-xl h-2"></CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

              {/* Show Total (Wallet + Custody) if custody exists */}
              {selectedWallet && selectedWallet.totalWithCustody && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">
                    {t("dashboard.totalWithCustody", "Total (Wallet + Custody)")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(selectedWallet.totalWithCustody).map(([code, total]) => (
                      <Card key={`total-${code}`}>
                        <CardHeader title={Intl.NumberFormat().format(total)} subtitle={`Total ${code}`} />
                        <CardBody className="bg-green-100 rounded-b-xl h-2"></CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {loading && <div className="text-sm text-gray-500">Loading...</div>}

      {/* Currency Pairs Analysis Section */}

      {/* Wallet/Custody-specific exchange rate analysis - Only when wallet or custody is selected */}
      {selected &&
        (selectedWallet || selectedCustody) &&
        walletCurrencyAnalysis?.currencyPairs &&
        Object.keys(walletCurrencyAnalysis.currencyPairs).length > 0 && (
          <CurrencyPairsTable
            currencyPairs={walletCurrencyAnalysis.currencyPairs}
            title={`Exchange Rate Analysis - ${selectedWallet ? selectedWallet.name : selectedCustody ? selectedCustody.name || `${selectedCustody.cashier_name || "Cashier"}_${selectedCustody.currencyCode}` : "Unknown"}`}
            showTransactionCount={true}
            showAmountInfo={false}
          />
        )}

      {/* Overall Exchange Rates - Always visible */}
      {overallCurrencyAnalysis?.currencyPairs && Object.keys(overallCurrencyAnalysis.currencyPairs).length > 0 ? (
        <OverallMedianRatesTable currencyPairs={overallCurrencyAnalysis.currencyPairs} />
      ) : (
        <Card>
          <CardHeader title={t("currencyPairs.overallExchangeRates", "Overall Exchange Rates")} />
          <CardBody>
            <div className="text-center text-gray-500 py-8">
              {t("currencyPairs.noData", "No exchange transaction data available")}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title={t("dashboard.managerPrices")} />
        <CardBody>
          <form onSubmit={onSavePrices} className="space-y-4">
            {/* Selling Section */}
            <div className="border p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Selling Prices</h3>
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-600">{prices?.sellDisabled ? "Disabled" : "Enabled"}</span>
                  <Button
                    type="button"
                    variant={prices?.sellDisabled ? "success" : "danger"}
                    size="sm"
                    onClick={() =>
                      setPricesState((p) => ({
                        ...p,
                        sellDisabled: !p?.sellDisabled,
                      }))
                    }
                  >
                    {prices?.sellDisabled ? "Enable" : "Disable"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t("dashboard.sellold")}
                  value={prices?.sellold ?? ""}
                  onChange={(e) => setPricesState((p) => ({ ...p, sellold: e.target.value }))}
                  disabled={prices?.sellDisabled}
                />
                <Input
                  label={t("dashboard.sellnew")}
                  value={prices?.sellnew ?? ""}
                  onChange={(e) => setPricesState((p) => ({ ...p, sellnew: e.target.value }))}
                  disabled={prices?.sellDisabled}
                />
              </div>
            </div>

            {/* Buying Section */}
            <div className="border p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Buying Prices</h3>
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-600">{prices?.buyDisabled ? "Disabled" : "Enabled"}</span>
                  <Button
                    type="button"
                    variant={prices?.buyDisabled ? "success" : "danger"}
                    size="sm"
                    onClick={() =>
                      setPricesState((p) => ({
                        ...p,
                        buyDisabled: !p?.buyDisabled,
                      }))
                    }
                  >
                    {prices?.buyDisabled ? "Enable" : "Disable"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t("dashboard.buyold")}
                  value={prices?.buyold ?? ""}
                  onChange={(e) => setPricesState((p) => ({ ...p, buyold: e.target.value }))}
                  disabled={prices?.buyDisabled}
                />
                <Input
                  label={t("dashboard.buynew")}
                  value={prices?.buynew ?? ""}
                  onChange={(e) => setPricesState((p) => ({ ...p, buynew: e.target.value }))}
                  disabled={prices?.buyDisabled}
                />
              </div>
            </div>

            <SaveButton disabled={saving} type="submit" variant="success">
              {saving ? "..." : t("dashboard.save")}
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
              const [s, ws, custody] = await Promise.all([getSummary(), getWallets(), getUserCustodyRecords()])

              setSummary(s)

              // Process wallets
              if (ws && ws.wallets) {
                // Separate treasury wallets
                const treasuryWalletsList = ws.wallets.filter((w) => w.isTreasury)
                const normalWallets = ws.wallets.filter((w) => !w.isTreasury)

                setTreasuryWallets(treasuryWalletsList)
                setWallets(normalWallets)
              }

              if (custody && Array.isArray(custody)) {
                setCustodyRecords(custody)
              }
            } catch (err) {
              console.error("Error refreshing data:", err)
              show("Error refreshing data", "error")
            }
          }
          refreshData()
        }}
        wallet={selectedWallet}
      />
    </div>
  )
}
