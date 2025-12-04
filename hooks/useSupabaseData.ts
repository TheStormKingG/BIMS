import { useState, useEffect } from 'react';
import {
  fetchAccounts,
  fetchTransactions,
  createAccount as dbCreateAccount,
  updateAccount as dbUpdateAccount,
  deleteAccount as dbDeleteAccount,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from '../services/database';
import { Account, BankAccount, CashWallet, Transaction, CashDenominations } from '../types';

export const useSupabaseData = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accountsData, transactionsData] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
      ]);
      
      // Initialize default accounts if none exist
      if (accountsData.length === 0) {
        console.log('No accounts found, creating defaults...');
        const defaultWallet = await dbCreateAccount({
          type: 'CASH_WALLET',
          name: 'Cash Wallet',
          denominations: { 20: 0, 100: 0, 500: 0, 1000: 0, 5000: 0 },
        });
        accountsData.push(defaultWallet);
      }
      
      setAccounts(accountsData);
      setTransactions(transactionsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Account operations
  const addAccount = async (name: string, balance: number) => {
    try {
      const newAccount = await dbCreateAccount({
        name,
        type: 'BANK',
        balance,
      });
      setAccounts(prev => [...prev, newAccount]);
      return newAccount;
    } catch (err) {
      console.error('Failed to add account:', err);
      throw err;
    }
  };

  const updateAccount = async (id: string, name: string, balance: number) => {
    try {
      await dbUpdateAccount(id, { name, balance });
      setAccounts(prev =>
        prev.map(acc =>
          acc.id === id && acc.type === 'BANK'
            ? { ...acc, name, balance }
            : acc
        )
      );
    } catch (err) {
      console.error('Failed to update account:', err);
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await dbDeleteAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    } catch (err) {
      console.error('Failed to delete account:', err);
      throw err;
    }
  };

  const updateWallet = async (id: string, denominations: CashDenominations) => {
    try {
      await dbUpdateAccount(id, { denominations });
      setAccounts(prev =>
        prev.map(acc =>
          acc.id === id && acc.type === 'CASH_WALLET'
            ? { ...acc, denominations }
            : acc
        )
      );
    } catch (err) {
      console.error('Failed to update wallet:', err);
      throw err;
    }
  };

  // Transaction operations
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const newTransaction = await dbCreateTransaction(transaction);
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Update account balance
      const account = accounts.find(acc => acc.id === transaction.accountId);
      if (account?.type === 'BANK') {
        await updateAccount(
          account.id,
          account.name,
          account.balance - transaction.totalAmount
        );
      }
      
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
      // Get transaction before deleting to reverse the account balance
      const transaction = transactions.find(txn => txn.id === id);
      
      await dbDeleteTransaction(id);
      setTransactions(prev => prev.filter(txn => txn.id !== id));
      
      // Reverse account balance
      if (transaction) {
        const account = accounts.find(acc => acc.id === transaction.accountId);
        if (account?.type === 'BANK') {
          await updateAccount(
            account.id,
            account.name,
            account.balance + transaction.totalAmount
          );
        }
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      throw err;
    }
  };

  // Helper functions
  const wallet = accounts.find((acc): acc is CashWallet => acc.type === 'CASH_WALLET');
  const bankAccounts = accounts.filter((acc): acc is BankAccount => acc.type === 'BANK');

  const cashBalance = wallet
    ? Object.entries(wallet.denominations).reduce(
        (sum, [denom, count]) => sum + Number(denom) * Number(count),
        0
      )
    : 0;

  const totalBalance = cashBalance + bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  return {
    // Data
    wallet,
    bankAccounts,
    transactions,
    cashBalance,
    totalBalance,
    loading,
    error,
    
    // Operations
    addAccount,
    updateAccount,
    deleteAccount,
    updateWallet,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: loadData,
  };
};

