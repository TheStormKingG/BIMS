import { getSupabase } from './supabaseClient';
import { CashWallet } from '../types';

const supabase = getSupabase();

// Wallet is now stored in banks table as "Cash Wallet"
// This service provides wallet-specific operations using the banks table

export interface DBWallet {
  id: string;
  bank_name: string;
  total: number;
  updated: string;
}

// Convert database row to app format
const dbToWallet = (bank: DBWallet): CashWallet => {
  return {
    id: bank.id,
    type: 'CASH_WALLET',
    // No longer using denominations - wallet is just a balance
    denominations: {} as any, // Keep for compatibility but not used
  };
};

// Fetch the wallet from banks table
export const fetchWallet = async (): Promise<CashWallet | null> => {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('bank_name', 'Cash Wallet')
      .single();
    
    if (error) {
      // PGRST116 = No rows found
      if (error.code === 'PGRST116') {
        return null;
      }
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('banks table does not exist yet');
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    return dbToWallet(data as DBWallet);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      console.warn('banks table does not exist yet');
      return null;
    }
    throw err;
  }
};

// Get wallet balance
export const getWalletBalance = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('total')
      .eq('bank_name', 'Cash Wallet')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return 0; // No wallet found, return 0
      }
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return 0;
      }
      throw error;
    }
    
    return Number(data?.total || 0);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      return 0;
    }
    throw err;
  }
};

// Create wallet if it doesn't exist
export const createWallet = async (initialBalance: number = 0): Promise<CashWallet> => {
  try {
    const { data, error } = await supabase
      .from('banks')
      .insert([{ bank_name: 'Cash Wallet', total: initialBalance }])
      .select()
      .single();
    
    if (error) {
      // If wallet already exists, fetch it
      if (error.code === '23505') { // Unique constraint violation
        const existing = await fetchWallet();
        if (existing) return existing;
      }
      throw error;
    }
    
    return dbToWallet(data as DBWallet);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      throw new Error('banks table does not exist. Please run the SQL schema in Supabase.');
    }
    throw err;
  }
};

// Update wallet balance
export const updateWalletBalance = async (newBalance: number): Promise<CashWallet> => {
  try {
    // First, check if wallet exists
    let wallet = await fetchWallet();
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      return await createWallet(newBalance);
    }
    
    // Update wallet balance
    const { data, error } = await supabase
      .from('banks')
      .update({ 
        total: newBalance,
        updated: new Date().toISOString()
      })
      .eq('bank_name', 'Cash Wallet')
      .select()
      .single();
    
    if (error) throw error;
    
    return dbToWallet(data as DBWallet);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      throw new Error('banks table does not exist. Please run the SQL schema in Supabase.');
    }
    throw err;
  }
};

// Add amount to wallet balance
export const addToWalletBalance = async (amount: number): Promise<CashWallet> => {
  try {
    const currentBalance = await getWalletBalance();
    const newBalance = currentBalance + amount;
    return await updateWalletBalance(newBalance);
  } catch (err) {
    console.error('Failed to add to wallet balance:', err);
    throw err;
  }
};

// Subtract amount from wallet balance
export const subtractFromWalletBalance = async (amount: number): Promise<CashWallet> => {
  try {
    const currentBalance = await getWalletBalance();
    const newBalance = Math.max(0, currentBalance - amount);
    return await updateWalletBalance(newBalance);
  } catch (err) {
    console.error('Failed to subtract from wallet balance:', err);
    throw err;
  }
};
