import { getSupabase } from './supabaseClient';

export type SubscriptionPlan = 'none' | 'personal' | 'pro' | 'pro_max';
export type SubscriptionStatus = 'trialing' | 'active' | 'expired' | 'canceled';

// Trial duration in days
export const TRIAL_DURATION_DAYS = 14;

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_start_at: string | null;
  trial_end_at: string | null;
  plan_started_at: string | null;
  plan_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserEntitlement {
  isTrialActive: boolean;
  isPaidActive: boolean;
  effectivePlan: SubscriptionPlan;
  daysLeftOnTrial: number | null;
  currentPlan: SubscriptionPlan;
  status: SubscriptionStatus;
}

// Plan order for comparison
export const PLAN_ORDER: SubscriptionPlan[] = ['none', 'personal', 'pro', 'pro_max'];

// Feature keys registry
export type FeatureKey =
  | 'receipt_scan'
  | 'receipt_storage'
  | 'contextual_ai'
  | 'ai_tips'
  | 'export_csv'
  | 'export_excel'
  | 'export_pdf_detailed'
  | 'analytics_90d'
  | 'analytics_all_time'
  | 'achievements_phase_2'
  | 'achievements_phase_3'
  | 'achievements_phase_4'
  | 'achievements_phase_5'
  | 'certificates'
  | 'badge_verification'
  | 'unlimited_goals'
  | 'bank_accounts_unlimited'
  | 'bank_accounts_limit_2'
  | 'archive_accounts'
  | 'advanced_analytics'
  | 'top_spending_item'
  | 'transaction_editing'
  | 'transaction_deletion'
  | 'net_worth_full';

// Feature to minimum plan mapping
const FEATURE_PLAN_MAP: Record<FeatureKey, SubscriptionPlan> = {
  // Personal features (none means available even without plan during trial)
  'receipt_scan': 'pro',
  'receipt_storage': 'pro',
  'contextual_ai': 'pro',
  'ai_tips': 'pro',
  'export_csv': 'pro',
  'export_excel': 'pro',
  'export_pdf_detailed': 'pro',
  'analytics_90d': 'pro',
  'analytics_all_time': 'pro_max',
  'achievements_phase_2': 'pro',
  'achievements_phase_3': 'pro',
  'achievements_phase_4': 'pro_max',
  'achievements_phase_5': 'pro_max',
  'certificates': 'pro_max',
  'badge_verification': 'pro_max',
  'unlimited_goals': 'pro_max',
  'bank_accounts_unlimited': 'pro',
  'bank_accounts_limit_2': 'personal',
  'archive_accounts': 'pro',
  'advanced_analytics': 'pro',
  'top_spending_item': 'pro',
  'transaction_editing': 'pro',
  'transaction_deletion': 'pro',
  'net_worth_full': 'pro',
};

/**
 * Compare two plans - returns true if plan1 >= plan2
 */
function comparePlans(plan1: SubscriptionPlan, plan2: SubscriptionPlan): boolean {
  const index1 = PLAN_ORDER.indexOf(plan1);
  const index2 = PLAN_ORDER.indexOf(plan2);
  return index1 >= index2;
}

/**
 * Calculate user entitlement from subscription
 */
export function getUserEntitlement(subscription: UserSubscription | null): UserEntitlement {
  if (!subscription) {
    return {
      isTrialActive: false,
      isPaidActive: false,
      effectivePlan: 'none',
      daysLeftOnTrial: null,
      currentPlan: 'none',
      status: 'expired',
    };
  }

  const now = new Date();
  const trialEnd = subscription.trial_end_at ? new Date(subscription.trial_end_at) : null;
  const isTrialActive = subscription.status === 'trialing' && trialEnd && now < trialEnd;

  // During trial, effective plan is 'pro'
  const effectivePlan: SubscriptionPlan = isTrialActive 
    ? 'pro' 
    : (subscription.status === 'active' ? subscription.plan : 'none');

  const isPaidActive = subscription.status === 'active' && !isTrialActive;

  // Calculate days left on trial
  let daysLeftOnTrial: number | null = null;
  if (isTrialActive && trialEnd) {
    const diffMs = trialEnd.getTime() - now.getTime();
    daysLeftOnTrial = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  return {
    isTrialActive,
    isPaidActive,
    effectivePlan,
    daysLeftOnTrial,
    currentPlan: subscription.plan,
    status: subscription.status,
  };
}

/**
 * Check if user can use a specific feature
 * All features are now free for all logged-in users
 */
export function canUse(
  featureKey: FeatureKey,
  entitlement: UserEntitlement
): boolean {
  // All features are free - return true for all logged-in users
  return true;
}

/**
 * Require a feature - throws error if not available
 * All features are now free for all logged-in users
 */
export function requireFeature(
  featureKey: FeatureKey,
  entitlement: UserEntitlement
): void {
  // All features are free - no restrictions
  return;
}

/**
 * Require a minimum plan
 * All features are now free for all logged-in users
 */
export function requirePlan(
  minPlan: SubscriptionPlan,
  entitlement: UserEntitlement
): void {
  // All features are free - no restrictions
  return;
}

/**
 * Fetch user subscription from database
 */
export async function fetchUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }

  return data;
}

/**
 * Initialize subscription for new user (creates trial)
 */
export async function initializeUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = getSupabase();
  
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS); // 14 days from now

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan: 'none',
      status: 'trialing',
      trial_start_at: new Date().toISOString(),
      trial_end_at: trialEnd.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error initializing user subscription:', error);
    throw error;
  }

  return data;
}

/**
 * Ensure user has a subscription (fetch or create)
 */
export async function ensureUserSubscription(userId: string): Promise<UserSubscription> {
  let subscription = await fetchUserSubscription(userId);
  
  if (!subscription) {
    subscription = await initializeUserSubscription(userId);
  }

  return subscription;
}

/**
 * Update user's subscription plan (when they choose a plan)
 */
export async function updateUserSubscriptionPlan(
  userId: string,
  plan: SubscriptionPlan
): Promise<UserSubscription> {
  const supabase = getSupabase();
  
  const now = new Date();
  // For now, plan doesn't expire (we'll add billing later)
  // Set plan_ends_at to null for unlimited, or add logic for billing periods

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      plan,
      status: 'active',
      plan_started_at: now.toISOString(),
      plan_ends_at: null, // TODO: Set based on billing period when payment is integrated
      updated_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user subscription plan:', error);
    throw error;
  }

  return data;
}

/**
 * Check if subscription is expired and update status if needed
 */
export async function checkAndUpdateSubscriptionStatus(
  subscription: UserSubscription
): Promise<UserSubscription> {
  const now = new Date();
  const trialEnd = subscription.trial_end_at ? new Date(subscription.trial_end_at) : null;
  const planEnd = subscription.plan_ends_at ? new Date(subscription.plan_ends_at) : null;

  // If trial ended and status is still trialing, mark as expired
  if (subscription.status === 'trialing' && trialEnd && now >= trialEnd) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription status:', error);
      return subscription;
    }

    return data;
  }

  // If plan ended and status is active, mark as expired
  if (subscription.status === 'active' && planEnd && now >= planEnd && subscription.plan !== 'none') {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription status:', error);
      return subscription;
    }

    return data;
  }

  return subscription;
}

