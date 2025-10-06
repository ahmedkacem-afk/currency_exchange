import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCashCustody, updateCustodyStatus } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../components/Toast';

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
        title: 'Failed to Load',
        message: 'Could not load custody records. ' + error.message
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
        title: 'Custody Approved',
        message: 'You have successfully approved the custody request'
      });
      fetchCustodyRecords(); // Refresh the list
    } catch (error) {
      console.error('Error approving custody:', error);
      show({
        type: 'error',
        title: 'Approval Failed',
        message: 'Could not approve the custody request. ' + error.message
      });
    }
  };

  const handleReject = async (custodyId) => {
    try {
      await updateCustodyStatus(custodyId, 'rejected');
      show({
        type: 'success',
        title: 'Custody Rejected',
        message: 'You have rejected the custody request'
      });
      fetchCustodyRecords(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting custody:', error);
      show({
        type: 'error',
        title: 'Rejection Failed',
        message: 'Could not reject the custody request. ' + error.message
      });
    }
  };

  const handleReturn = async (custodyId) => {
    try {
      await updateCustodyStatus(custodyId, 'returned');
      show({
        type: 'success',
        title: 'Custody Returned',
        message: 'The custody has been marked as returned'
      });
      fetchCustodyRecords(); // Refresh the list
    } catch (error) {
      console.error('Error returning custody:', error);
      show({
        type: 'error',
        title: 'Return Failed',
        message: 'Could not mark the custody as returned. ' + error.message
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Cash Custody Management</h1>

        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => navigate('/give-custody')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Give New Custody
          </Button>
          <Button 
            onClick={fetchCustodyRecords}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Refresh
          </Button>
        </div>

        {/* Custody Given (by me as treasurer) */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Custody Given</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : custodyRecords.given.length === 0 ? (
            <p className="text-gray-500">No custody records given</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Date</th>
                    <th className="py-2 px-4 border-b text-left">Cashier</th>
                    <th className="py-2 px-4 border-b text-left">Wallet</th>
                    <th className="py-2 px-4 border-b text-right">Amount</th>
                    <th className="py-2 px-4 border-b text-center">Status</th>
                    <th className="py-2 px-4 border-b text-center">Actions</th>
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
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {record.status === 'approved' && !record.is_returned && (
                          <Button
                            onClick={() => handleReturn(record.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                          >
                            Mark Returned
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
          <h2 className="text-xl font-semibold mb-4">Custody Received</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : custodyRecords.received.length === 0 ? (
            <p className="text-gray-500">No custody records received</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Date</th>
                    <th className="py-2 px-4 border-b text-left">Treasurer</th>
                    <th className="py-2 px-4 border-b text-left">Wallet</th>
                    <th className="py-2 px-4 border-b text-right">Amount</th>
                    <th className="py-2 px-4 border-b text-center">Status</th>
                    <th className="py-2 px-4 border-b text-center">Actions</th>
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
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {record.status === 'pending' && (
                          <div className="flex justify-center space-x-2">
                            <Button
                              onClick={() => handleApprove(record.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(record.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                            >
                              Reject
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
    </Layout>
  );
}