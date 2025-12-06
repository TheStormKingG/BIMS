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
import { getSupabase } from '../services/supabaseClient';

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
      
      // Auto-create Cash Wallet if it doesn't exist for the current user
      // This handles first-time users and users who haven't created anything yet
      const supabase = getSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (user && !userError) {
        // Check if Cash Wallet exists for this user
        // Since fetchBanks already filters by user_id, we just need to check if any bank is a Cash Wallet
        const userCashWallet = banksData.find(
          bank => bank.bank_name === 'Cash Wallet'
        );
        
        // If no Cash Wallet exists for this user, create it with their user_id
        if (!userCashWallet) {
          try {
            console.log('No Cash Wallet found for user, creating one...', user.id);
            const newWallet = await createBank('Cash Wallet', 0);
            // Ensure the wallet has the correct user_id (createBank should handle this, but verify)
            setBanks([newWallet, ...banksData]);
          } catch (err) {
            console.error('Failed to auto-create Cash Wallet:', err);
            // Continue even if wallet creation fails - user can still use the app
            setBanks(banksData);
          }
        } else {
          // Wallet exists, use the fetched data
          setBanks(banksData);
        }
      } else {
        // No user logged in, just set the banks data as-is
        setBanks(banksData);
      }
      
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
