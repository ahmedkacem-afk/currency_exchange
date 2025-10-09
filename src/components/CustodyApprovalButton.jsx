import { useState } from 'react';
import Button from './Button';
import { updateCustodyStatus } from '../lib/api';
import { useToast } from './Toast';

/**
 * CustodyApprovalButton Component
 * 
 * Button component for approving or rejecting cash custody requests
 */
export default function CustodyApprovalButton({ custodyId, status, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const { show } = useToast();

  const isApprove = status === 'approved';
  const isReject = status === 'rejected';

  const handleClick = async () => {
    try {
      setSubmitting(true);
      await updateCustodyStatus(custodyId, status);
      
      show(
        isApprove 
          ? 'You have successfully approved the custody request' 
          : 'You have rejected the custody request',
        'success'
      );
      
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating custody status:', error);
      show(
        `Failed to ${isApprove ? 'approve' : 'reject'} the custody request: ${error.message}`,
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={submitting}
      className={`${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 text-sm rounded-md`}
    >
      {submitting ? 'Processing...' : isApprove ? 'Approve' : 'Reject'}
    </Button>
  );
}