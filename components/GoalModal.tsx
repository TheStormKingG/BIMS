import React, { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { Goal, CreateGoalInput } from '../services/goalsDatabase';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalInput | Partial<Goal>) => void;
  existingGoal?: Goal | null;
  categories?: string[];
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingGoal,
  categories = [],
}) => {
  const [goalType, setGoalType] = useState<'spending_limit' | 'savings'>('spending_limit');
  const [targetAmount, setTargetAmount] = useState('');
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');

  useEffect(() => {
    if (existingGoal) {
      setGoalType(existingGoal.goalType);
      setTargetAmount(existingGoal.targetAmount.toString());
      setPeriod(existingGoal.period);
      setCategory(existingGoal.category || '');
      setMerchant(existingGoal.merchant || '');
    } else {
      // Reset form for new goal
      setGoalType('spending_limit');
      setTargetAmount('');
      setPeriod('month');
      setCategory('');
      setMerchant('');
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
        period,
        category: category || null,
        merchant: merchant || null,
      });
    } else {
      // Create new goal
      onSave({
        goalType,
        targetAmount: amount,
        period,
        category: category || undefined,
        merchant: merchant || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
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
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGoalType('spending_limit')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    goalType === 'spending_limit'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Spending Limit</p>
                    <p className="text-xs text-slate-500 mt-1">Stay under budget</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setGoalType('savings')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    goalType === 'savings'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Savings</p>
                    <p className="text-xs text-slate-500 mt-1">Save target amount</p>
                  </div>
                </button>
              </div>
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
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
            />
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Period
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  period === 'week'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <span className="font-medium text-slate-900">Weekly</span>
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  period === 'month'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <span className="font-medium text-slate-900">Monthly</span>
              </button>
            </div>
          </div>

          {/* Category (only for spending_limit goals) */}
          {(!existingGoal || existingGoal.goalType === 'spending_limit') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category (Optional)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Merchant (optional, future feature) */}
          {/* <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Merchant (Optional)
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Specific merchant name"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
            />
          </div> */}

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

