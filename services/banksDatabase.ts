import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

// Database Types
export interface DBBank {
  id: string;
  bank_name: string;
  total: number;
  updated: string;
}

export interface DBBankIn {
  id: string;
  destination: string; // UUID of bank
  amount: number;
  source: string;
  datetime: string;
}

export interface DBWalletIn {
  id: string;
  source: string;
  total: number;
  note_5000: number;
  note_2000: number;
  note_1000: number;
  note_500: number;
  note_100: number;
  note_50: number;
  note_20: number;
  datetime: string;
}

// BANKS TABLE OPERATIONS

export const fetchBanks = async (): Promise<DBBank[]> => {
  const { data, error } = await supabase
    .from('banks')
    .select('*')
    .order('updated', { ascending: false });
  
  if (error) throw error;
  return (data || []) as DBBank[];
};

export const createBank = async (bankName: string, initialTotal: number = 0): Promise<DBBank> => {
  const { data, error } = await supabase
    .from('banks')
    .insert([{ bank_name: bankName, total: initialTotal }])
    .select()
    .single();
  
  if (error) throw error;
  return data as DBBank;
};

export const updateBank = async (id: string, bankName: string, total: number): Promise<void> => {
  const { error } = await supabase
    .from('banks')
    .update({ 
      bank_name: bankName, 
      total: total,
      updated: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteBank = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('banks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// BANK_IN TABLE OPERATIONS

export const fetchBankInTransactions = async (bankId?: string): Promise<DBBankIn[]> => {
  let query = supabase
    .from('bank_in')
    .select('*')
    .order('datetime', { ascending: false });
  
  if (bankId) {
    query = query.eq('destination', bankId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as DBBankIn[];
};

export const createBankInTransaction = async (
  destinationBankId: string,
  amount: number,
  source: string
): Promise<DBBankIn> => {
  const { data, error } = await supabase
    .from('bank_in')
    .insert([{
      destination: destinationBankId,
      amount: amount,
      source: source
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  // Update the bank's total
  const { data: bankData, error: bankError } = await supabase
    .from('banks')
    .select('bank_name, total')
    .eq('id', destinationBankId)
    .single();
  
  if (!bankError && bankData) {
    await supabase
      .from('banks')
      .update({ 
        total: Number(bankData.total) + amount,
        updated: new Date().toISOString()
      })
      .eq('id', destinationBankId);
  }
  
  return data as DBBankIn;
};

// WALLET_IN TABLE OPERATIONS

export const fetchWalletInTransactions = async (): Promise<DBWalletIn[]> => {
  const { data, error } = await supabase
    .from('wallet_in')
    .select('*')
    .order('datetime', { ascending: false });
  
  if (error) throw error;
  return (data || []) as DBWalletIn[];
};

export const createWalletInTransaction = async (
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
): Promise<DBWalletIn> => {
  // Calculate total from denominations
  const total = 
    (denominations[5000] || 0) * 5000 +
    (denominations[2000] || 0) * 2000 +
    (denominations[1000] || 0) * 1000 +
    (denominations[500] || 0) * 500 +
    (denominations[100] || 0) * 100 +
    (denominations[50] || 0) * 50 +
    (denominations[20] || 0) * 20;
  
  const { data, error } = await supabase
    .from('wallet_in')
    .insert([{
      source: source,
      total: total,
      note_5000: denominations[5000] || 0,
      note_2000: denominations[2000] || 0,
      note_1000: denominations[1000] || 0,
      note_500: denominations[500] || 0,
      note_100: denominations[100] || 0,
      note_50: denominations[50] || 0,
      note_20: denominations[20] || 0,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data as DBWalletIn;
};

// SUMMARY / ANALYTICS

export const getBankSummary = async () => {
  const banks = await fetchBanks();
  const totalInBanks = banks.reduce((sum, bank) => sum + Number(bank.total), 0);
  
  return {
    banks,
    totalBanks: banks.length,
    totalInBanks
  };
};

export const getRecentActivity = async (limit: number = 10) => {
  const [bankIns, walletIns] = await Promise.all([
    fetchBankInTransactions(),
    fetchWalletInTransactions()
  ]);
  
  // Combine and sort by datetime
  const allActivity = [
    ...bankIns.map(t => ({ ...t, type: 'bank_in' as const })),
    ...walletIns.map(t => ({ ...t, type: 'wallet_in' as const }))
  ].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
   .slice(0, limit);
  
  return allActivity;
};

