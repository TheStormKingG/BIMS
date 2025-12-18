import React, { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { Goal, CreateGoalInput, GoalType } from '../services/goalsDatabase';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalInput | Partial<Goal>) => void;
  existingGoal?: Goal | null;
  categories?: string[];
}

const GOAL_TYPES: Array<{ value: GoalType; label: string; description: string }> = [
  { value: 'spent_last_24h', label: 'Spent Last 24h', description: 'Track total spending in the last 24 hours' },
  { value: 'spent_last_7d', label: 'Spent Last 7 Days', description: 'Track total spending in the last 7 days' },
  { value: 'spent_last_30d', label: 'Spent Last 30 Days', description: 'Track total spending in the last 30 days' },
  { value: 'avg_daily', label: 'Average Daily', description: 'Track average daily spending' },
  { value: 'avg_weekly', label: 'Average Weekly', description: 'Track average weekly spending' },
  { value: 'avg_monthly', label: 'Average Monthly', description: 'Track average monthly spending' },
  { value: 'top_category_spent', label: 'Most Money Spent On Category', description: 'Track total spent on a specific category' },
];

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingGoal,
  categories = [],
}) => {
  const [goalType, setGoalType] = useState<GoalType>('spent_last_30d');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (existingGoal) {
      setGoalType(existingGoal.goalType);
      setTargetAmount(existingGoal.targetAmount.toString());
      setCategory(existingGoal.category || '');
    } else {
      // Reset form for new goal
      setGoalType('spent_last_30d');
      setTargetAmount('');
      setCategory('');
    }
  }, [existingGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid target amount');
      return;
    }

    if (existingGoal) {
      // Update existing goal
      onSave({
        targetAmount: amount,
        category: goalType === 'top_category_spent' ? (category || null) : null,
      });
    } else {
      // Create new goal
      onSave({
        goalType,
        targetAmount: amount,
        period: null,
        category: goalType === 'top_category_spent' ? category : undefined,
      });
    }

    onClose();
  };

  const selectedGoalType = GOAL_TYPES.find(gt => gt.value === goalType);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {existingGoal ? 'Edit Goal' : 'Create New Goal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Type (only for new goals) */}
          {!existingGoal && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Goal Type
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black bg-white"
              >
                {GOAL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {selectedGoalType && (
                <p className="text-xs text-slate-500 mt-1">{selectedGoalType.description}</p>
              )}
            </div>
          )}

          {/* Category selection (only for top_category_spent) */}
          {goalType === 'top_category_spent' && categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black bg-white"
                required={goalType === 'top_category_spent'}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Target Amount (GYD)
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0"
              step="1"
              min="0"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
            />
            <p className="text-xs text-slate-500 mt-1">
              {goalType === 'top_category_spent' 
                ? 'Set the maximum amount you want to spend on this category'
                : 'Set your spending limit or target amount'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              {existingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
