import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCashCustody, updateCustodyStatus } from '../lib/api';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n/I18nProvider';

/**
 * CustodyManagement Component
 * 
 * Displays cash custody requests and allows approval/rejection
 */
export default function CustodyManagement() {
  const [custodyRecords, setCustodyRecords] = useState({ given: [], received: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { show } = useToast();
  const { t } = useI18n();

  // Load custody records
  useEffect(() => {
    fetchCustodyRecords();
  }, []);

  const fetchCustodyRecords = async () => {
    try {
      setLoading(true);
      const records = await getAllCashCustody();
      setCustodyRecords(records);
    } catch (error) {
      console.error('Error fetching custody records:', error);
      show({
        type: 'error',
        title: t('common.failedToLoadData'),
        message: t('common.failedToLoadData') + ': ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (custodyId) => {
    try {
      await updateCustodyStatus(custodyId, 'approved');
      show({
        type: 'success',
        title: t('custodyManagement.approved'),
        message: t('custodyManagement.approvalSuccess')
      });
      fetchCustodyRecords(); // Refresh the list
    } catch (error) {
      console.error('Error approving custody:', error);
      show({
        type: 'error',
        title: t('custodyManagement.approvalFailed'),
        message: t('custodyManagement.approvalFailed') + ': ' + error.message
      });
    }
  };

  const handleReject = async (custodyId) => {
    try {
      await updateCustodyStatus(custodyId, 'rejected');
      show({
        type: 'success',
        title: t('custodyManagement.rejected'),
        message: t('custodyManagement.rejectionSuccess')
      });
      fetchCustodyRecords(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting custody:', error);
      show({
        type: 'error',
        title: t('custodyManagement.rejectionFailed'),
        message: t('custodyManagement.rejectionFailed') + ': ' + error.message
      });
    }
  };

  const handleReturn = async (custodyId) => {
    try {
      await updateCustodyStatus(custodyId, 'returned');
      show({
        type: 'success',
        title: t('custodyManagement.returned'),
        message: t('custodyManagement.returnSuccess')
      });
      fetchCustodyRecords(); // Refresh the list
    } catch (error) {
      console.error('Error returning custody:', error);
      show({
        type: 'error',
        title: t('custodyManagement.returnFailed'),
        message: t('custodyManagement.returnFailed') + ': ' + error.message
      });
    }
  };

  return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{t('custodyManagement.title')}</h1>

        <div className="flex gap-4 mb-6">
          <Button 
            onClick={fetchCustodyRecords}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {t('custodyManagement.refresh')}
          </Button>
        </div>

        {/* Custody Given (by me as treasurer) */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('custodyManagement.custodyGiven')}</h2>
          {loading ? (
            <p className="text-gray-500">{t('common.loading')}</p>
          ) : custodyRecords.given.length === 0 ? (
            <p className="text-gray-500">{t('custodyManagement.noCustodyGiven')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">{t('custodyManagement.date')}</th>
                    <th className="py-2 px-4 border-b text-left">{t('custodyManagement.cashier')}</th>
                    <th className="py-2 px-4 border-b text-left">{t('custodyManagement.wallet')}</th>
                    <th className="py-2 px-4 border-b text-right">{t('custodyManagement.amount')}</th>
                    <th className="py-2 px-4 border-b text-center">{t('custodyManagement.status')}</th>
                    <th className="py-2 px-4 border-b text-center">{t('custodyManagement.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {custodyRecords.given.map(record => (
                    <tr key={record.id}>
                      <td className="py-2 px-4 border-b">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {record.cashier?.name || record.cashier_id}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {record.wallet?.name || record.wallet_id}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {record.amount} {record.currency_code}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === 'approved' ? 'bg-green-100 text-green-800' :
                          record.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          record.status === 'returned' ? 'bg-blue-100 text-blue-800' : ''
                        }`}>
                          {record.status === 'pending' ? t('custodyManagement.pending') :
                           record.status === 'approved' ? t('custodyManagement.approved') :
                           record.status === 'rejected' ? t('custodyManagement.rejected') :
                           record.status === 'returned' ? t('custodyManagement.returned') :
                           record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {record.status === 'approved' && !record.is_returned && (
                          <Button
                            onClick={() => handleReturn(record.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                          >
                            {t('custodyManagement.markReturned')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Custody Received (as cashier) */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">{t('custodyManagement.custodyReceived')}</h2>
          {loading ? (
            <p className="text-gray-500">{t('common.loading')}</p>
          ) : custodyRecords.received.length === 0 ? (
            <p className="text-gray-500">{t('custodyManagement.noCustodyReceived')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">{t('custodyManagement.date')}</th>
                    <th className="py-2 px-4 border-b text-left">{t('custodyManagement.treasurer')}</th>
                    <th className="py-2 px-4 border-b text-left">{t('custodyManagement.wallet')}</th>
                    <th className="py-2 px-4 border-b text-right">{t('custodyManagement.amount')}</th>
                    <th className="py-2 px-4 border-b text-center">{t('custodyManagement.status')}</th>
                    <th className="py-2 px-4 border-b text-center">{t('custodyManagement.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {custodyRecords.received.map(record => (
                    <tr key={record.id}>
                      <td className="py-2 px-4 border-b">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {record.treasurer?.name || record.treasurer_id}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {record.wallet?.name || record.wallet_id}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {record.amount} {record.currency_code}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === 'approved' ? 'bg-green-100 text-green-800' :
                          record.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          record.status === 'returned' ? 'bg-blue-100 text-blue-800' : ''
                        }`}>
                          {record.status === 'pending' ? t('custodyManagement.pending') :
                           record.status === 'approved' ? t('custodyManagement.approved') :
                           record.status === 'rejected' ? t('custodyManagement.rejected') :
                           record.status === 'returned' ? t('custodyManagement.returned') :
                           record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {record.status === 'pending' && (
                          <div className="flex justify-center space-x-2">
                            <Button
                              onClick={() => handleApprove(record.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                            >
                              {t('custodyManagement.approve')}
                            </Button>
                            <Button
                              onClick={() => handleReject(record.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                            >
                              {t('custodyManagement.reject')}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
  );
}