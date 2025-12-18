import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

export interface Receipt {
  id: string;
  userId: string;
  spentTableId: string;
  storagePath: string;
  merchant: string | null;
  total: number | null;
  currency: string;
  scannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptInput {
  spentTableId: string;
  storagePath: string;
  merchant?: string;
  total?: number;
  currency?: string;
  scannedAt?: string;
}

/**
 * Create a receipt record
 */
export const createReceipt = async (input: CreateReceiptInput): Promise<Receipt> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error('Auth error in createReceipt:', authError);
    throw new Error('Failed to get user: ' + authError.message);
  }
  if (!user) {
    console.error('No user found in createReceipt');
    throw new Error('User not authenticated');
  }

  console.log('Creating receipt record:', { userId: user.id, spentTableId: input.spentTableId, storagePath: input.storagePath });

  const { data, error } = await supabase
    .from('receipts')
    .insert([{
      user_id: user.id,
      spent_table_id: input.spentTableId,
      storage_path: input.storagePath,
      merchant: input.merchant || null,
      total: input.total || null,
      currency: input.currency || 'GYD',
      scanned_at: input.scannedAt || new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating receipt record:', error);
    console.error('Error details:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw error;
  }
  
  console.log('Receipt record created successfully:', data);

  return {
    id: data.id,
    userId: data.user_id,
    spentTableId: data.spent_table_id,
    storagePath: data.storage_path,
    merchant: data.merchant,
    total: data.total ? Number(data.total) : null,
    currency: data.currency,
    scannedAt: data.scanned_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Get receipt by ID
 */
export const getReceipt = async (id: string): Promise<Receipt | null> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    spentTableId: data.spent_table_id,
    storagePath: data.storage_path,
    merchant: data.merchant,
    total: data.total ? Number(data.total) : null,
    currency: data.currency,
    scannedAt: data.scanned_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Get receipt by spent_table_id
 */
export const getReceiptBySpentTableId = async (spentTableId: string): Promise<Receipt | null> => {
  // Use maybeSingle() to handle 0 or 1 rows gracefully
  // Order by created_at descending and limit to 1 in case duplicates exist
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('spent_table_id', spentTableId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // maybeSingle() shouldn't throw PGRST116, but handle other errors
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    spentTableId: data.spent_table_id,
    storagePath: data.storage_path,
    merchant: data.merchant,
    total: data.total ? Number(data.total) : null,
    currency: data.currency,
    scannedAt: data.scanned_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Get all receipts for current user
 */
export const getReceipts = async (): Promise<Receipt[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    spentTableId: item.spent_table_id,
    storagePath: item.storage_path,
    merchant: item.merchant,
    total: item.total ? Number(item.total) : null,
    currency: item.currency,
    scannedAt: item.scanned_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
};

/**
 * Delete a receipt (and optionally its storage file)
 */
export const deleteReceipt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

