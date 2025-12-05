import { useState, useEffect } from 'react';
import {
  fetchWallet,
  createWallet,
  getWalletBalance,
  updateWalletBalance,
  addToWalletBalance,
} from '../services/walletDatabase';
import { CashWallet } from '../types';

export const useWallet = () => {
  const [wallet, setWallet] = useState<CashWallet | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load wallet on mount
  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let walletData = await fetchWallet();
      let walletBalance = 0;
      
      // If no wallet exists, create one with zero balance
      if (!walletData) {
        console.log('No wallet found, creating initial wallet...');
        try {
          walletData = await createWallet(0);
          walletBalance = 0;
        } catch (createErr: any) {
          if (createErr.message?.includes('does not exist') || createErr.code === 'PGRST202') {
            throw new Error('banks table does not exist. Please run the SQL schema in Supabase SQL Editor.');
          }
          throw createErr;
        }
      } else {
        walletBalance = await getWalletBalance();
      }
      
      setWallet(walletData);
      setBalance(walletBalance);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update wallet balance
  const updateWallet = async (newBalance: number) => {
    try {
      const updatedWallet = await updateWalletBalance(newBalance);
      const updatedBalance = await getWalletBalance();
      setWallet(updatedWallet);
      setBalance(updatedBalance);
    } catch (err) {
      console.error('Failed to update wallet:', err);
      throw err;
    }
  };

  // Add funds to wallet (simple amount, no denominations)
  const addFunds = async (amount: number) => {
    try {
      if (!wallet) {
        // Create wallet if it doesn't exist
        const newWallet = await createWallet(amount);
        setWallet(newWallet);
        setBalance(amount);
        return newWallet;
      }

      const updatedWallet = await addToWalletBalance(amount);
      const updatedBalance = await getWalletBalance();
      setWallet(updatedWallet);
      setBalance(updatedBalance);
      
      return updatedWallet;
    } catch (err) {
      console.error('Failed to add funds to wallet:', err);
      throw err;
    }
  };

  // Refresh wallet data
  const refresh = async () => {
    await loadWallet();
  };

  return {
    wallet,
    balance,
    cashBalance: balance, // Alias for compatibility
    loading,
    error,
    updateWallet,
    addFunds,
    refresh,
  };
};
