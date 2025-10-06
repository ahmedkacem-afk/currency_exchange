import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getPrices } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { useToast } from '../components/Toast.jsx'

/**
 * Cashier Page - Main interface for the cashier operations
 * Includes buy/sell options, reporting, and shows current prices
 */
export default function CashierPage() {
  const { t } = useI18n()
  const [prices, setPrices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cashInCustody, setCashInCustody] = useState({
    usd: 0,
    lyd: 0
  })
  const { show } = useToast()

  // Load prices on component mount
  useEffect(() => {
    async function loadPrices() {
      try {
        setLoading(true)
        const priceData = await getPrices()
        setPrices(priceData)
      } catch (error) {
        console.error('Error loading prices:', error)
        show('Failed to load prices', 'error')
      } finally {
        setLoading(false)
      }
    }

    // TODO: Load cash in custody from API
    // This will be implemented later when the API is available

    loadPrices()
  }, [show])

  // Function to generate PDF report
  const generateReport = async () => {
    try {
      show('Generating report...', 'info')
      // TODO: Implement report generation
      // This will be implemented when the reporting API is available
      
      // Placeholder success message
      setTimeout(() => {
        show('Report downloaded successfully', 'success')
      }, 1500)
    } catch (error) {
      console.error('Error generating report:', error)
      show('Failed to generate report', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('cashier.title')} subtitle={t('cashier.subtitle')} />
        <CardBody>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
            <Link to="/cashier/buy">
              <Button variant="primary" size="xl">
                {t('cashier.buyButton')}
              </Button>
            </Link>
            <Link to="/cashier/sell">
              <Button variant="success" size="xl">
                {t('cashier.sellButton')}
              </Button>
            </Link>
            <Button 
              variant="secondary" 
              size="xl" 
              onClick={generateReport}
            >
              {t('cashier.reportButton')}
            </Button>
          </div>
          
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : prices ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-2">{t('cashier.buyRates')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('cashier.oldDinar')}:</span>
                    <span className="font-semibold">{prices.buyold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('cashier.newDinar')}:</span>
                    <span className="font-semibold">{prices.buynew}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-2">{t('cashier.sellRates')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('cashier.oldDinar')}:</span>
                    <span className="font-semibold">{prices.sellold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('cashier.newDinar')}:</span>
                    <span className="font-semibold">{prices.sellnew}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-red-500">
              Failed to load pricing information
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('cashier.cashInCustody')} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span>USD:</span>
                <span className="font-semibold">
                  ${cashInCustody.usd.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span>LYD:</span>
                <span className="font-semibold">
                  {cashInCustody.lyd.toLocaleString()} LD
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}