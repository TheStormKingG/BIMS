import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

export interface Celebration {
  id: number;
  user_id: string;
  goal_id: number;
  badge_id: number;
  message: string;
  created_at: string;
  shown_at: string | null;
}

/**
 * Get pending celebrations for the current user
 */
export const getPendingCelebrations = async (): Promise<Celebration[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_celebrations')
      .select('*')
      .eq('user_id', user.id)
      .is('shown_at', null)
      .order('created_at', { ascending: false })
      .limit(1); // Only show the most recent one at a time

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending celebrations:', error);
    return [];
  }
};

/**
 * Mark a celebration as shown
 */
export const markCelebrationShown = async (celebrationId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_celebrations')
      .update({ shown_at: new Date().toISOString() })
      .eq('id', celebrationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking celebration as shown:', error);
    throw error;
  }
};

