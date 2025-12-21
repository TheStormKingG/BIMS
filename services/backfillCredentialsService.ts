import { getSupabase } from './supabaseClient';
import { issueCredential } from './credentialService';

const supabase = getSupabase();

interface BadgeNeedingCredential {
  user_id: string;
  goal_id: number;
  badge_id: number;
  badge_name: string;
  badge_description: string;
  goal_title: string;
  goal_description: string;
  earned_at: string;
  user_email: string;
  user_display_name: string;
}

/**
 * Backfill credentials for badges that were earned before the credentials system existed
 * This should be called once after the credentials system is deployed
 */
export async function backfillMissingCredentials(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to backfill credentials');
    }

    // Get all badges that need credentials (using RPC function)
    const { data: badgesNeedingCreds, error: rpcError } = await supabase.rpc(
      'get_badges_needing_credentials'
    );

    if (rpcError) {
      console.error('Error fetching badges needing credentials:', rpcError);
      throw rpcError;
    }

    if (!badgesNeedingCreds || badgesNeedingCreds.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each badge that needs a credential
    for (const badge of badgesNeedingCreds as BadgeNeedingCredential[]) {
      try {
        // Check if credential already exists (race condition protection)
        const { data: existing } = await supabase
          .from('badge_credentials')
          .select('id')
          .eq('user_id', badge.user_id)
          .eq('goal_id', badge.goal_id)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        if (existing) {
          // Already exists, skip
          continue;
        }

        // Issue credential with proper signature
        await issueCredential(
          badge.user_id,
          badge.goal_id,
          badge.badge_name,
          badge.badge_description,
          badge.goal_title,
          badge.goal_description || badge.goal_title,
          badge.user_display_name || badge.user_email.split('@')[0]
        );

        results.success++;
      } catch (error: any) {
        console.error(`Error backfilling credential for user ${badge.user_id}, goal ${badge.goal_id}:`, error);
        results.failed++;
        results.errors.push(
          `Goal ${badge.goal_id} (${badge.goal_title}): ${error.message || 'Unknown error'}`
        );
      }
    }

    console.log(`Backfill complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  } catch (error: any) {
    console.error('Error in backfillMissingCredentials:', error);
    throw error;
  }
}

/**
 * Check if there are any badges needing credentials
 */
export async function checkForMissingCredentials(): Promise<number> {
  try {
    const { data: badgesNeedingCreds, error } = await supabase.rpc(
      'get_badges_needing_credentials'
    );

    if (error) {
      console.error('Error checking for missing credentials:', error);
      return 0;
    }

    return badgesNeedingCreds?.length || 0;
  } catch (error) {
    console.error('Error in checkForMissingCredentials:', error);
    return 0;
  }
}

