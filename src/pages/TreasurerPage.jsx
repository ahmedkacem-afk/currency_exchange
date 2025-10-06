import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { getWallets, getCashiers, giveCashCustody, getCashCustody, getAllCurrencyTypes, getAllCashCustody } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { useToast } from '../components/Toast.jsx'
import { Link } from 'react-router-dom'
import CustodyRequestForm from '../components/CustodyRequestForm.jsx'
import CustodyRecordsList from '../components/CustodyRecordsList.jsx'

/**
 * Treasurer Page
 * Interface for managing cash custody between treasurer and cashiers
 */
export default function TreasurerPage() {
  const { t } = useI18n()
  const [wallets, setWallets] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [currencyTypes, setCurrencyTypes] = useState([])
  const [custodyRecords, setCustodyRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { show } = useToast()
  
  // Load initial data
  useEffect(() => {
    loadData()
  }, [])
  
  // Function to load all required data
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load wallets, cashiers, currency types, and custody records in parallel
      const [walletsData, cashiersData, currencyTypesData, custodyData] = await Promise.all([
        getWallets(),
        getCashiers(),
        getAllCurrencyTypes(),
        getAllCashCustody()
      ])
      
      if (walletsData && Array.isArray(walletsData.wallets)) {
        setWallets(walletsData.wallets)
      } else {
        console.error('Invalid wallets data:', walletsData)
        setWallets([])
        show('Error loading wallets', 'error')
      }
      
      if (cashiersData && Array.isArray(cashiersData)) {
        setCashiers(cashiersData)
      } else {
        console.error('Invalid cashiers data:', cashiersData)
        setCashiers([])
        show('Error loading cashiers', 'error')
      }
      
      if (currencyTypesData && Array.isArray(currencyTypesData)) {
        setCurrencyTypes(currencyTypesData)
      } else {
        console.error('Invalid currency types data:', currencyTypesData)
        setCurrencyTypes([])
        show('Error loading currency types', 'error')
      }
      
      if (custodyData) {
        // Create a Map to store unique records by ID and avoid duplicates
        const recordMap = new Map();
        
        // Add given records
        (custodyData.given || []).forEach(record => {
          recordMap.set(record.id, record);
        });
        
        // Add received records (will overwrite if duplicate IDs exist)
        (custodyData.received || []).forEach(record => {
          recordMap.set(record.id, record);
        });
        
        // Convert Map back to array and sort by date
        const allRecords = Array.from(recordMap.values())
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        setCustodyRecords(allRecords);
      } else {
        console.error('Invalid custody data:', custodyData);
        setCustodyRecords([]);
      }
    } catch (error) {
      console.error('Error loading data:', error)
      show(t('common.failedToLoadData', 'Failed to load data'), 'error')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle form submission for custody requests
  const handleCustodySubmit = async (formData) => {
    try {
      setSubmitting(true)
      
      if (formData.mode === 'give') {
        // Give custody to cashier
        await giveCashCustody({
          cashierId: formData.cashierId,
          walletId: formData.walletId,
          currencyCode: formData.currencyCode,
          amount: formData.amount,
          notes: formData.notes,
          requireApproval: false // Treasurer doesn't need approval
        })
        
        show(t('treasurer.successGive', 'Cash custody given successfully'), 'success')
      } else {
        // Get custody back from cashier
        await getCashCustody({
          cashierId: formData.cashierId,
          walletId: formData.walletId,
          currencyCode: formData.currencyCode,
          amount: formData.amount,
          notes: formData.notes
        })
        
        show(t('treasurer.successGet', 'Cash custody returned successfully'), 'success')
      }
      
      // Refresh data after successful operation
      loadData()
    } catch (error) {
      console.error('Error submitting custody request:', error)
      
      // Show a more specific error message for insufficient funds
      if (error.message && error.message.includes('Insufficient balance')) {
        show(t('treasurer.insufficientFunds', 'Insufficient funds available'), 'error')
      } else {
        show(error.message || t('common.failed', 'Failed to process custody request'), 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader 
          title={t('treasurer.title', 'Treasury Management')} 
          subtitle={t('treasurer.subtitle', 'Manage cash custody between treasurer and cashiers')}
          actions={
            <Link to="/">
              <Button variant="outline">{t('common.back', 'Back')}</Button>
            </Link>
          }
        />
        <CardBody>
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mb-2"></div>
              <p>{t('common.loading', 'Loading...')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Custody Request Form */}
              <CustodyRequestForm 
                wallets={wallets}
                cashiers={cashiers}
                currencyTypes={currencyTypes}
                onSubmit={handleCustodySubmit}
                isSubmitting={submitting}
              />
              
              {/* Custody Records List */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {t('treasurer.custodyHistory', 'Custody History')}
                </h2>
                <CustodyRecordsList records={custodyRecords} />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}