import { getSupabase } from './supabaseClient';
import { Account, BankAccount, CashWallet, Transaction } from '../types';

const supabase = getSupabase();

// Database Types matching Supabase tables
export interface DBAccount {
  id: string;
  user_id?: string;
  name: string;
  type: 'BANK' | 'CASH_WALLET';
  balance?: number;
  denominations?: Record<number, number>;
  created_at?: string;
  updated_at?: string;
}

export interface DBTransaction {
  id: string;
  user_id?: string;
  date: string;
  merchant: string;
  total_amount: number;
  items: any[];
  account_id: string;
  source: 'MANUAL' | 'SCAN_RECEIPT' | 'IMPORT_EMAIL' | 'IMPORT_SMS';
  created_at?: string;
  updated_at?: string;
}

// Accounts
export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map((acc: DBAccount) => {
    if (acc.type === 'CASH_WALLET') {
      return {
        id: acc.id,
        type: 'CASH_WALLET',
        denominations: acc.denominations || {}
      } as CashWallet;
    } else {
      return {
        id: acc.id,
        name: acc.name,
        type: 'BANK',
        balance: acc.balance || 0
      } as BankAccount;
    }
  });
};

export const createAccount = async (account: Partial<DBAccount>): Promise<Account> => {
  const { data, error } = await supabase
    .from('accounts')
    .insert([account])
    .select()
    .single();
  
  if (error) throw error;
  
  if (data.type === 'CASH_WALLET') {
    return {
      id: data.id,
      type: 'CASH_WALLET',
      denominations: data.denominations || {}
    } as CashWallet;
  } else {
    return {
      id: data.id,
      name: data.name,
      type: 'BANK',
      balance: data.balance || 0
    } as BankAccount;
  }
};

export const updateAccount = async (id: string, updates: Partial<DBAccount>): Promise<void> => {
  const { error } = await supabase
    .from('accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteAccount = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Transactions
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
    totalAmount: txn.total_amount,
    items: txn.items,
    accountId: txn.account_id,
    source: txn.source
  }));
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const dbTransaction: Partial<DBTransaction> = {
    date: transaction.date,
    merchant: transaction.merchant,
    total_amount: transaction.totalAmount,
    items: transaction.items,
    account_id: transaction.accountId,
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
    totalAmount: data.total_amount,
    items: data.items,
    accountId: data.account_id,
    source: data.source
  };
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<void> => {
  const dbUpdates: Partial<DBTransaction> = {};
  if (updates.date) dbUpdates.date = updates.date;
  if (updates.merchant) dbUpdates.merchant = updates.merchant;
  if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
  if (updates.items) dbUpdates.items = updates.items;
  if (updates.accountId) dbUpdates.account_id = updates.accountId;
  if (updates.source) dbUpdates.source = updates.source;
  
  const { error } = await supabase
    .from('transactions')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

