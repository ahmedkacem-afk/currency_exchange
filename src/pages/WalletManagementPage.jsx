import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import CurrencySelect from '../components/CurrencySelect';
import { getWallets } from '../lib/api';
import AddFundsModal from '../components/AddFundsModal';
import CreateCurrencyTypeModal from '../components/CreateCurrencyTypeModal';

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
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showCreateCurrencyType, setShowCreateCurrencyType] = useState(false);
  const [walletForModal, setWalletForModal] = useState(null);
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
      // De-duplicate by id to avoid duplicate keys in lists
      const uniqueById = [];
      const seen = new Set();
      for (const c of allCustodies) {
        if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          uniqueById.push(c);
        }
      }
      setCustodies(uniqueById);
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

  const handleWalletsRefetch = async () => {
    await loadWallets();
  };

  return (
  <div className="max-w-3xl mx-auto px-4 py-8 w-full">
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
            <div className="overflow-x-auto w-full">
              <table className="min-w-full bg-white text-xs sm:text-sm">
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

      {/* Wallets list with actions */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('walletManagement.walletList')}</h2>
          {loading ? (
            <div className="text-gray-500">{t('cashier.processing')}</div>
          ) : wallets.length === 0 ? (
            <div className="text-gray-500">{t('walletManagement.noWallets')}</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full bg-white text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">{t('walletManagement.walletName') || 'Wallet Name'}</th>
                    <th className="py-2 px-4 border-b text-left">{t('walletManagement.balances') || 'Balances'}</th>
                    <th className="py-2 px-4 border-b text-left">{t('walletManagement.actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet) => (
                    <tr key={wallet.id}>
                      <td className="py-2 px-4 border-b font-medium break-words">{wallet.name}</td>
                      <td className="py-2 px-4 border-b">
                        <div className="flex flex-wrap gap-2">
                          {wallet.currencies && Object.keys(wallet.currencies).length > 0 ? (
                            Object.entries(wallet.currencies).map(([code, bal]) => (
                              <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded">
                                <span className="font-mono">{code}</span>
                                <span className="text-gray-700">{Number(bal).toLocaleString()}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">{t('walletManagement.noBalances')}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 border-b">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1">
                          <Button variant="secondary" size="sm" style={{minWidth: '90px', fontSize: '0.85rem', padding: '0.4rem 0.6rem'}} onClick={() => { setWalletForModal(wallet); setShowAddFunds(true); }}>
                            {t('walletManagement.addFunds')}
                          </Button>
                          <Button variant="outline" size="sm" style={{minWidth: '90px', fontSize: '0.85rem', padding: '0.4rem 0.6rem'}} onClick={() => { setShowCreateCurrencyType(true); }}>
                            {t('create.currencyType')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            style={{minWidth: '90px', fontSize: '0.85rem', padding: '0.4rem 0.6rem'}}
                            onClick={async () => {
                              if (!confirm('Delete this wallet? This action cannot be undone.')) return;
                              try {
                                const { deleteWallet } = await import('../lib/supabase/tables/wallets');
                                await deleteWallet(wallet.id);
                                await loadWallets();
                                show({ type: 'success', title: t('walletManagement.success'), message: 'Wallet deleted' });
                              } catch (e) {
                                console.error('Delete wallet failed:', e);
                                show({ type: 'error', title: t('walletManagement.errorLoadingWallets'), message: e.message });
                              }
                            }}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>


      {/* Modals */}
      <AddFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        wallet={walletForModal}
        onSuccess={async () => { setShowAddFunds(false); setWalletForModal(null); await handleWalletsRefetch(); }}
      />

      <CreateCurrencyTypeModal
        isOpen={showCreateCurrencyType}
        onClose={() => setShowCreateCurrencyType(false)}
        onSuccess={() => setShowCreateCurrencyType(false)}
      />
    </div>
  );
}