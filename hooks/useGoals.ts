import { useState, useEffect } from 'react';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  Goal,
  CreateGoalInput,
} from '../services/goalsDatabase';
import { updateAllGoalProgress, isGoalAchieved, getGoalProgressPercentage } from '../services/goalsTracker';
import { SpentItem } from '../services/spentTableDatabase';

export const useGoals = (spentItems?: SpentItem[], currentBalance?: number) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  // Update goal progress when spentItems or balance changes
  useEffect(() => {
    if (goals.length > 0 && spentItems) {
      updateAllGoalProgress(goals, spentItems, currentBalance || 0).then(() => {
        // Reload goals to get updated progress
        loadGoals();
      }).catch(err => {
        console.error('Failed to update goal progress:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spentItems?.length, currentBalance]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGoals(false); // Only active goals
      setGoals(data);
    } catch (err: any) {
      console.error('Failed to load goals:', err);
      if (err?.code !== 'PGRST202' && !err?.message?.includes('does not exist')) {
        setError(err instanceof Error ? err.message : 'Failed to load goals');
      }
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (input: CreateGoalInput): Promise<Goal> => {
    try {
      const newGoal = await createGoal(input);
      setGoals(prev => [newGoal, ...prev]);
      return newGoal;
    } catch (err) {
      console.error('Failed to create goal:', err);
      throw err;
    }
  };

  const editGoal = async (
    id: string,
    updates: Partial<{
      targetAmount: number;
      period: 'week' | 'month';
      category: string | null;
      merchant: string | null;
      active: boolean;
    }>
  ): Promise<void> => {
    try {
      await updateGoal(id, updates);
      setGoals(prev =>
        prev.map(goal =>
          goal.id === id ? { ...goal, ...updates } : goal
        )
      );
    } catch (err) {
      console.error('Failed to update goal:', err);
      throw err;
    }
  };

  const removeGoal = async (id: string): Promise<void> => {
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(goal => goal.id !== id));
    } catch (err) {
      console.error('Failed to delete goal:', err);
      throw err;
    }
  };

  const toggleGoalActive = async (id: string): Promise<void> => {
    try {
      const goal = goals.find(g => g.id === id);
      if (goal) {
        await updateGoal(id, { active: !goal.active });
        setGoals(prev =>
          prev.map(g => (g.id === id ? { ...g, active: !g.active } : g))
        );
      }
    } catch (err) {
      console.error('Failed to toggle goal:', err);
      throw err;
    }
  };

  return {
    goals,
    loading,
    error,
    addGoal,
    editGoal,
    removeGoal,
    toggleGoalActive,
    isGoalAchieved,
    getGoalProgressPercentage,
    refresh: loadGoals,
  };
};

