import { getSupabase } from './supabaseClient';
import { EventType } from './eventService';
import { SystemGoal, UserGoalProgress, CompletionCriteria } from './goalsService';
import { issueCredential } from './credentialService';

const supabase = getSupabase();

/**
 * Goal Engine - Evaluates goals based on events and updates progress
 */
export class GoalEngine {
  /**
   * Process an event and update relevant goals
   */
  static async processEvent(userId: string, eventType: EventType, metadata: Record<string, any> = {}): Promise<void> {
    try {
      // Find all goals that might be affected by this event type
      const { data: goals, error: goalsError } = await supabase
        .from('system_goals')
        .select('*')
        .order('id');

      if (goalsError) throw goalsError;

      // Filter goals that match this event type
      const relevantGoals = (goals || []).filter(goal => {
        const criteria = goal.completion_criteria as CompletionCriteria;
        return criteria.event_type === this.mapEventTypeToCriteria(eventType);
      });

      // Evaluate each relevant goal
      for (const goal of relevantGoals) {
        await this.evaluateGoal(userId, goal, eventType, metadata);
      }
    } catch (error) {
      console.error('Error processing event in goal engine:', error);
      throw error;
    }
  }

  /**
   * Map frontend event types to goal criteria event types
   */
  static mapEventTypeToCriteria(eventType: EventType): string {
    const mapping: Record<EventType, string> = {
      'VIEW_OVERVIEW': 'overview_viewed',
      'ADD_ACCOUNT': 'account_added',
      'VIEW_UPLOAD': 'upload_viewed',
      'AI_CHAT_MESSAGE_SENT': 'ai_chat_used',
      'GOAL_CREATED': 'goal_created',
      'RECEIPT_SCANNED': 'receipt_scanned',
      'MANUAL_SPEND_ADDED': 'transaction_added_manual',
      'TIP_VIEWED': 'tip_viewed',
      'EXPORT_PDF': 'report_exported',
      'EXPORT_CSV': 'report_exported',
      'EXPORT_EXCEL': 'report_exported',
      'TRANSACTION_CATEGORIZED': 'transaction_categorized',
      'CASH_WALLET_FUNDS_ADDED': 'cash_wallet_funds_added',
      'SPENDING_SEARCHED': 'spending_searched',
      'LOGIN': 'overview_viewed', // Login might trigger overview view
    };
    return mapping[eventType] || eventType.toLowerCase();
  }

  /**
   * Evaluate a single goal and update progress
   */
  private static async evaluateGoal(
    userId: string,
    goal: SystemGoal,
    eventType: EventType,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Get current progress
      const { data: progress, error: progressError } = await supabase
        .from('user_goal_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('goal_id', goal.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      // Skip if already completed
      if (progress && progress.is_completed) {
        return;
      }

      // Evaluate criteria
      const evaluation = await this.evaluateCriteria(userId, goal.completion_criteria as CompletionCriteria, metadata);

      // Update progress
      const progressJson = progress?.progress_json || {};
      const updatedProgressJson = {
        ...progressJson,
        ...evaluation.progressData,
      };

      const isCompleted = evaluation.isCompleted || evaluation.progressValue >= goal.completion_criteria.threshold;

      if (isCompleted && (!progress || !progress.is_completed)) {
        // Goal just completed!
        await this.completeGoal(userId, goal.id, goal.badge_name);
      } else {
        // Update progress
        await supabase
          .from('user_goal_progress')
          .upsert({
            user_id: userId,
            goal_id: goal.id,
            progress_value: evaluation.progressValue,
            progress_percentage: evaluation.progressPercentage,
            is_completed: false,
            status: 'ACTIVE',
            progress_json: updatedProgressJson,
            last_updated: new Date().toISOString(),
          }, { onConflict: 'user_id,goal_id' });
      }
    } catch (error) {
      console.error(`Error evaluating goal ${goal.id}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate completion criteria and return progress
   */
  private static async evaluateCriteria(
    userId: string,
    criteria: CompletionCriteria,
    metadata: Record<string, any>
  ): Promise<{
    progressValue: number;
    progressPercentage: number;
    isCompleted: boolean;
    progressData: Record<string, any>;
  }> {
    const { event_type, threshold, time_window, streak_type, comparison } = criteria;

    // Get event count from user_events
    // The event_type in criteria matches the stored event_type in user_events
    // But we need to map from the EventType enum to the actual string stored
    const storedEventType = event_type; // This is the criteria event_type (e.g., "overview_viewed")
    
    let query = supabase
      .from('user_events')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', userId)
      .eq('event_type', storedEventType);

    // Apply time window if specified
    if (time_window) {
      const dateLimit = this.getDateLimit(time_window);
      query = query.gte('occurred_at', dateLimit);
    }

    const { count, error } = await query;

    if (error) throw error;

    const progressValue = count || 0;
    const progressPercentage = Math.min(100, Math.round((progressValue / threshold) * 100));
    const isCompleted = progressValue >= threshold;

    return {
      progressValue,
      progressPercentage,
      isCompleted,
      progressData: {
        count: progressValue,
        last_updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Complete a goal, award badge, and create celebration
   */
  private static async completeGoal(userId: string, goalId: number, badgeName: string): Promise<void> {
    try {
      // Get badge ID
      const { data: badge, error: badgeError } = await supabase
        .from('badges')
        .select('badge_id')
        .eq('goal_id', goalId)
        .single();

      if (badgeError) throw badgeError;

      // Check if badge already awarded (idempotency)
      const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badge.badge_id)
        .single();

      if (!existingBadge) {
        // Award badge
        const { error: awardError } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.badge_id,
          });

        if (awardError) throw awardError;
      }

      // Check if celebration already exists (idempotency)
      const { data: existingCelebration } = await supabase
        .from('user_celebrations')
        .select('id')
        .eq('user_id', userId)
        .eq('goal_id', goalId)
        .single();

      if (!existingCelebration) {
        // Get goal and badge details for message and credential
        const { data: goalData, error: goalDataError } = await supabase
          .from('system_goals')
          .select('title, description')
          .eq('id', goalId)
          .single();

        if (goalDataError) throw goalDataError;

        // Get badge description
        const { data: badgeData, error: badgeDataError } = await supabase
          .from('badges')
          .select('badge_description')
          .eq('badge_id', badge.badge_id)
          .single();

        if (badgeDataError) throw badgeDataError;

        // Get user profile for recipient display name
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const recipientDisplayName = user.user_metadata?.full_name 
          || user.user_metadata?.display_name 
          || user.email?.split('@')[0] 
          || 'User';

        // Issue credential (creates shareable/verifiable certificate)
        // CRITICAL: All badges must have credentials to be shareable
        try {
          const credential = await issueCredential(
            userId,
            goalId,
            badgeName,
            badgeData.badge_description || badgeName,
            goalData.title,
            goalData.description || goalData.title,
            recipientDisplayName,
            undefined // badgeLevel (optional)
          );
          console.log(`✓ Credential issued for goal ${goalId} (${goalData.title}): ${credential.credential_number}`);
        } catch (credentialError: any) {
          // Log detailed error prominently - credential creation is critical for shareable badges
          console.error(`⚠️ CRITICAL: Failed to issue credential for goal ${goalId} (${goalData.title})`);
          console.error('Credential error details:', {
            message: credentialError?.message,
            code: credentialError?.code,
            details: credentialError?.details,
            hint: credentialError?.hint,
            stack: credentialError?.stack,
          });
          // Log a warning that the badge won't be shareable until credential is created
          console.warn(`⚠️ Badge "${badgeName}" for goal "${goalData.title}" will not be shareable until credential is created. Use "Fix Missing Credentials" button to create it.`);
          // Continue with goal completion - the fixMissingCredentials function can create it later
          // We don't throw here to allow goal completion, but we log prominently so issues are visible
        }

        // Create celebration
        const { error: celebrationError } = await supabase
          .from('user_celebrations')
          .insert({
            user_id: userId,
            goal_id: goalId,
            badge_id: badge.badge_id,
            message: `Congratulations! You completed "${goalData?.title || 'your goal'}" and earned the "${badgeName}" badge.`,
          });

        if (celebrationError) throw celebrationError;
      }

      // Update goal progress to completed
      await supabase
        .from('user_goal_progress')
        .update({
          is_completed: true,
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
        })
        .eq('user_id', userId)
        .eq('goal_id', goalId);
    } catch (error) {
      console.error('Error completing goal:', error);
      throw error;
    }
  }

  /**
   * Get date limit based on time window string
   */
  private static getDateLimit(timeWindow: string): string {
    const now = new Date();
    let daysBack = 0;

    switch (timeWindow) {
      case '1_day':
        daysBack = 1;
        break;
      case '3_days':
        daysBack = 3;
        break;
      case '7_days':
        daysBack = 7;
        break;
      case '14_days':
        daysBack = 14;
        break;
      case '21_days':
        daysBack = 21;
        break;
      case '28_days':
        daysBack = 28;
        break;
      case '30_days':
        daysBack = 30;
        break;
      case '60_days':
        daysBack = 60;
        break;
      case '90_days':
        daysBack = 90;
        break;
      case '100_days':
        daysBack = 100;
        break;
      default:
        daysBack = 0;
    }

    const dateLimit = new Date(now);
    dateLimit.setDate(dateLimit.getDate() - daysBack);
    return dateLimit.toISOString();
  }
}

