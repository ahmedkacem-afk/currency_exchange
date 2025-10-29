import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import CurrencySelect from '../components/CurrencySelect';
import { getWallets } from '../lib/api';
import { addFundsToWallet } from '../lib/wallet_management';

/**
 * WalletManagementPage Component
 * 
 * Allows manager to add funds to wallets with auto-validated transactions
 */
export default function WalletManagementPage() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [custodies, setCustodies] = useState([]);
  const [selectedCustody, setSelectedCustody] = useState('');
  const [custodyAnalysis, setCustodyAnalysis] = useState(null);
  const { t } = useI18n();
  const { show } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadWallets();
    loadCustodies();
  }, []);

  useEffect(() => {
    if (selectedCustody) {
      fetchCustodyAnalysis(selectedCustody);
    } else {
      setCustodyAnalysis(null);
    }
  }, [selectedCustody]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const response = await getWallets();
      if (response && response.wallets) {
        setWallets(response.wallets);
      } else {
        throw new Error('Failed to load wallets data');
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      show({
        type: 'error',
        title: t('walletManagement.errorLoadingWallets'),
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Load custodies for selection
  const loadCustodies = async () => {
    try {
      const { getAllCashCustody } = await import('../lib/api');
      const records = await getAllCashCustody();
      // Flatten given/received arrays if needed
      let allCustodies = [];
      if (records) {
        if (Array.isArray(records)) {
          allCustodies = records;
        } else {
          allCustodies = [...(records.given || []), ...(records.received || [])];
        }
      }
      setCustodies(allCustodies);
    } catch (error) {
      console.error('Error loading custodies:', error);
    }
  };

  // Fetch currency pairs analysis for selected custody
  const fetchCustodyAnalysis = async (custodyId) => {
    try {
      const { getCustodyCurrencyPairsAnalysis } = await import('../lib/custodyAnalysis');
      const analysis = await getCustodyCurrencyPairsAnalysis(custodyId);
      setCustodyAnalysis(analysis);
    } catch (error) {
      console.error('Error fetching custody analysis:', error);
      setCustodyAnalysis(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedWallet || !amount || !currency || parseFloat(amount) <= 0) {
      show({
        type: 'error',
        title: t('common.error'),
        message: t('walletManagement.fillAllFields')
      });
      return;
    }

    try {
      setSubmitting(true);

      // Use the addFundsToWallet function from wallet_management.js to add funds
      // This function updates the wallet balance and creates a validated transaction
      const result = await addFundsToWallet(selectedWallet, currency, parseFloat(amount));
      
      if (!result.success) {
        throw new Error(result.error || t('walletManagement.errorAddingFunds'));
      }

      // Show success message
      show({
        type: 'success',
        title: t('walletManagement.success'),
        message: t('walletManagement.fundsAddedSuccessfully')
      });

      // Reset form
      setSelectedWallet('');
      setAmount('');
      setCurrency('');
      
      // Reload wallets to show updated balances
      await loadWallets();
    } catch (error) {
      console.error('Error adding funds to wallet:', error);
      show({
        type: 'error',
        title: t('walletManagement.errorAddingFunds'),
        message: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t('walletManagement.title')}</h1>

      {/* Custody selection */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('walletManagement.selectCustody')}</h2>
          <select
            value={selectedCustody}
            onChange={(e) => setSelectedCustody(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          >
            <option value="">{t('common.selectOption')}</option>
            {custodies.map((custody) => (
              <option key={custody.id} value={custody.id}>
                {custody.cashier?.name || custody.treasurer?.name || custody.id} - {custody.status}
              </option>
            ))}
          </select>

          {/* Show custody details */}
          {selectedCustody && (
            <div className="mb-4">
              <div>Cashier: {custodies.find(c => c.id === selectedCustody)?.cashier?.name || 'Unknown'}</div>
              <div>Status: {custodies.find(c => c.id === selectedCustody)?.status || 'Unknown'}</div>
              <div>Date: {custodies.find(c => c.id === selectedCustody)?.created_at ? new Date(custodies.find(c => c.id === selectedCustody).created_at).toLocaleDateString() : 'Unknown'}</div>
            </div>
          )}

          {/* Show custody currency pairs analysis table */}
          {selectedCustody && custodyAnalysis && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">{t('currencyPairsTable.pair')}</th>
                    <th className="py-2 px-4 border-b text-right">{t('currencyPairsTable.medianRate')}</th>
                    <th className="py-2 px-4 border-b text-right">{t('currencyPairsTable.transactionCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(custodyAnalysis.currencyPairs).map(([pair, stats]) => (
                    <tr key={pair}>
                      <td className="py-2 px-4 border-b">{pair}</td>
                      <td className="py-2 px-4 border-b text-right">{stats.medianRate}</td>
                      <td className="py-2 px-4 border-b text-right">{stats.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* ...existing code for wallet management... */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('walletManagement.addFunds')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm mb-2">{t('walletManagement.selectWallet')}</label>
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                disabled={submitting}
              >
                <option value="">{t('common.selectOption')}</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-2">{t('walletManagement.selectCurrency')}</label>
              <CurrencySelect 
                value={currency} 
                onChange={setCurrency} 
                disabled={submitting}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm mb-2">{t('walletManagement.amount')}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                step="0.01"
                min="0"
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitting}
            >
              {submitting ? t('common.saving') : t('walletManagement.addFunds')}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}