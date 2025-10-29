"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { useI18n } from "../i18n/I18nProvider.jsx"
import { Card, CardHeader, CardBody } from "../components/Card.jsx"
import Button from "../components/Button.jsx"
import { useToast } from "../components/Toast.jsx"
import ExchangeRatesDisplay from "../components/ExchangeRatesDisplay.jsx"

/**
 * Cashier Page - Main interface for the cashier operations
 * Includes buy/sell options, reporting, and shows current exchange rates
 */
export default function CashierPage() {
  const { t } = useI18n()
  const [cashInCustody, setCashInCustody] = useState({
    usd: 0,
    lyd: 0,
  })
  const { show } = useToast()

  // Function to generate PDF report
  const generateReport = async () => {
    try {
      show("Generating report...", "info")
      // TODO: Implement report generation
      // This will be implemented when the reporting API is available

      // Placeholder success message
      setTimeout(() => {
        show("Report downloaded successfully", "success")
      }, 1500)
    } catch (error) {
      console.error("Error generating report:", error)
      show("Failed to generate report", "error")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("cashier.title")} subtitle={t("cashier.subtitle")} />
        <CardBody>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
            <Link to="/cashier/buy">
              <Button variant="primary" size="xl">
                {t("cashier.buyButton")}
              </Button>
            </Link>
            <Link to="/cashier/sell">
              <Button variant="success" size="xl">
                {t("cashier.sellButton")}
              </Button>
            </Link>
            <Button variant="secondary" size="xl" onClick={generateReport}>
              {t("cashier.reportButton")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Exchange Rates Display */}
      <ExchangeRatesDisplay />

      <Card>
        <CardHeader title={t("cashier.cashInCustody")} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span>USD:</span>
                <span className="font-semibold">${cashInCustody.usd.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span>LYD:</span>
                <span className="font-semibold">{cashInCustody.lyd.toLocaleString()} LD</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
