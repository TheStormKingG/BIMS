import { getSupabase } from './supabaseClient';

const supabaseClient = getSupabase();

// Types for goals system
export interface SystemGoal {
  id: number;
  phase: number;
  title: string;
  description: string;
  completion_criteria: CompletionCriteria;
  badge_name: string;
  difficulty_rank: number;
  is_system_goal: boolean;
}

export interface CompletionCriteria {
  event_type: string;
  threshold: number;
  time_window?: string | null;
  streak_type?: string;
  comparison?: string;
  format?: string;
  category?: string;
  pattern?: string;
  merchant_pattern?: string;
  completeness?: number;
}

export interface UserGoalProgress {
  id: number;
  user_id: string;
  goal_id: number;
  progress_value: number;
  progress_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  last_updated: string;
}

export interface Badge {
  badge_id: number;
  badge_name: string;
  badge_description: string;
  icon_key: string;
  goal_id: number;
}

export interface UserBadge {
  id: number;
  user_id: string;
  badge_id: number;
  earned_at: string;
}

/**
 * Initialize user goals - creates progress entries for all system goals
 * Should be called when a new user is created
 */
export const initializeUserGoals = async (userId: string): Promise<void> => {
  try {
    // Get all system goals
    const { data: goals, error: goalsError } = await supabaseClient
      .from('system_goals')
      .select('id')
      .order('id');

    if (goalsError) throw goalsError;

    // Create progress entries for all goals
    const progressEntries = goals.map(goal => ({
      user_id: userId,
      goal_id: goal.id,
      progress_value: 0,
      progress_percentage: 0,
      is_completed: false,
    }));

    const { error: insertError } = await supabaseClient
      .from('user_goal_progress')
      .upsert(progressEntries, { onConflict: 'user_id,goal_id', ignoreDuplicates: true });

    if (insertError) throw insertError;
  } catch (error) {
    console.error('Error initializing user goals:', error);
    throw error;
  }
};

/**
 * Get all system goals grouped by phase
 */
export const getSystemGoalsByPhase = async (): Promise<Record<number, SystemGoal[]>> => {
  try {
    const { data, error } = await supabaseClient
      .from('system_goals')
      .select('*')
      .order('id');

    if (error) throw error;

    const goalsByPhase: Record<number, SystemGoal[]> = {};
    data.forEach(goal => {
      if (!goalsByPhase[goal.phase]) {
        goalsByPhase[goal.phase] = [];
      }
      goalsByPhase[goal.phase].push(goal);
    });

    return goalsByPhase;
  } catch (error) {
    console.error('Error fetching system goals:', error);
    throw error;
  }
};

/**
 * Get a system goal by ID
 */
export const getSystemGoalById = async (goalId: number): Promise<SystemGoal> => {
  try {
    const { data, error } = await supabaseClient
      .from('system_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Goal with id ${goalId} not found`);
    return data;
  } catch (error) {
    console.error('Error fetching system goal by ID:', error);
    throw error;
  }
};

/**
 * Get user's goal progress
 */
export const getUserGoalProgress = async (userId: string): Promise<UserGoalProgress[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('user_goal_progress')
      .select('*')
      .eq('user_id', userId)
      .order('goal_id');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user goal progress:', error);
    throw error;
  }
};

/**
 * Get user's earned badges
 */
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    throw error;
  }
};

/**
 * Get phase unlock status for a user
 * Phase unlocks when 70% of previous phase goals are completed
 * Phase 5 only unlocks after Phase 4 is complete
 */
export const getPhaseUnlockStatus = async (userId: string): Promise<Record<number, boolean>> => {
  try {
    const progress = await getUserGoalProgress(userId);
    const goalsByPhase = await getSystemGoalsByPhase();

    const unlockStatus: Record<number, boolean> = {
      1: true, // Phase 1 is always unlocked
    };

    // Calculate unlock status for phases 2-5
    for (let phase = 2; phase <= 5; phase++) {
      if (phase === 5) {
        // Phase 5 requires 100% completion of Phase 4
        const phase4Goals = goalsByPhase[4] || [];
        const phase4Completed = progress.filter(
          p => phase4Goals.some(g => g.id === p.goal_id) && p.is_completed
        ).length;
        unlockStatus[phase] = phase4Completed === phase4Goals.length;
      } else {
        // Other phases require 70% completion of previous phase
        const prevPhaseGoals = goalsByPhase[phase - 1] || [];
        const prevPhaseCompleted = progress.filter(
          p => prevPhaseGoals.some(g => g.id === p.goal_id) && p.is_completed
        ).length;
        const requiredCompleted = Math.ceil(prevPhaseGoals.length * 0.7);
        unlockStatus[phase] = prevPhaseCompleted >= requiredCompleted;
      }
    }

    return unlockStatus;
  } catch (error) {
    console.error('Error calculating phase unlock status:', error);
    throw error;
  }
};

/**
 * Award badge to user
 */
const awardBadge = async (userId: string, goalId: number): Promise<void> => {
  try {
    // Get badge for this goal
    const { data: badge, error: badgeError } = await supabaseClient
      .from('badges')
      .select('badge_id')
      .eq('goal_id', goalId)
      .single();

    if (badgeError) throw badgeError;

    // Check if badge already awarded
    const { data: existing } = await supabaseClient
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.badge_id)
      .single();

    if (existing) return; // Already awarded

    // Award badge
    const { error: awardError } = await supabaseClient
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.badge_id,
      });

    if (awardError) throw awardError;
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }
};

/**
 * Update goal progress and check for completion
 */
const updateGoalProgress = async (
  userId: string,
  goalId: number,
  progressValue: number,
  progressPercentage: number,
  isCompleted: boolean
): Promise<void> => {
  try {
    const updateData: any = {
      progress_value: progressValue,
      progress_percentage: progressPercentage,
      is_completed: isCompleted,
      last_updated: new Date().toISOString(),
    };

    if (isCompleted) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabaseClient
      .from('user_goal_progress')
      .update(updateData)
      .eq('user_id', userId)
      .eq('goal_id', goalId);

    if (error) throw error;

    // Award badge if completed
    if (isCompleted) {
      await awardBadge(userId, goalId);
    }
  } catch (error) {
    console.error('Error updating goal progress:', error);
    throw error;
  }
};

/**
 * Evaluate a goal based on event data
 * This is the core evaluation engine
 */
export const evaluateGoal = async (
  userId: string,
  goalId: number,
  eventData: Record<string, any>
): Promise<void> => {
  try {
    // Get goal details
    const { data: goal, error: goalError } = await supabaseClient
      .from('system_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) throw goalError || new Error('Goal not found');

    const criteria = goal.completion_criteria as CompletionCriteria;

    // Get current progress
    const { data: progress, error: progressError } = await supabaseClient
      .from('user_goal_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .single();

    if (progressError) throw progressError;
    if (!progress) throw new Error('Progress entry not found');

    // Skip if already completed
    if (progress.is_completed) return;

    // Evaluate based on event type and criteria
    const evaluationResult = await evaluateCriteria(userId, criteria, eventData);

    // Update progress
    await updateGoalProgress(
      userId,
      goalId,
      evaluationResult.progressValue,
      evaluationResult.progressPercentage,
      evaluationResult.isCompleted
    );

    // Special handling for Goal 50 (Stashway Legend) - check if all 49 previous goals are completed
    if (goalId === 50) {
      await checkStashwayLegend(userId);
    }
  } catch (error) {
    console.error(`Error evaluating goal ${goalId}:`, error);
    throw error;
  }
};

/**
 * Check and award Stashway Legend badge (Goal 50)
 */
const checkStashwayLegend = async (userId: string): Promise<void> => {
  try {
    const { data: completedGoals, error } = await supabaseClient
      .from('user_goal_progress')
      .select('goal_id')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .neq('goal_id', 50); // Exclude goal 50 itself

    if (error) throw error;

    if (completedGoals && completedGoals.length >= 49) {
      // All 49 previous goals are completed, mark goal 50 as complete
      await updateGoalProgress(userId, 50, 49, 100, true);
    }
  } catch (error) {
    console.error('Error checking Stashway Legend:', error);
    throw error;
  }
};

/**
 * Evaluate completion criteria based on event data
 */
const evaluateCriteria = async (
  userId: string,
  criteria: CompletionCriteria,
  eventData: Record<string, any>
): Promise<{
  progressValue: number;
  progressPercentage: number;
  isCompleted: boolean;
}> => {
  const { event_type, threshold, time_window, streak_type, comparison, format, category, pattern, merchant_pattern, completeness } = criteria;

  // Build query based on criteria
  let currentValue = 0;
  let isCompleted = false;

  switch (event_type) {
    case 'overview_viewed':
      currentValue = await countOverviewViews(userId, time_window);
      break;
    case 'account_added':
      currentValue = await countAccounts(userId);
      break;
    case 'upload_viewed':
      currentValue = await countUploadViews(userId, time_window);
      break;
    case 'ai_chat_used':
      currentValue = await countAIChatUsage(userId, time_window, pattern);
      break;
    case 'goal_created':
      currentValue = await countUserGoals(userId);
      break;
    case 'receipt_scanned':
      currentValue = await countReceiptScans(userId, time_window, merchant_pattern);
      break;
    case 'transaction_added_manual':
      currentValue = await countManualTransactions(userId, time_window);
      break;
    case 'tip_viewed':
      currentValue = await countTipViews(userId, time_window);
      break;
    case 'report_exported':
      currentValue = await countReportExports(userId, time_window, format);
      break;
    case 'transaction_categorized':
      currentValue = await countCategorizedTransactions(userId, time_window);
      break;
    case 'cash_wallet_funds_added':
      currentValue = await countCashWalletAdditions(userId, time_window);
      break;
    case 'spending_viewed':
      currentValue = await countSpendingViews(userId, time_window);
      break;
    case 'daily_target_achieved':
      currentValue = await countDailyTargetAchievements(userId, time_window, streak_type);
      break;
    case 'spending_searched':
      currentValue = await countSpendingSearches(userId, time_window);
      break;
    case 'transaction_logged':
      currentValue = await countTransactionStreak(userId, time_window, streak_type);
      break;
    case 'net_worth_threshold':
      currentValue = await checkNetWorthThreshold(userId, threshold, comparison, time_window);
      isCompleted = currentValue >= threshold;
      break;
    case 'category_spending_reduced':
      currentValue = await checkCategorySpendingReduction(userId, category, threshold, time_window, comparison);
      isCompleted = currentValue >= threshold;
      break;
    case 'categories_used':
      currentValue = await countDistinctCategories(userId, time_window);
      break;
    case 'monthly_limit_maintained':
      currentValue = await countDaysUnderMonthlyLimit(userId, threshold, time_window, comparison);
      break;
    case 'accounts_managed':
      currentValue = await countManagedAccounts(userId);
      break;
    case 'category_limits_set':
      currentValue = await countCategoryLimits(userId);
      break;
    case 'uncategorized_zero':
      currentValue = await checkUncategorizedZero(userId, time_window);
      isCompleted = currentValue === 0;
      break;
    case 'total_spending_reduced':
      currentValue = await checkTotalSpendingReduction(userId, threshold, time_window, comparison);
      isCompleted = currentValue >= threshold;
      break;
    case 'net_worth_trend':
      currentValue = await checkNetWorthTrend(userId, threshold, time_window, comparison);
      break;
    case 'total_spend_threshold':
      currentValue = await getTotalSpending(userId);
      isCompleted = currentValue >= threshold;
      break;
    case 'net_worth_increase':
      currentValue = await checkNetWorthIncrease(userId, threshold, comparison);
      isCompleted = currentValue >= threshold;
      break;
    case 'cash_tracking_complete':
      currentValue = await checkCashTrackingCompleteness(userId, time_window);
      isCompleted = currentValue >= (completeness || 100);
      break;
    case 'transactions_categorized':
      currentValue = await countTotalCategorizedTransactions(userId);
      break;
    case 'long_term_goal_achieved':
      currentValue = await countLongTermGoalAchievements(userId, threshold, time_window);
      break;
    case 'complete_logging_streak':
      currentValue = await checkCompleteLoggingStreak(userId, threshold, time_window, streak_type, completeness);
      break;
    case 'spending_reduced_vs_baseline':
      currentValue = await checkSpendingReductionVsBaseline(userId, threshold, time_window, comparison);
      isCompleted = currentValue >= threshold;
      break;
    case 'all_goals_completed':
      currentValue = await countCompletedGoals(userId);
      isCompleted = currentValue >= threshold;
      break;
    default:
      console.warn(`Unknown event type: ${event_type}`);
  }

  // Calculate progress percentage
  const progressPercentage = Math.min(100, Math.round((currentValue / threshold) * 100));
  isCompleted = isCompleted || currentValue >= threshold;

  return {
    progressValue: currentValue,
    progressPercentage,
    isCompleted,
  };
};

// Helper functions for evaluating specific criteria
// These would need to query the actual database tables

const countOverviewViews = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // This would track views in a separate table or use existing activity logs
  // For now, return a placeholder - would need implementation
  return 0;
};

const countAccounts = async (userId: string): Promise<number> => {
  const { count, error } = await supabaseClient
    .from('banks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) throw error;
  return count || 0;
};

const countUploadViews = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // Would need activity tracking table
  return 0;
};

const countAIChatUsage = async (userId: string, timeWindow: string | null | undefined, pattern?: string): Promise<number> => {
  const { count, error } = await supabaseClient
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) throw error;
  return count || 0;
};

const countUserGoals = async (userId: string): Promise<number> => {
  const { count, error } = await supabaseClient
    .from('goals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) throw error;
  return count || 0;
};

const countReceiptScans = async (userId: string, timeWindow: string | null | undefined, merchantPattern?: string): Promise<number> => {
  let query = supabaseClient
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (timeWindow) {
    const dateLimit = getDateLimit(timeWindow);
    query = query.gte('created_at', dateLimit);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const countManualTransactions = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  let query = supabaseClient
    .from('spent_table')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'MANUAL');

  if (timeWindow) {
    const dateLimit = getDateLimit(timeWindow);
    query = query.gte('created_at', dateLimit);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const countTipViews = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // Would need to track tip views in user_preferences or separate table
  return 0;
};

const countReportExports = async (userId: string, timeWindow: string | null | undefined, format?: string): Promise<number> => {
  // Would need export tracking table
  return 0;
};

const countCategorizedTransactions = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  let query = supabaseClient
    .from('spent_table')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('category', 'is', null)
    .neq('category', '');

  if (timeWindow) {
    const dateLimit = getDateLimit(timeWindow);
    query = query.gte('created_at', dateLimit);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const countCashWalletAdditions = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // Would need wallet transaction tracking
  return 0;
};

const countSpendingViews = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // Would need activity tracking
  return 0;
};

const countDailyTargetAchievements = async (userId: string, timeWindow: string | null | undefined, streakType?: string): Promise<number> => {
  // Would need goal achievement tracking
  return 0;
};

const countSpendingSearches = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // Would need activity tracking
  return 0;
};

const countTransactionStreak = async (userId: string, timeWindow: string | null | undefined, streakType?: string): Promise<number> => {
  // Calculate streak based on transaction dates
  const { data, error } = await supabaseClient
    .from('spent_table')
    .select('transaction_datetime')
    .eq('user_id', userId)
    .order('transaction_datetime', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return 0;

  // Calculate consecutive days
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < data.length; i++) {
    const date = new Date(data[i].transaction_datetime);
    date.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

const checkNetWorthThreshold = async (userId: string, threshold: number, comparison: string | undefined, timeWindow: string | null | undefined): Promise<number> => {
  // Calculate net worth from accounts and wallets
  // Would need implementation
  return 0;
};

const checkCategorySpendingReduction = async (userId: string, category: string | undefined, threshold: number, timeWindow: string | null | undefined, comparison: string | undefined): Promise<number> => {
  // Compare category spending between periods
  // Would need implementation
  return 0;
};

const countDistinctCategories = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  let query = supabaseClient
    .from('spent_table')
    .select('category')
    .eq('user_id', userId)
    .not('category', 'is', null)
    .neq('category', '');

  if (timeWindow) {
    const dateLimit = getDateLimit(timeWindow);
    query = query.gte('created_at', dateLimit);
  }

  const { data, error } = await query;
  if (error) throw error;

  const uniqueCategories = new Set(data.map(item => item.category));
  return uniqueCategories.size;
};

const countDaysUnderMonthlyLimit = async (userId: string, threshold: number, timeWindow: string | null | undefined, comparison: string | undefined): Promise<number> => {
  // Would need goal and spending tracking
  return 0;
};

const countManagedAccounts = async (userId: string): Promise<number> => {
  const { count, error } = await supabaseClient
    .from('banks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) throw error;
  return count || 0;
};

const countCategoryLimits = async (userId: string): Promise<number> => {
  // Would need category limit tracking
  return 0;
};

const checkUncategorizedZero = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  let query = supabaseClient
    .from('spent_table')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or('category.is.null,category.eq.');

  if (timeWindow) {
    const dateLimit = getDateLimit(timeWindow);
    query = query.gte('created_at', dateLimit);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const checkTotalSpendingReduction = async (userId: string, threshold: number, timeWindow: string | null | undefined, comparison: string | undefined): Promise<number> => {
  // Compare total spending between periods
  return 0;
};

const checkNetWorthTrend = async (userId: string, threshold: number, timeWindow: string | null | undefined, comparison: string | undefined): Promise<number> => {
  // Check net worth trend over time
  return 0;
};

const getTotalSpending = async (userId: string): Promise<number> => {
  const { data, error } = await supabaseClient
    .from('spent_table')
    .select('item_total')
    .eq('user_id', userId);

  if (error) throw error;
  return data.reduce((sum, item) => sum + (item.item_total || 0), 0);
};

const checkNetWorthIncrease = async (userId: string, threshold: number, comparison: string | undefined): Promise<number> => {
  // Calculate net worth increase percentage
  return 0;
};

const checkCashTrackingCompleteness = async (userId: string, timeWindow: string | null | undefined): Promise<number> => {
  // Calculate percentage of cash transactions tracked
  return 0;
};

const countTotalCategorizedTransactions = async (userId: string): Promise<number> => {
  const { count, error } = await supabaseClient
    .from('spent_table')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('category', 'is', null)
    .neq('category', '');

  if (error) throw error;
  return count || 0;
};

const countLongTermGoalAchievements = async (userId: string, threshold: number, timeWindow: string | null | undefined): Promise<number> => {
  // Would need goal tracking with duration
  return 0;
};

const checkCompleteLoggingStreak = async (userId: string, threshold: number, timeWindow: string | null | undefined, streakType?: string, completeness?: number): Promise<number> => {
  // Check for complete logging streak (100% of expenses logged)
  return 0;
};

const checkSpendingReductionVsBaseline = async (userId: string, threshold: number, timeWindow: string | null | undefined, comparison: string | undefined): Promise<number> => {
  // Compare against baseline spending
  return 0;
};

const countCompletedGoals = async (userId: string): Promise<number> => {
  const { count, error } = await supabaseClient
    .from('user_goal_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_completed', true)
    .neq('goal_id', 50);

  if (error) throw error;
  return count || 0;
};

/**
 * Helper function to calculate date limit based on time window
 */
const getDateLimit = (timeWindow: string): string => {
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
};

/**
 * Main entry point for tracking events and evaluating goals
 * Call this function when relevant events occur in the app
 */
export const trackEvent = async (userId: string, eventType: string, eventData: Record<string, any> = {}): Promise<void> => {
  try {
    // Get all system goals (we'll filter by event_type in code since JSONB queries can be complex)
    const { data: allGoals, error } = await supabaseClient
      .from('system_goals')
      .select('id, completion_criteria');

    if (error) throw error;

    // Filter goals that match this event type
    const matchingGoals = (allGoals || []).filter(goal => {
      const criteria = goal.completion_criteria as CompletionCriteria;
      return criteria.event_type === eventType;
    });

    // Evaluate each matching goal
    for (const goal of matchingGoals) {
      await evaluateGoal(userId, goal.id, eventData);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
    throw error;
  }
};

