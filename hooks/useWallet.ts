import { useState, useEffect } from 'react';
import {
  fetchLatestWallet,
  createWalletSnapshot,
  updateWallet as dbUpdateWallet,
  calculateTotal,
} from '../services/walletDatabase';
import { CashWallet, CashDenominations } from '../types';
import { INITIAL_DENOMINATIONS } from '../constants';

export const useWallet = () => {
  const [wallet, setWallet] = useState<CashWallet | null>(null);
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
      
      let walletData = await fetchLatestWallet();
      
      // If no wallet exists, create an initial one with zero denominations
      if (!walletData) {
        console.log('No wallet found, creating initial wallet...');
        walletData = await createWalletSnapshot(INITIAL_DENOMINATIONS);
      }
      
      setWallet(walletData);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  // Update wallet denominations (creates new snapshot)
  const updateWallet = async (denominations: CashDenominations) => {
    try {
      const updatedWallet = await dbUpdateWallet(denominations);
      setWallet(updatedWallet);
    } catch (err) {
      console.error('Failed to update wallet:', err);
      throw err;
    }
  };

  // Add funds to wallet (adds to existing denominations)
  const addFunds = async (incomingDenominations: CashDenominations) => {
    try {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      // Combine current wallet with incoming funds
      const newDenominations: CashDenominations = { ...wallet.denominations };
      
      Object.entries(incomingDenominations).forEach(([denom, count]) => {
        const denomKey = Number(denom);
        newDenominations[denomKey] = (newDenominations[denomKey] || 0) + count;
      });

      // Create new wallet snapshot with updated denominations
      const updatedWallet = await dbUpdateWallet(newDenominations);
      setWallet(updatedWallet);
      
      return updatedWallet;
    } catch (err) {
      console.error('Failed to add funds to wallet:', err);
      throw err;
    }
  };

  // Calculate current cash balance
  const cashBalance = wallet ? calculateTotal(wallet.denominations) : 0;

  return {
    wallet,
    cashBalance,
    loading,
    error,
    updateWallet,
    addFunds,
    refresh: loadWallet,
  };
};

