import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../client';
import { useAuth } from './useAuth';

export function useDebts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchDebts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get debts where the current user is either the debtor or creditor
      const { data, error } = await supabase
        .from('debts')
        .select(`
          *,
          debtor:debtor_id(id, name, email),
          creditor:creditor_id(id, name, email),
          currency_type:currency_type_id(id, code, name)
        `)
        .or(`debtor_id.eq.${user.id},creditor_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDebts(data || []);
    } catch (err) {
      console.error('Error fetching debts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createDebt = async (debtData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('debts')
        .insert([debtData])
        .select();

      if (error) throw error;

      // Refresh debts list
      await fetchDebts();
      return { success: true, data };
    } catch (err) {
      console.error('Error creating debt:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateDebtStatus = async (debtId, status) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('debts')
        .update({ status, updated_at: new Date() })
        .eq('id', debtId)
        .select();

      if (error) throw error;

      // Refresh debts list
      await fetchDebts();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating debt status:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const markDebtAsPaid = async (debtId) => {
    return await updateDebtStatus(debtId, 'paid');
  };

  const cancelDebt = async (debtId) => {
    return await updateDebtStatus(debtId, 'cancelled');
  };

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  return {
    debts,
    loading,
    error,
    fetchDebts,
    createDebt,
    markDebtAsPaid,
    cancelDebt,
  };
}