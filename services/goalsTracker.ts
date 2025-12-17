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

