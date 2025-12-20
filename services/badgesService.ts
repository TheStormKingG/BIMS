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
    // First get user badges
    const { data: userBadges, error: userBadgesError } = await supabaseClient
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (userBadgesError) throw userBadgesError;

    if (!userBadges || userBadges.length === 0) {
      return [];
    }

    // Get badge IDs
    const badgeIds = userBadges.map(ub => ub.badge_id);

    // Get badges with goal_id
    const { data: badges, error: badgesError } = await supabaseClient
      .from('badges')
      .select('badge_id, goal_id')
      .in('badge_id', badgeIds);

    if (badgesError) throw badgesError;

    // Create a map of badge_id to goal_id
    const badgeToGoalMap = new Map<number, number>();
    (badges || []).forEach(b => {
      badgeToGoalMap.set(b.badge_id, b.goal_id);
    });

    // Combine user badges with goal IDs
    return userBadges.map(ub => ({
      ...ub,
      goal_id: badgeToGoalMap.get(ub.badge_id) || 0,
    }));
  } catch (error) {
    console.error('Error fetching user badges with goals:', error);
    throw error;
  }
};

