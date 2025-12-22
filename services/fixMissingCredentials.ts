/**
 * Utility to fix missing credentials for completed goals
 * This will create credentials for badges that were earned before the credential system was implemented
 */

import { getSupabase } from './supabaseClient';
import { issueCredential } from './credentialService';
import { getUserBadgesWithGoals } from './badgesService';

const supabase = getSupabase();

/**
 * Fix missing credentials for a specific user
 * Creates credentials for all earned badges that don't have credentials yet
 */
export const fixMissingCredentialsForUser = async (userId: string): Promise<number> => {
  try {
    console.log(`Fixing missing credentials for user ${userId}...`);

    // Get all badges earned by user
    const userBadges = await getUserBadgesWithGoals(userId);
    console.log(`User has ${userBadges.length} badges`);

    // Get all existing credentials for this user
    const { data: existingCredentials, error: credsError } = await supabase
      .from('badge_credentials')
      .select('goal_id')
      .eq('user_id', userId);

    if (credsError) throw credsError;

    const existingGoalIds = new Set(existingCredentials?.map(c => c.goal_id) || []);

    // Get all system goals to get badge names
    const { data: systemGoals, error: goalsError } = await supabase
      .from('system_goals')
      .select('id, title, description, badge_name')
      .in('id', userBadges.map(b => b.goal_id));

    if (goalsError) throw goalsError;

    // Get all badges to get badge descriptions
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('badge_id, badge_name, badge_description')
      .in('badge_id', userBadges.map(b => b.badge_id));

    if (badgesError) throw badgesError;

    const badgeMap = new Map(badges?.map(b => [b.badge_id, b]) || []);
    const goalMap = new Map(systemGoals?.map(g => [g.id, g]) || []);

    // Get user info for display name
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const recipientDisplayName = user.user_metadata?.full_name 
      || user.user_metadata?.display_name 
      || user.email?.split('@')[0] 
      || 'User';

    let createdCount = 0;
    let errorCount = 0;

    // Create credentials for missing badges
    for (const userBadge of userBadges) {
      if (existingGoalIds.has(userBadge.goal_id)) {
        console.log(`Credential already exists for goal ${userBadge.goal_id}, skipping...`);
        continue;
      }

      const goal = goalMap.get(userBadge.goal_id);
      const badge = badgeMap.get(userBadge.badge_id);

      if (!goal || !badge) {
        console.error(`Missing data for goal ${userBadge.goal_id} or badge ${userBadge.badge_id}`);
        errorCount++;
        continue;
      }

      try {
        console.log(`Creating credential for goal ${goal.id}: ${goal.title}`);
        await issueCredential(
          userId,
          goal.id,
          badge.badge_name,
          badge.badge_description,
          goal.title,
          goal.description || goal.title,
          recipientDisplayName,
          undefined
        );
        createdCount++;
        console.log(`✓ Created credential for goal ${goal.id}`);
      } catch (err) {
        console.error(`Error creating credential for goal ${goal.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Credential fix complete: ${createdCount} created, ${errorCount} errors`);
    return createdCount;
  } catch (error) {
    console.error('Error fixing missing credentials:', error);
    throw error;
  }
};

