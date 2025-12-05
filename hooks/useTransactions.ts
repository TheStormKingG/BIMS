import { useState, useEffect } from 'react';
import {
  fetchTransactions,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from '../services/transactionsDatabase';
import { Transaction } from '../types';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const newTransaction = await dbCreateTransaction(transaction);
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      console.error('Failed to add transaction:', err);
      throw err;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await dbUpdateTransaction(id, updates);
      setTransactions(prev =>
        prev.map(txn => (txn.id === id ? { ...txn, ...updates } : txn))
      );
    } catch (err) {
      console.error('Failed to update transaction:', err);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await dbDeleteTransaction(id);
      setTransactions(prev => prev.filter(txn => txn.id !== id));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      throw err;
    }
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: loadTransactions,
  };
};

