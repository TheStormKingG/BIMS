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
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - check if wallet_snapshots table exists in Supabase')), 10000)
      );
      
      const walletPromise = fetchLatestWallet();
      let walletData = await Promise.race([walletPromise, timeoutPromise]) as CashWallet | null;
      
      // If no wallet exists, create an initial one with zero denominations
      if (!walletData) {
        console.log('No wallet found, creating initial wallet...');
        try {
          walletData = await createWalletSnapshot(INITIAL_DENOMINATIONS);
        } catch (createErr: any) {
          // If table doesn't exist, show helpful error
          if (createErr.message?.includes('does not exist')) {
            throw new Error('wallet_snapshots table does not exist. Please run the SQL schema in Supabase SQL Editor.');
          }
          throw createErr;
        }
      }
      
      setWallet(walletData);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet';
      setError(errorMessage);
      // Still set loading to false so user can see the error
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

