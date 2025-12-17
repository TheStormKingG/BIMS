import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

export interface Tip {
  id: string;
  userId: string;
  tipText: string;
  tipCategory: string | null;
  generatedAt: string;
  readAt: string | null;
}

export interface UserPreferences {
  id: string;
  userId: string;
  tipsFrequency: 'daily' | 'weekly' | 'monthly' | 'off';
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch user preferences (or create default if none exists)
 */
export const getUserPreferences = async (): Promise<UserPreferences> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Try to fetch existing preferences
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // If no preferences exist, create default
    if (error.code === 'PGRST116') {
      const { data: newPrefs, error: insertError } = await supabase
        .from('user_preferences')
        .insert([{ user_id: user.id, tips_frequency: 'weekly' }])
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        id: newPrefs.id,
        userId: newPrefs.user_id,
        tipsFrequency: newPrefs.tips_frequency as 'daily' | 'weekly' | 'monthly' | 'off',
        createdAt: newPrefs.created_at,
        updatedAt: newPrefs.updated_at,
      };
    }
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    tipsFrequency: data.tips_frequency as 'daily' | 'weekly' | 'monthly' | 'off',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (tipsFrequency: 'daily' | 'weekly' | 'monthly' | 'off'): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_preferences')
    .update({ tips_frequency: tipsFrequency })
    .eq('user_id', user.id);

  if (error) throw error;
};

/**
 * Fetch unread tips for the user
 */
export const fetchUnreadTips = async (limit: number = 5): Promise<Tip[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    tipText: item.tip_text,
    tipCategory: item.tip_category,
    generatedAt: item.generated_at,
    readAt: item.read_at,
  }));
};

/**
 * Fetch all tips for the user (including read ones)
 */
export const fetchAllTips = async (limit: number = 20): Promise<Tip[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    tipText: item.tip_text,
    tipCategory: item.tip_category,
    generatedAt: item.generated_at,
    readAt: item.read_at,
  }));
};

/**
 * Create a new tip
 */
export const createTip = async (tipText: string, tipCategory?: string): Promise<Tip> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('tips')
    .insert([{
      user_id: user.id,
      tip_text: tipText,
      tip_category: tipCategory || null,
      generated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    tipText: data.tip_text,
    tipCategory: data.tip_category,
    generatedAt: data.generated_at,
    readAt: data.read_at,
  };
};

/**
 * Mark a tip as read
 */
export const markTipAsRead = async (tipId: string): Promise<void> => {
  const { error } = await supabase
    .from('tips')
    .update({ read_at: new Date().toISOString() })
    .eq('id', tipId);

  if (error) throw error;
};

/**
 * Delete a tip
 */
export const deleteTip = async (tipId: string): Promise<void> => {
  const { error } = await supabase
    .from('tips')
    .delete()
    .eq('id', tipId);

  if (error) throw error;
};

