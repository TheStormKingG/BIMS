import { Goal } from './goalsDatabase';
import { SpentItem } from './spentTableDatabase';
import { updateGoal } from './goalsDatabase';

/**
 * Calculate progress for a spending limit goal
 */
export const calculateSpendingLimitProgress = (
  goal: Goal,
  spentItems: SpentItem[]
): number => {
  const now = new Date();
  let startDate: Date;

  if (goal.period === 'week') {
    // Start of current week (Monday)
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    startDate = monday;
  } else {
    // Start of current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Filter items within the period and matching criteria
  const relevantItems = spentItems.filter(item => {
    const itemDate = new Date(item.transactionDateTime);
    
    // Check date range
    if (itemDate < startDate) return false;

    // Check category if specified
    if (goal.category && item.category !== goal.category) return false;

    // Note: merchant matching would require merchant field in spent_table
    // For now, we skip merchant filtering
    
    return true;
  });

  // Calculate total spent
  const totalSpent = relevantItems.reduce((sum, item) => sum + item.itemTotal, 0);

  return totalSpent;
};

/**
 * Calculate progress for a savings goal
 * Note: This is a placeholder - actual savings calculation would need account balance tracking
 */
export const calculateSavingsProgress = (
  goal: Goal,
  currentBalance: number
): number => {
  // For savings goals, progress is the current balance
  // This is a simplified version - you might want to track savings differently
  return Math.max(0, currentBalance);
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
    let progress: number;

    if (goal.goalType === 'spending_limit') {
      progress = calculateSpendingLimitProgress(goal, spentItems);
    } else {
      progress = calculateSavingsProgress(goal, currentBalance);
    }

    // Only update if progress has changed (to avoid unnecessary DB writes)
    if (Math.abs(progress - goal.currentProgress) > 0.01) {
      await updateGoal(goal.id, { currentProgress: progress });
    }
  }
};

/**
 * Check if a goal is achieved
 */
export const isGoalAchieved = (goal: Goal): boolean => {
  if (goal.goalType === 'spending_limit') {
    // For spending limits, goal is achieved if we stayed under the limit
    return goal.currentProgress <= goal.targetAmount;
  } else {
    // For savings, goal is achieved if we reached the target
    return goal.currentProgress >= goal.targetAmount;
  }
};

/**
 * Get goal progress percentage
 */
export const getGoalProgressPercentage = (goal: Goal): number => {
  if (goal.goalType === 'spending_limit') {
    // For spending limits, progress is inverse (we want to stay under)
    // Show percentage of limit used (clamped to 0-100%)
    return Math.min(100, Math.max(0, (goal.currentProgress / goal.targetAmount) * 100));
  } else {
    // For savings, show percentage of target reached
    if (goal.targetAmount === 0) return 0;
    return Math.min(100, Math.max(0, (goal.currentProgress / goal.targetAmount) * 100));
  }
};

