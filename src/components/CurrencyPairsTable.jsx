import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

/**
 * CurrencyPairsTable Component
 * 
 * Displays currency pairs and their exchange rate statistics in a table format
 */
export default function CurrencyPairsTable({ 
  currencyPairs = {}, 
  title = "Currency Pairs", 
  showTransactionCount = true,
  showAmountInfo = true
}) {
  const { t } = useI18n();

  // Convert currency pairs object to array for easier rendering
  const pairsArray = Object.entries(currencyPairs).map(([pairKey, data]) => ({
    pair: pairKey,
    fromCurrency: data.fromCurrency,
    toCurrency: data.toCurrency,
    medianRate: data.medianRate,
    minRate: data.minRate,
    maxRate: data.maxRate,
    transactionCount: data.transactionCount,
    totalAmount: data.totalAmount,
    totalExchangeAmount: data.totalExchangeAmount,
    averageAmount: data.averageAmount,
    buyCount: data.buyCount,
    sellCount: data.sellCount,
    primaryOperationType: data.primaryOperationType
  }));

  if (pairsArray.length === 0) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">
          {t('currencyPairs.noData', 'No currency exchange data available')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-medium mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('currencyPairs.pair', 'Currency Pair')}
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('currencyPairs.medianRate', 'Median Rate')}
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('currencyPairs.minRate', 'Min Rate')}
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('currencyPairs.maxRate', 'Max Rate')}
              </th>
              {showTransactionCount && (
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  {t('currencyPairs.transactions', 'Transactions')}
                </th>
              )}
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {t('currencyPairs.operations', 'Operations')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pairsArray.map((pair, index) => (
              <tr key={pair.pair} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="text-blue-600">{pair.fromCurrency}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="text-green-600">{pair.toCurrency}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {pair.primaryOperationType === 'buy' ? 
                        `Buying ${pair.fromCurrency}` : 
                        `Selling ${pair.fromCurrency}`
                      }
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 font-semibold">
                  {pair.medianRate.toFixed(6)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {pair.minRate.toFixed(6)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {pair.maxRate.toFixed(6)}
                </td>
                {showTransactionCount && (
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {pair.transactionCount}
                  </td>
                )}
                <td className="px-4 py-2">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        <span className="font-medium">{pair.buyCount}</span>
                        <span className="ml-1">{t('currencyPairs.buy', 'Buy')}</span>
                      </div>
                      <div className="flex items-center bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        <span className="font-medium">{pair.sellCount}</span>
                        <span className="ml-1">{t('currencyPairs.sell', 'Sell')}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>{pair.fromCurrency}: {pair.totalAmount.toFixed(2)}</div>
                      <div>{pair.toCurrency}: {pair.totalExchangeAmount.toFixed(2)}</div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Summary info */}
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <div className="flex justify-between">
          <span>{t('currencyPairs.totalPairs', 'Total Currency Pairs')}:</span>
          <span className="font-medium">{pairsArray.length}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('currencyPairs.totalTransactions', 'Total Exchange Transactions')}:</span>
          <span className="font-medium">
            {pairsArray.reduce((sum, pair) => sum + pair.transactionCount, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * CurrencyPairsSummary Component
 * 
 * Displays a simplified summary of the most active currency pairs
 */
export function CurrencyPairsSummary({ currencyPairs = {}, maxPairs = 5 }) {
  const { t } = useI18n();

  const pairsArray = Object.entries(currencyPairs)
    .map(([pairKey, data]) => ({
      pair: pairKey,
      medianRate: data.medianRate,
      transactionCount: data.transactionCount,
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      buyCount: data.buyCount,
      sellCount: data.sellCount,
      primaryOperationType: data.primaryOperationType,
      totalAmount: data.totalAmount,
      totalExchangeAmount: data.totalExchangeAmount
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, maxPairs);

  if (pairsArray.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        {t('currencyPairs.noData', 'No currency exchange data available')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pairsArray.map((pair) => (
        <div key={pair.pair} className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="text-lg font-medium text-blue-600">{pair.fromCurrency}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="text-lg font-medium text-green-600">{pair.toCurrency}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {pair.primaryOperationType === 'buy' ? 
                  `Buying ${pair.fromCurrency}` : 
                  `Selling ${pair.fromCurrency}`
                }
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{pair.medianRate.toFixed(4)}</div>
              <div className="text-xs text-gray-500">{pair.transactionCount} {t('currencyPairs.txs', 'txs')}</div>
            </div>
          </div>
          
          {/* Operations Summary */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  <span className="font-medium">{pair.buyCount}</span>
                  <span className="ml-1">{t('currencyPairs.buy', 'Buy')}</span>
                </div>
                <div className="flex items-center bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                  <span className="font-medium">{pair.sellCount}</span>
                  <span className="ml-1">{t('currencyPairs.sell', 'Sell')}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">
                  {pair.fromCurrency}: {pair.totalAmount.toFixed(2)}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {pair.toCurrency}: {pair.totalExchangeAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}