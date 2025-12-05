import { useState, useEffect } from 'react';
import {
  fetchSpentItems,
  fetchCurrentMonthSpentItems,
  createSpentItem,
  createSpentItems,
  updateSpentItem,
  deleteSpentItem,
  SpentItem,
} from '../services/spentTableDatabase';

export const useSpentItems = () => {
  const [spentItems, setSpentItems] = useState<SpentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentMonth();
  }, []);

  const loadSpentItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSpentItems();
      setSpentItems(data);
    } catch (err: any) {
      console.error('Failed to load spent items:', err);
      // If table doesn't exist, don't show error - just return empty array
      if (err?.code === 'PGRST202' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setSpentItems([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load spent items');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentMonth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCurrentMonthSpentItems();
      setSpentItems(data);
    } catch (err: any) {
      console.error('Failed to load current month spent items:', err);
      // If table doesn't exist, don't show error - just return empty array
      if (err?.code === 'PGRST202' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setSpentItems([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load current month spent items');
      }
    } finally {
      setLoading(false);
    }
  };

  const addSpentItem = async (item: Omit<SpentItem, 'id' | 'entryDate'>) => {
    try {
      const newItem = await createSpentItem(item);
      setSpentItems(prev => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      console.error('Failed to add spent item:', err);
      throw err;
    }
  };

  const addSpentItems = async (items: Omit<SpentItem, 'id' | 'entryDate'>[]) => {
    try {
      const newItems = await createSpentItems(items);
      setSpentItems(prev => [...newItems, ...prev]);
      return newItems;
    } catch (err) {
      console.error('Failed to add spent items:', err);
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<SpentItem>) => {
    try {
      await updateSpentItem(id, updates);
      setSpentItems(prev =>
        prev.map(item => (item.id === id ? { ...item, ...updates } : item))
      );
    } catch (err) {
      console.error('Failed to update spent item:', err);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteSpentItem(id);
      setSpentItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete spent item:', err);
      throw err;
    }
  };

  return {
    spentItems,
    loading,
    error,
    addSpentItem,
    addSpentItems,
    updateItem,
    deleteItem,
    refresh: loadSpentItems,
    loadCurrentMonth,
  };
};

