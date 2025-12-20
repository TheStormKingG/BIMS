import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../services/supabaseClient';
import {
  initializeUserGoals,
  getUserGoalProgress,
  getUserBadges,
  getPhaseUnlockStatus,
  getSystemGoalsByPhase,
  SystemGoal,
  UserGoalProgress,
  UserBadge,
  trackEvent,
} from '../services/goalsService';

const supabase = getSupabase();

export const useSystemGoals = () => {
  const [goals, setGoals] = useState<Record<number, SystemGoal[]>>({});
  const [progress, setProgress] = useState<UserGoalProgress[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [phaseUnlocks, setPhaseUnlocks] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Initialize user goals if they don't exist
      await initializeUserGoals(user.id);

      // Load all data
      const [goalsData, progressData, badgesData, unlocksData] = await Promise.all([
        getSystemGoalsByPhase(),
        getUserGoalProgress(user.id),
        getUserBadges(user.id),
        getPhaseUnlockStatus(user.id),
      ]);

      setGoals(goalsData);
      setProgress(progressData);
      setBadges(badgesData);
      setPhaseUnlocks(unlocksData);
    } catch (err) {
      console.error('Failed to load system goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Track event helper
  const trackGoalEvent = useCallback(async (eventType: string, eventData: Record<string, any> = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await trackEvent(user.id, eventType, eventData);
      // Reload progress after tracking
      await loadGoals();
    } catch (err) {
      console.error('Failed to track goal event:', err);
    }
  }, [loadGoals]);

  return {
    goals,
    progress,
    badges,
    phaseUnlocks,
    loading,
    error,
    refresh: loadGoals,
    trackEvent: trackGoalEvent,
  };
};

