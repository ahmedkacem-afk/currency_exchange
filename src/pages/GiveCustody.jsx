import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCashiers, getWallets, giveCashCustody } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import CurrencySelect from '../components/CurrencySelect';

/**
 * GiveCustody Component
 * 
 * Form for treasurers to give cash custody to cashiers
 */
export default function GiveCustody() {
  const [cashiers, setCashiers] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [formData, setFormData] = useState({
    cashierId: '',
    walletId: '',
    currencyCode: '',
    amount: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const navigate = useNavigate();
  const { show } = useToast();

  // Load cashiers and wallets
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cashiersData, walletsData] = await Promise.all([
          getCashiers(),
          getWallets()
        ]);
        
        setCashiers(cashiersData || []);
        setWallets(walletsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        show({
          type: 'error',
          title: 'Failed to Load',
          message: 'Could not load cashiers or wallets. ' + error.message
        });
      }
    };
    
    loadData();
  }, [show]);

  // Update available currencies when wallet changes
  useEffect(() => {
    if (formData.walletId) {
      const wallet = wallets.find(w => w.id === formData.walletId);
      setSelectedWallet(wallet);
      
      if (wallet && wallet.currencies) {
        setAvailableCurrencies(wallet.currencies.map(c => ({
          code: c.code,
          balance: c.balance
        })));
      } else {
        setAvailableCurrencies([]);
      }
      
      // Reset currency selection
      setFormData(prev => ({
        ...prev,
        currencyCode: '',
        amount: ''
      }));
    }
  }, [formData.walletId, wallets]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Validate inputs
      if (!formData.cashierId) {
        throw new Error('Please select a cashier');
      }
      
      if (!formData.walletId) {
        throw new Error('Please select a wallet');
      }
      
      if (!formData.currencyCode) {
        throw new Error('Please select a currency');
      }
      
      if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      // Check if the wallet has enough balance
      const currency = selectedWallet?.currencies?.find(c => c.code === formData.currencyCode);
      if (!currency || Number(currency.balance) < Number(formData.amount)) {
        throw new Error(`Insufficient funds in wallet. Available balance: ${currency?.balance || 0} ${formData.currencyCode}`);
      }
      
      // Submit the custody request
      await giveCashCustody(formData);
      
      show({
        type: 'success',
        title: 'Custody Given',
        message: `You have successfully given ${formData.amount} ${formData.currencyCode} to the selected cashier`
      });
      
      // Navigate back to custody management
      navigate('/custody-management');
    } catch (error) {
      console.error('Error giving custody:', error);
      show({
        type: 'error',
        title: 'Failed to Give Custody',
        message: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Give Cash Custody</h1>
        
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cashier Selection */}
            <div>
              <label htmlFor="cashierId" className="block text-sm font-medium text-gray-700 mb-1">
                Select Cashier
              </label>
              <select
                id="cashierId"
                name="cashierId"
                value={formData.cashierId}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                required
              >
                <option value="">-- Select Cashier --</option>
                {cashiers.map(cashier => (
                  <option key={cashier.id} value={cashier.id}>
                    {cashier.name || cashier.email}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Wallet Selection */}
            <div>
              <label htmlFor="walletId" className="block text-sm font-medium text-gray-700 mb-1">
                Select Wallet
              </label>
              <select
                id="walletId"
                name="walletId"
                value={formData.walletId}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                required
              >
                <option value="">-- Select Wallet --</option>
                {wallets.map(wallet => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name || wallet.id}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Currency Selection */}
            <div>
              <label htmlFor="currencyCode" className="block text-sm font-medium text-gray-700 mb-1">
                Select Currency
              </label>
              <CurrencySelect
                currencies={availableCurrencies}
                value={formData.currencyCode}
                onChange={(code) => setFormData(prev => ({ ...prev, currencyCode: code }))}
                disabled={availableCurrencies.length === 0}
                showBalance={true}
              />
            </div>
            
            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                min="0.01"
                step="0.01"
                disabled={!formData.currencyCode}
                required
              />
              {formData.currencyCode && selectedWallet && (
                <p className="text-sm text-gray-500 mt-1">
                  Available: {selectedWallet.currencies?.find(c => c.code === formData.currencyCode)?.balance || 0} {formData.currencyCode}
                </p>
              )}
            </div>
            
            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="Add notes about this custody"
                rows={3}
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                onClick={() => navigate('/custody-management')}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.cashierId || !formData.walletId || !formData.currencyCode || !formData.amount}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? 'Processing...' : 'Give Custody'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}