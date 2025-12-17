import { Goal } from './goalsDatabase';
import { SpentItem } from './spentTableDatabase';
import { updateGoal } from './goalsDatabase';
import { calculateTimeBasedAnalytics } from './analyticsService';

/**
 * Calculate progress for a goal based on its type
 */
export const calculateGoalProgress = (
  goal: Goal,
  spentItems: SpentItem[]
): number => {
  const analytics = calculateTimeBasedAnalytics(spentItems);

  switch (goal.goalType) {
    case 'spent_last_24h':
      return analytics.spentLast24Hours;

    case 'spent_last_7d':
      return analytics.spentLast7Days;

    case 'spent_last_30d':
      return analytics.spentLast30Days;

    case 'avg_daily':
      return analytics.avgDaily;

    case 'avg_weekly':
      return analytics.avgWeekly;

    case 'avg_monthly':
      return analytics.avgMonthly;

    case 'top_category_spent':
      // For top category, use the category specified in goal.category if set,
      // otherwise use the actual top category
      if (goal.category && analytics.topCategory && analytics.topCategory.name === goal.category) {
        return analytics.topCategory.amount;
      }
      // Calculate total for the specified category
      if (goal.category) {
        return spentItems
          .filter(item => item.category === goal.category)
          .reduce((sum, item) => sum + item.itemTotal, 0);
      }
      // If no category specified, use top category
      return analytics.topCategory?.amount || 0;

    default:
      return 0;
  }
};

/**
 * Update progress for all active goals
 */
export const updateAllGoalProgress = async (
  goals: Goal[],
  spentItems: SpentItem[],
  currentBalance: number = 0
): Promise<void> => {
  const activeGoals = goals.filter(g => g.active);

  for (const goal of activeGoals) {
    const progress = calculateGoalProgress(goal, spentItems);

    // Only update if progress has changed (to avoid unnecessary DB writes)
    if (Math.abs(progress - goal.currentProgress) > 0.01) {
      await updateGoal(goal.id, { currentProgress: progress });
    }
  }
};

/**
 * Check if a goal is achieved
 * For spending goals (lower is better), achievement means staying at or below target
 * For other goals (higher is better), achievement means reaching or exceeding target
 */
export const isGoalAchieved = (goal: Goal): boolean => {
  // Spending-based goals: achieved if we stayed at or below the target (lower is better)
  const isSpendingGoal = ['spent_last_24h', 'spent_last_7d', 'spent_last_30d', 'top_category_spent'].includes(goal.goalType);
  
  if (isSpendingGoal) {
    return goal.currentProgress <= goal.targetAmount;
  } else {
    // Average goals: achieved if we're at or below target (lower average is better)
    // Actually, for averages, lower is also better (spending less per day/week/month)
    return goal.currentProgress <= goal.targetAmount;
  }
};

/**
 * Get goal progress percentage
 * For spending goals, show percentage of target used (we want to stay under)
 */
export const getGoalProgressPercentage = (goal: Goal): number => {
  if (goal.targetAmount === 0) return 0;
  // For all these goal types, lower is better (spending less)
  // Show percentage of target used (clamped to 0-100%)
  return Math.min(100, Math.max(0, (goal.currentProgress / goal.targetAmount) * 100));
};

