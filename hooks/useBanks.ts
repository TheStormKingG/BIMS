import { useState, useEffect } from 'react';
import {
  fetchBanks,
  createBank,
  updateBank as dbUpdateBank,
  deleteBank as dbDeleteBank,
  fetchFundsInTransactions,
  createFundsInTransaction,
  DBBank,
  DBFundsIn,
} from '../services/banksDatabase';
import { fetchFundsOut, DBFundsOut } from '../services/fundsOutDatabase';

export const useBanks = () => {
  const [banks, setBanks] = useState<DBBank[]>([]);
  const [fundsInTransactions, setFundsInTransactions] = useState<DBFundsIn[]>([]);
  const [fundsOutTransactions, setFundsOutTransactions] = useState<DBFundsOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [banksData, fundsInData, fundsOutData] = await Promise.all([
        fetchBanks(),
        fetchFundsInTransactions(),
        fetchFundsOut(),
      ]);
      
      setBanks(banksData);
      setFundsInTransactions(fundsInData);
      setFundsOutTransactions(fundsOutData);
    } catch (err: any) {
      console.error('Failed to load banks data:', err);
      // If tables don't exist, just set empty arrays - don't show error
      if (err?.code === 'PGRST202' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setBanks([]);
        setFundsInTransactions([]);
        setFundsOutTransactions([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load banks data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Bank operations
  const addBank = async (bankName: string, initialTotal: number = 0) => {
    try {
      const newBank = await createBank(bankName, initialTotal);
      setBanks(prev => [newBank, ...prev]);
      return newBank;
    } catch (err) {
      console.error('Failed to add bank:', err);
      throw err;
    }
  };

  const updateBank = async (id: string, bankName: string, total: number) => {
    try {
      await dbUpdateBank(id, bankName, total);
      setBanks(prev =>
        prev.map(bank =>
          bank.id === id
            ? { ...bank, bank_name: bankName, total, updated: new Date().toISOString() }
            : bank
        )
      );
    } catch (err) {
      console.error('Failed to update bank:', err);
      throw err;
    }
  };

  const deleteBank = async (id: string) => {
    try {
      await dbDeleteBank(id);
      setBanks(prev => prev.filter(bank => bank.id !== id));
    } catch (err) {
      console.error('Failed to delete bank:', err);
      throw err;
    }
  };

  // Funds-In transaction operations (replaces bank-in)
  const addFundsInTransaction = async (
    destinationAccountId: string,
    amount: number,
    source: string
  ) => {
    try {
      const newTransaction = await createFundsInTransaction(destinationAccountId, amount, source);
      setFundsInTransactions(prev => [newTransaction, ...prev]);
      
      // Update the bank's total in state
      setBanks(prev =>
        prev.map(bank =>
          bank.id === destinationAccountId
            ? { ...bank, total: bank.total + amount, updated: new Date().toISOString() }
            : bank
        )
      );
      
      return newTransaction;
    } catch (err) {
      console.error('Failed to add funds-in transaction:', err);
      throw err;
    }
  };

  // Calculate totals
  const totalInBanks = banks.reduce((sum, bank) => sum + Number(bank.total), 0);
  const totalFundsInflows = fundsInTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

  return {
    // Data
    banks,
    fundsInTransactions,
    // Legacy alias for backward compatibility
    bankInTransactions: fundsInTransactions,
    fundsOutTransactions,
    totalInBanks,
    totalBankInflows: totalFundsInflows,
    loading,
    error,
    
    // Operations
    addBank,
    updateBank,
    deleteBank,
    addFundsInTransaction,
    // Legacy alias for backward compatibility
    addBankInTransaction: addFundsInTransaction,
    refresh: loadData,
  };
};
