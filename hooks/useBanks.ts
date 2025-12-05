import { useState, useEffect } from 'react';
import {
  fetchBanks,
  createBank,
  updateBank as dbUpdateBank,
  deleteBank as dbDeleteBank,
  fetchBankInTransactions,
  createBankInTransaction,
  fetchWalletInTransactions,
  createWalletInTransaction,
  DBBank,
  DBBankIn,
  DBWalletIn,
} from '../services/banksDatabase';

export const useBanks = () => {
  const [banks, setBanks] = useState<DBBank[]>([]);
  const [bankInTransactions, setBankInTransactions] = useState<DBBankIn[]>([]);
  const [walletInTransactions, setWalletInTransactions] = useState<DBWalletIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [banksData, bankInsData, walletInsData] = await Promise.all([
        fetchBanks(),
        fetchBankInTransactions(),
        fetchWalletInTransactions(),
      ]);
      
      setBanks(banksData);
      setBankInTransactions(bankInsData);
      setWalletInTransactions(walletInsData);
    } catch (err) {
      console.error('Failed to load banks data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load banks data');
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

  // Bank-In transaction operations
  const addBankInTransaction = async (
    destinationBankId: string,
    amount: number,
    source: string
  ) => {
    try {
      const newTransaction = await createBankInTransaction(destinationBankId, amount, source);
      setBankInTransactions(prev => [newTransaction, ...prev]);
      
      // Update the bank's total in state
      setBanks(prev =>
        prev.map(bank =>
          bank.id === destinationBankId
            ? { ...bank, total: bank.total + amount, updated: new Date().toISOString() }
            : bank
        )
      );
      
      return newTransaction;
    } catch (err) {
      console.error('Failed to add bank-in transaction:', err);
      throw err;
    }
  };

  // Wallet-In transaction operations
  const addWalletInTransaction = async (
    source: string,
    denominations: {
      5000?: number;
      2000?: number;
      1000?: number;
      500?: number;
      100?: number;
      50?: number;
      20?: number;
    }
  ) => {
    try {
      const newTransaction = await createWalletInTransaction(source, denominations);
      setWalletInTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      console.error('Failed to add wallet-in transaction:', err);
      throw err;
    }
  };

  // Calculate totals
  const totalInBanks = banks.reduce((sum, bank) => sum + Number(bank.total), 0);
  const totalBankInflows = bankInTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);
  const totalWalletInflows = walletInTransactions.reduce((sum, txn) => sum + Number(txn.total), 0);

  return {
    // Data
    banks,
    bankInTransactions,
    walletInTransactions,
    totalInBanks,
    totalBankInflows,
    totalWalletInflows,
    loading,
    error,
    
    // Operations
    addBank,
    updateBank,
    deleteBank,
    addBankInTransaction,
    addWalletInTransaction,
    refresh: loadData,
  };
};


