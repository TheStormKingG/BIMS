import { getSupabase } from './supabaseClient';
import { CashWallet, CashDenominations } from '../types';

const supabase = getSupabase();

// Database type for wallet snapshots
export interface DBWalletSnapshot {
  id: string;
  note_5000: number;
  note_2000: number;
  note_1000: number;
  note_500: number;
  note_100: number;
  note_50: number;
  note_20: number;
  created_at: string;
}

// Convert database row to app format
const dbToWallet = (snapshot: DBWalletSnapshot): CashWallet => {
  return {
    id: snapshot.id,
    type: 'CASH_WALLET',
    denominations: {
      5000: snapshot.note_5000,
      2000: snapshot.note_2000,
      1000: snapshot.note_1000,
      500: snapshot.note_500,
      100: snapshot.note_100,
      50: snapshot.note_50,
      20: snapshot.note_20,
    }
  };
};

// Convert app format to database row
const walletToDb = (denominations: CashDenominations): Partial<DBWalletSnapshot> => {
  return {
    note_5000: denominations[5000] || 0,
    note_2000: denominations[2000] || 0,
    note_1000: denominations[1000] || 0,
    note_500: denominations[500] || 0,
    note_100: denominations[100] || 0,
    note_50: denominations[50] || 0,
    note_20: denominations[20] || 0,
  };
};

// Fetch the latest wallet snapshot
export const fetchLatestWallet = async (): Promise<CashWallet | null> => {
  try {
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      // PGRST116 = No rows found
      // PGRST202 = Table not found
      if (error.code === 'PGRST116') {
        // No rows found - return null
        return null;
      }
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        // Table doesn't exist - return null so we can create it
        console.warn('wallet_snapshots table does not exist yet');
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    return dbToWallet(data as DBWalletSnapshot);
  } catch (err: any) {
    // Handle any other errors
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      console.warn('wallet_snapshots table does not exist yet');
      return null;
    }
    throw err;
  }
};

// Fetch wallet history (for analytics/tracking over time)
export const fetchWalletHistory = async (limit: number = 30): Promise<DBWalletSnapshot[]> => {
  const { data, error } = await supabase
    .from('wallet_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return (data || []) as DBWalletSnapshot[];
};

// Create a new wallet snapshot
export const createWalletSnapshot = async (denominations: CashDenominations): Promise<CashWallet> => {
  const dbData = walletToDb(denominations);
  
  try {
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .insert([dbData])
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error('wallet_snapshots table does not exist. Please run the SQL schema in Supabase.');
      }
      throw error;
    }
    
    return dbToWallet(data as DBWalletSnapshot);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      throw new Error('wallet_snapshots table does not exist. Please run the SQL schema in Supabase.');
    }
    throw err;
  }
};

// Update wallet (creates a new snapshot with current timestamp)
export const updateWallet = async (denominations: CashDenominations): Promise<CashWallet> => {
  // Instead of updating, we create a new snapshot (keeps history)
  return createWalletSnapshot(denominations);
};

// Calculate total from denominations
export const calculateTotal = (denominations: CashDenominations): number => {
  return Object.entries(denominations).reduce(
    (sum, [denom, count]) => sum + Number(denom) * Number(count),
    0
  );
};

// Get wallet summary with total
export const getWalletWithTotal = async () => {
  const wallet = await fetchLatestWallet();
  if (!wallet) return null;
  
  const total = calculateTotal(wallet.denominations);
  
  return {
    wallet,
    total,
    lastUpdated: wallet.id // The ID contains timestamp info
  };
};


