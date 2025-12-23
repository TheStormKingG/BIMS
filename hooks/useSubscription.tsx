import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import {
  UserSubscription,
  UserEntitlement,
  getUserEntitlement,
  ensureUserSubscription,
  checkAndUpdateSubscriptionStatus,
} from '../services/subscriptionService';
import { getSupabase } from '../services/supabaseClient';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  entitlement: UserEntitlement;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
  user: User | null;
}

export function SubscriptionProvider({ children, user }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entitlement = getUserEntitlement(subscription);

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure subscription exists (create trial if needed)
      let sub = await ensureUserSubscription(user.id);

      // Check and update status if expired
      sub = await checkAndUpdateSubscriptionStatus(sub);

      setSubscription(sub);
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [user?.id]);

  // Periodically check subscription status (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshSubscription();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        entitlement,
        loading,
        error,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

