import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

export interface Goal {
  id: string;
  userId: string;
  goalType: 'spending_limit' | 'savings';
  targetAmount: number;
  period: 'week' | 'month';
  category: string | null;
  merchant: string | null;
  active: boolean;
  currentProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  goalType: 'spending_limit' | 'savings';
  targetAmount: number;
  period: 'week' | 'month';
  category?: string;
  merchant?: string;
}

/**
 * Fetch all goals for the user
 */
export const fetchGoals = async (includeInactive: boolean = false): Promise<Goal[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let query = supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    goalType: item.goal_type,
    targetAmount: Number(item.target_amount),
    period: item.period,
    category: item.category,
    merchant: item.merchant,
    active: item.active,
    currentProgress: Number(item.current_progress) || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
};

/**
 * Create a new goal
 */
export const createGoal = async (input: CreateGoalInput): Promise<Goal> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('goals')
    .insert([{
      user_id: user.id,
      goal_type: input.goalType,
      target_amount: input.targetAmount,
      period: input.period,
      category: input.category || null,
      merchant: input.merchant || null,
      active: true,
      current_progress: 0,
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    goalType: data.goal_type,
    targetAmount: Number(data.target_amount),
    period: data.period,
    category: data.category,
    merchant: data.merchant,
    active: data.active,
    currentProgress: Number(data.current_progress) || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Update a goal
 */
export const updateGoal = async (
  id: string,
  updates: Partial<{
    targetAmount: number;
    period: 'week' | 'month';
    category: string | null;
    merchant: string | null;
    active: boolean;
    currentProgress: number;
  }>
): Promise<void> => {
  const dbUpdates: any = {};

  if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
  if (updates.period !== undefined) dbUpdates.period = updates.period;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.merchant !== undefined) dbUpdates.merchant = updates.merchant;
  if (updates.active !== undefined) dbUpdates.active = updates.active;
  if (updates.currentProgress !== undefined) dbUpdates.current_progress = updates.currentProgress;

  const { error } = await supabase
    .from('goals')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};

/**
 * Delete a goal
 */
export const deleteGoal = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

