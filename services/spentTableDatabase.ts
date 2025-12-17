import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

// Database type for spent_table
export interface DBSpentItem {
  id: string;
  transaction_datetime: string;
  category: string;
  item: string;
  item_cost: number;
  item_qty: number;
  item_total: number;
  payment_method: string | null;
  source: string;
  entry_date: string;
  created_at?: string;
  updated_at?: string;
}

// App type for spent items
export interface SpentItem {
  id: string;
  transactionDateTime: string;
  category: string;
  item: string;
  itemCost: number;
  itemQty: number;
  itemTotal: number;
  paymentMethod: string | null;
  source: string;
  entryDate: string;
}

// Convert database row to app format
const dbToSpentItem = (row: DBSpentItem): SpentItem => {
  return {
    id: row.id,
    transactionDateTime: row.transaction_datetime,
    category: row.category,
    item: row.item,
    itemCost: Number(row.item_cost),
    itemQty: Number(row.item_qty),
    itemTotal: Number(row.item_total),
    paymentMethod: row.payment_method,
    source: row.source,
    entryDate: row.entry_date || row.created_at || new Date().toISOString(),
  };
};

// Convert app format to database row
const spentItemToDb = (item: Omit<SpentItem, 'id' | 'entryDate'>): Partial<DBSpentItem> => {
  const dbItem = {
    transaction_datetime: item.transactionDateTime,
    category: item.category || 'Other',
    item: item.item || 'Unknown',
    item_cost: Number(item.itemCost) || 0,
    item_qty: Number(item.itemQty) || 1,
    item_total: Number(item.itemTotal) || 0,
    payment_method: item.paymentMethod || null,
    source: item.source || 'MANUAL',
  };
  return dbItem;
};

// Fetch all spent items
export const fetchSpentItems = async (): Promise<SpentItem[]> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('spent_table')
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
        // Table doesn't exist - return empty array
        return [];
      }
      throw error;
    }
    
    return (data || []).map(dbToSpentItem);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      return [];
    }
    throw err;
  }
};

// Fetch spent items for current month
export const fetchCurrentMonthSpentItems = async (): Promise<SpentItem[]> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    let query = supabase
      .from('spent_table')
      .select('*')
      .gte('transaction_datetime', firstDay.toISOString())
      .lte('transaction_datetime', lastDay.toISOString())
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
        // Table doesn't exist - return empty array
        return [];
      }
      throw error;
    }
    
    return (data || []).map(dbToSpentItem);
  } catch (err: any) {
    if (err?.code === 'PGRST202' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
      return [];
    }
    throw err;
  }
};

// Create a new spent item
export const createSpentItem = async (item: Omit<SpentItem, 'id' | 'entryDate'>): Promise<SpentItem> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  const dbData = spentItemToDb(item);
  
  const { data, error } = await supabase
    .from('spent_table')
    .insert([{ ...dbData, user_id: user?.id || null }])
    .select()
    .single();
  
  if (error) throw error;
  
  return dbToSpentItem(data as DBSpentItem);
};

// Create multiple spent items (for transactions with multiple line items)
export const createSpentItems = async (items: Omit<SpentItem, 'id' | 'entryDate'>[]): Promise<SpentItem[]> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error in createSpentItems:', authError);
      throw new Error('Failed to get user: ' + authError.message);
    }
    
    console.log('Creating spent items, user:', user?.id, 'items count:', items.length);
    console.log('Items to insert:', items);
    
    const dbData = items.map(item => ({ ...spentItemToDb(item), user_id: user?.id || null }));
    console.log('DB data to insert:', dbData);
    
    const { data, error } = await supabase
      .from('spent_table')
      .insert(dbData)
      .select();
    
    if (error) {
      console.error('Supabase error inserting spent items:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Successfully inserted spent items:', data);
    return (data || []).map(dbToSpentItem);
  } catch (err) {
    console.error('Exception in createSpentItems:', err);
    throw err;
  }
};

// Update a spent item
export const updateSpentItem = async (id: string, updates: Partial<SpentItem>): Promise<void> => {
  const dbUpdates: Partial<DBSpentItem> = {};
  
  if (updates.transactionDateTime) dbUpdates.transaction_datetime = updates.transactionDateTime;
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.item) dbUpdates.item = updates.item;
  if (updates.itemCost !== undefined) dbUpdates.item_cost = updates.itemCost;
  if (updates.itemQty !== undefined) dbUpdates.item_qty = updates.itemQty;
  if (updates.itemTotal !== undefined) dbUpdates.item_total = updates.itemTotal;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.source) dbUpdates.source = updates.source;
  
  const { error } = await supabase
    .from('spent_table')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) throw error;
};

// Delete a spent item
export const deleteSpentItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('spent_table')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

