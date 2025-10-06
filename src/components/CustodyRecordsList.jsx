import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { Card } from './Card'

/**
 * CustodyRecordsList Component
 * 
 * Displays custody records list with filtering options
 */
export default function CustodyRecordsList({ records = [] }) {
  const { t } = useI18n()
  const [filter, setFilter] = useState('all') // 'all', 'given', 'received', 'pending', 'approved'
  
  // Filter records based on the current filter
  const filteredRecords = records.filter(record => {
    if (filter === 'all') return true
    if (filter === 'given') return !record.is_returned
    if (filter === 'received') return record.is_returned
    if (filter === 'pending') return record.status === 'pending'
    if (filter === 'approved') return record.status === 'approved'
    return true
  })
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }
  
  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'returned':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  return (
    <Card className="mb-6">
      <div className="p-5">
        <h2 className="text-lg font-medium mb-4">Custody Records</h2>
        
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'all'
                ? 'bg-emerald-100 text-emerald-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('given')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'given'
                ? 'bg-emerald-100 text-emerald-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Given
          </button>
          <button
            onClick={() => setFilter('received')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'received'
                ? 'bg-emerald-100 text-emerald-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'pending'
                ? 'bg-emerald-100 text-emerald-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'approved'
                ? 'bg-emerald-100 text-emerald-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
        </div>
        
        {/* Records list */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No custody records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cashier
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        record.is_returned
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {record.is_returned ? 'Return' : 'Give'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.cashier?.name || 'Unknown'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.wallet?.name || 'Unknown'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">
                        {record.amount} {record.currency_code}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        getStatusBadge(record.status)
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}