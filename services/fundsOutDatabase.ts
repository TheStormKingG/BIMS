import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

// Database Types
export interface DBFundsOut {
  id: string;
  source_account_id: string;
  source_account_type: 'BANK' | 'CASH_WALLET';
  source_account_name: string;
  amount: number;
  transaction_datetime: string;
  spent_table_id: string | null;
  source: 'SCAN_RECEIPT' | 'MANUAL' | 'IMPORT_EMAIL' | 'IMPORT_SMS';
  created_at: string;
}

export interface FundsOutInput {
  source_account_id: string;
  source_account_type: 'BANK' | 'CASH_WALLET';
  source_account_name: string;
  amount: number;
  transaction_datetime: string;
  spent_table_id?: string | null;
  source: 'SCAN_RECEIPT' | 'MANUAL' | 'IMPORT_EMAIL' | 'IMPORT_SMS';
}

// FUNDS_OUT TABLE OPERATIONS

export const addFundsOut = async (fundsOut: FundsOutInput): Promise<DBFundsOut> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('funds_out')
      .insert([{
        source_account_id: fundsOut.source_account_id,
        source_account_type: fundsOut.source_account_type,
        source_account_name: fundsOut.source_account_name,
        amount: fundsOut.amount,
        transaction_datetime: fundsOut.transaction_datetime,
        spent_table_id: fundsOut.spent_table_id || null,
        source: fundsOut.source,
        user_id: user?.id || null,
      }])
      .select()
      .single();
    
    if (error) {
      // If table doesn't exist, return gracefully
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('funds_out table does not exist yet. Please create it in Supabase.');
        // Return a mock object so the app doesn't break
        return {
          id: '',
          ...fundsOut,
          spent_table_id: fundsOut.spent_table_id || null,
          created_at: new Date().toISOString(),
        } as DBFundsOut;
      }
      throw error;
    }
    
    return data as DBFundsOut;
  } catch (err) {
    console.error('Error adding funds_out:', err);
    throw err;
  }
};

export const fetchFundsOut = async (): Promise<DBFundsOut[]> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('funds_out')
      .select('*')
      .order('transaction_datetime', { ascending: false });
    
    // Filter by user_id if user is logged in
    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []) as DBFundsOut[];
  } catch (err) {
    console.error('Error fetching funds_out:', err);
    return [];
  }
};

export const fetchFundsOutByAccount = async (
  accountId: string,
  accountType: 'BANK' | 'CASH_WALLET'
): Promise<DBFundsOut[]> => {
  try {
    const { data, error } = await supabase
      .from('funds_out')
      .select('*')
      .eq('source_account_id', accountId)
      .eq('source_account_type', accountType)
      .order('transaction_datetime', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []) as DBFundsOut[];
  } catch (err) {
    console.error('Error fetching funds_out by account:', err);
    return [];
  }
};

export const updateFundsOut = async (
  id: string,
  updates: Partial<FundsOutInput>
): Promise<DBFundsOut> => {
  try {
    const { data, error } = await supabase
      .from('funds_out')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error('funds_out table does not exist');
      }
      throw error;
    }
    
    return data as DBFundsOut;
  } catch (err) {
    console.error('Error updating funds_out:', err);
    throw err;
  }
};

export const updateFundsOutBySpentTableId = async (
  spentTableId: string,
  updates: Partial<FundsOutInput>
): Promise<DBFundsOut | null> => {
  try {
    const { data, error } = await supabase
      .from('funds_out')
      .update(updates)
      .eq('spent_table_id', spentTableId)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return null;
      }
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }
    
    return data as DBFundsOut;
  } catch (err) {
    console.error('Error updating funds_out by spent_table_id:', err);
    return null;
  }
};

