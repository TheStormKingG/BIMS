import React, { useState } from 'react';
import { Target, Plus, Edit2, Trash2, Check, X, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { Goal } from '../services/goalsDatabase';
import { isGoalAchieved, getGoalProgressPercentage } from '../services/goalsTracker';

interface GoalsProps {
  goals: Goal[];
  onAddGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleActive?: (goalId: string) => void;
}

export const Goals: React.FC<GoalsProps> = ({
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  onToggleActive,
}) => {
  const activeGoals = goals.filter(g => g.active);
  const achievedGoals = goals.filter(g => isGoalAchieved(g));

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Goals</h2>
          <p className="text-slate-500 text-sm mt-1">
            {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
            {achievedGoals.length > 0 && ` • ${achievedGoals.length} achieved`}
          </p>
        </div>
        <button
          onClick={onAddGoal}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No goals yet</h3>
          <p className="text-slate-500 mb-6">Create your first goal to start tracking your financial progress!</p>
          <button
            onClick={onAddGoal}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const achieved = isGoalAchieved(goal);
            const progressPercentage = getGoalProgressPercentage(goal);
            const isSpendingLimit = goal.goalType === 'spending_limit';

            return (
              <div
                key={goal.id}
                className={`bg-white rounded-xl shadow-sm border-2 ${
                  achieved
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-slate-200'
                } p-6`}
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSpendingLimit
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {isSpendingLimit ? (
                        <TrendingDown className="w-6 h-6" />
                      ) : (
                        <TrendingUp className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">
                          {isSpendingLimit ? 'Spending Limit' : 'Savings Goal'}
                        </h3>
                        {achieved && (
                          <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 text-sm">
                        {goal.period === 'week' ? 'Weekly' : 'Monthly'}
                        {goal.category && ` • ${goal.category}`}
                      </p>
                    </div>
                  </div>
                  {!goal.active && (
                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Progress</span>
                    <span className="text-sm font-bold text-slate-900">
                      {isSpendingLimit ? (
                        <>
                          ${goal.currentProgress.toLocaleString()} / ${goal.targetAmount.toLocaleString()} GYD
                        </>
                      ) : (
                        <>
                          ${goal.currentProgress.toLocaleString()} / ${goal.targetAmount.toLocaleString()} GYD
                        </>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        achieved
                          ? 'bg-emerald-500'
                          : isSpendingLimit
                          ? progressPercentage > 80
                            ? 'bg-red-500'
                            : progressPercentage > 60
                            ? 'bg-amber-500'
                            : 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, progressPercentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">
                      {progressPercentage.toFixed(1)}% {isSpendingLimit ? 'used' : 'complete'}
                    </span>
                    {achieved && (
                      <span className="text-xs font-semibold text-emerald-600">
                        ✓ Achieved!
                      </span>
                    )}
                  </div>
                </div>

                {/* Goal Details */}
                {goal.category && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                      Category: {goal.category}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => onEditGoal(goal)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  {onToggleActive && (
                    <button
                      onClick={() => onToggleActive(goal.id)}
                      className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title={goal.active ? 'Deactivate' : 'Activate'}
                    >
                      {goal.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this goal?')) {
                        onDeleteGoal(goal.id);
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

