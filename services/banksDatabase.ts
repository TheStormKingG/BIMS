import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

// Database Types
export interface DBBank {
  id: string;
  bank_name: string;
  total: number;
  updated: string;
}

export interface DBFundsIn {
  id: string;
  user_id: string | null;
  destination_account_id: string; // UUID of bank or wallet
  amount: number;
  source: string;
  datetime: string;
  created_at: string;
  updated_at: string;
}

// Legacy type for backward compatibility during migration
export interface DBBankIn {
  id: string;
  destination: string; // UUID of bank
  amount: number;
  source: string;
  datetime: string;
}


// BANKS TABLE OPERATIONS

export const fetchBanks = async (): Promise<DBBank[]> => {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('updated', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []) as DBBank[];
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      return [];
    }
    throw err;
  }
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

// FUNDS_IN TABLE OPERATIONS (replaces bank_in)

export const fetchFundsInTransactions = async (accountId?: string): Promise<DBFundsIn[]> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('funds_in')
      .select('*')
      .order('datetime', { ascending: false });
    
    // Filter by user_id if user is logged in
    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.is('user_id', null);
    }
    
    if (accountId) {
      query = query.eq('destination_account_id', accountId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // Try fallback to bank_in if funds_in doesn't exist yet
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        // Fallback to old bank_in table
        return await fetchBankInTransactionsLegacy(accountId);
      }
      throw error;
    }
    return (data || []) as DBFundsIn[];
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      // Fallback to old bank_in table
      return await fetchBankInTransactionsLegacy(accountId);
    }
    throw err;
  }
};

// Legacy function for backward compatibility
const fetchBankInTransactionsLegacy = async (bankId?: string): Promise<DBFundsIn[]> => {
  try {
    let query = supabase
      .from('bank_in')
      .select('*')
      .order('datetime', { ascending: false });
    
    if (bankId) {
      query = query.eq('destination', bankId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return [];
    }
    // Convert legacy format to new format
    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: null,
      destination_account_id: item.destination,
      amount: item.amount,
      source: item.source,
      datetime: item.datetime,
      created_at: item.created_at || item.datetime,
      updated_at: item.updated_at || item.datetime,
    }));
  } catch {
    return [];
  }
};

export const createFundsInTransaction = async (
  destinationAccountId: string,
  amount: number,
  source: string
): Promise<DBFundsIn> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Try funds_in first, fallback to bank_in if it doesn't exist
  let data, error;
  
  try {
    const result = await supabase
      .from('funds_in')
      .insert([{
        user_id: user?.id || null,
        destination_account_id: destinationAccountId,
        amount: amount,
        source: source,
        datetime: new Date().toISOString()
      }])
      .select()
      .single();
    
    data = result.data;
    error = result.error;
    
    if (error && (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist'))) {
      // Fallback to legacy bank_in
      return await createBankInTransactionLegacy(destinationAccountId, amount, source);
    }
    
    if (error) throw error;
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      // Fallback to legacy bank_in
      return await createBankInTransactionLegacy(destinationAccountId, amount, source);
    }
    throw err;
  }
  
  // Update the bank's total
  const { data: bankData, error: bankError } = await supabase
    .from('banks')
    .select('bank_name, total')
    .eq('id', destinationAccountId)
    .single();
  
  if (!bankError && bankData) {
    await supabase
      .from('banks')
      .update({ 
        total: Number(bankData.total) + amount,
        updated: new Date().toISOString()
      })
      .eq('id', destinationAccountId);
  }
  
  return data as DBFundsIn;
};

// Legacy function for backward compatibility
const createBankInTransactionLegacy = async (
  destinationBankId: string,
  amount: number,
  source: string
): Promise<DBFundsIn> => {
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
  
  // Convert to new format
  return {
    id: data.id,
    user_id: null,
    destination_account_id: data.destination,
    amount: data.amount,
    source: data.source,
    datetime: data.datetime,
    created_at: data.created_at || data.datetime,
    updated_at: data.updated_at || data.datetime,
  };
};

// Legacy exports for backward compatibility
export const fetchBankInTransactions = fetchFundsInTransactions;
export const createBankInTransaction = createFundsInTransaction;


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

