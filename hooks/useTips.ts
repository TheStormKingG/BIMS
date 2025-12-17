import { useState, useEffect } from 'react';
import {
  fetchUnreadTips,
  fetchAllTips,
  markTipAsRead,
  deleteTip,
  getUserPreferences,
  updateUserPreferences,
  Tip,
  UserPreferences,
} from '../services/tipsDatabase';

export const useTips = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  // Load tips when preferences change (to respect tipsCount)
  useEffect(() => {
    if (preferences) {
      loadTips();
    }
  }, [preferences?.tipsCount]);

  const loadTips = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use user's preferred tips count, or default to 5 if not set
      const tipsLimit = preferences?.tipsCount || 5;
      const data = await fetchUnreadTips(tipsLimit);
      setTips(data);
    } catch (err: any) {
      console.error('Failed to load tips:', err);
      if (err?.code !== 'PGRST202' && !err?.message?.includes('does not exist')) {
        setError(err instanceof Error ? err.message : 'Failed to load tips');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAllTips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllTips(20);
      setTips(data);
    } catch (err: any) {
      console.error('Failed to load all tips:', err);
      if (err?.code !== 'PGRST202' && !err?.message?.includes('does not exist')) {
        setError(err instanceof Error ? err.message : 'Failed to load tips');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const data = await getUserPreferences();
      setPreferences(data);
    } catch (err: any) {
      console.error('Failed to load preferences:', err);
      if (err?.code !== 'PGRST202' && !err?.message?.includes('does not exist')) {
        // Don't set error - preferences can fail silently
      }
    }
  };

  const markAsRead = async (tipId: string) => {
    try {
      await markTipAsRead(tipId);
      setTips(prev => prev.map(tip => 
        tip.id === tipId ? { ...tip, readAt: new Date().toISOString() } : tip
      ));
    } catch (err) {
      console.error('Failed to mark tip as read:', err);
      throw err;
    }
  };

  const removeTip = async (tipId: string) => {
    try {
      await deleteTip(tipId);
      setTips(prev => prev.filter(tip => tip.id !== tipId));
    } catch (err) {
      console.error('Failed to delete tip:', err);
      throw err;
    }
  };

  const updatePreferences = async (tipsFrequency: 'daily' | 'weekly' | 'monthly' | 'off', tipsCount?: number) => {
    try {
      await updateUserPreferences(tipsFrequency, tipsCount);
      const updatedPrefs = { ...preferences, tipsFrequency, tipsCount: tipsCount ?? preferences?.tipsCount ?? 5 };
      setPreferences(updatedPrefs as UserPreferences);
      // Reload tips with new count
      const tipsLimit = tipsCount ?? preferences?.tipsCount ?? 5;
      const data = await fetchUnreadTips(tipsLimit);
      setTips(data);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      throw err;
    }
  };

  return {
    tips,
    preferences,
    loading,
    error,
    markAsRead,
    removeTip,
    updatePreferences,
    refresh: loadTips,
    loadAllTips,
  };
};

