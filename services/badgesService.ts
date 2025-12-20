import { getSupabase } from './supabaseClient';
import { Badge, UserBadge } from './goalsService';

const supabaseClient = getSupabase();

/**
 * Get all badges with their associated goal IDs
 */
export const getBadgesWithGoals = async (): Promise<Badge[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('badges')
      .select('*')
      .order('badge_id');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching badges:', error);
    throw error;
  }
};

/**
 * Get user badges with goal IDs
 */
export const getUserBadgesWithGoals = async (userId: string): Promise<Array<UserBadge & { goal_id: number }>> => {
  try {
    const { data, error } = await supabaseClient
      .from('user_badges')
      .select(`
        *,
        badges!inner(goal_id)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    // Transform the data to flatten the structure
    return (data || []).map(item => ({
      ...item,
      goal_id: (item.badges as any).goal_id,
    }));
  } catch (error) {
    console.error('Error fetching user badges with goals:', error);
    throw error;
  }
};

