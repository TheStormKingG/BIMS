import { getSupabase } from './supabaseClient';
import { Transaction } from '../types';

const supabase = getSupabase();

// Database type for transactions
export interface DBTransaction {
  id: string;
  date: string;
  merchant: string;
  total_amount: number;
  items: any[];
  account_id: string | null;
  source: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch all transactions
export const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map((txn: DBTransaction) => ({
    id: txn.id,
    date: txn.date,
    merchant: txn.merchant,
    totalAmount: Number(txn.total_amount),
    items: txn.items || [],
    accountId: txn.account_id || '',
    source: txn.source as Transaction['source']
  }));
};

// Create a new transaction
export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const dbTransaction: Partial<DBTransaction> = {
    date: transaction.date,
    merchant: transaction.merchant,
    total_amount: transaction.totalAmount,
    items: transaction.items,
    account_id: transaction.accountId || null,
    source: transaction.source
  };
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([dbTransaction])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    date: data.date,
    merchant: data.merchant,
    totalAmount: Number(data.total_amount),
    items: data.items,
    accountId: data.account_id || '',
    source: data.source as Transaction['source']
  };
};

// Update a transaction
export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<void> => {
  const dbUpdates: Partial<DBTransaction> = {};
  if (updates.date) dbUpdates.date = updates.date;
  if (updates.merchant) dbUpdates.merchant = updates.merchant;
  if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
  if (updates.items) dbUpdates.items = updates.items;
  if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId || null;
  if (updates.source) dbUpdates.source = updates.source;
  
  const { error } = await supabase
    .from('transactions')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) throw error;
};

// Delete a transaction
export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

