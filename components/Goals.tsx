import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Edit2, Trash2, Check, X, TrendingDown, TrendingUp, Trophy, Clock, Calendar, DollarSign, BarChart3, Award } from 'lucide-react';
import { Goal, GoalType } from '../services/goalsDatabase';
import { isGoalAchieved, getGoalProgressPercentage } from '../services/goalsTracker';
import { useSystemGoals } from '../hooks/useSystemGoals';

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  spent_last_24h: 'Spent Last 24h',
  spent_last_7d: 'Spent Last 7 Days',
  spent_last_30d: 'Spent Last 30 Days',
  avg_daily: 'Average Daily',
  avg_weekly: 'Average Weekly',
  avg_monthly: 'Average Monthly',
  top_category_spent: 'Most Money Spent On Category',
};

const GOAL_TYPE_ICONS: Record<GoalType, React.ElementType> = {
  spent_last_24h: Clock,
  spent_last_7d: Calendar,
  spent_last_30d: Calendar,
  avg_daily: TrendingDown,
  avg_weekly: TrendingDown,
  avg_monthly: TrendingDown,
  top_category_spent: BarChart3,
};

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
  const navigate = useNavigate();
  const { goals: systemGoals, progress: systemProgress, badges, phaseUnlocks, loading: systemGoalsLoading } = useSystemGoals();
  const activeGoals = goals.filter(g => g.active);
  const achievedGoals = goals.filter(g => isGoalAchieved(g));
  
  // Calculate system goals stats
  const completedSystemGoals = systemProgress.filter(p => p.is_completed).length;
  const totalSystemGoals = Object.values(systemGoals).reduce((sum, phaseGoals) => sum + phaseGoals.length, 0);
  const systemProgressPercent = totalSystemGoals > 0 ? Math.round((completedSystemGoals / totalSystemGoals) * 100) : 0;

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

      {/* System Goals Progress Section */}
      {!systemGoalsLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Achievement Goals
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {completedSystemGoals} of {totalSystemGoals} goals completed ({systemProgressPercent}%)
              </p>
            </div>
            <button
              onClick={() => navigate('/system-goals')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              View All
              <Target className="w-4 h-4" />
            </button>
          </div>

          {/* Badge Progress Visual */}
          <div className="flex items-center justify-center gap-4 py-4">
            {/* Show first 5 phases as badges */}
            {[1, 2, 3, 4, 5].map(phase => {
              const phaseGoals = systemGoals[phase] || [];
              const phaseCompleted = systemProgress.filter(
                p => phaseGoals.some(g => g.id === p.goal_id) && p.is_completed
              ).length;
              const phaseUnlocked = phaseUnlocks[phase] ?? false;
              const phaseProgress = phaseGoals.length > 0 
                ? Math.round((phaseCompleted / phaseGoals.length) * 100)
                : 0;
              const isFullyComplete = phaseProgress === 100 && phaseUnlocked;

              return (
                <div key={phase} className="flex flex-col items-center gap-2">
                  {/* Badge Icon - Gem-like shape with Trophy */}
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
                      !phaseUnlocked
                        ? 'bg-slate-300 border-2 border-slate-400'
                        : isFullyComplete
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-emerald-700 shadow-lg'
                        : 'bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-slate-400'
                    }`}
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    {isFullyComplete ? (
                      <Trophy className="w-8 h-8" style={{ color: '#FCD34D', fill: '#FBBF24' }} />
                    ) : (
                      <Trophy className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div className="text-xs text-center">
                    <div className="font-semibold text-slate-900">Phase {phase}</div>
                    {phaseUnlocked && (
                      <div className="text-slate-600">{phaseProgress}%</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${systemProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
            const GoalIcon = GOAL_TYPE_ICONS[goal.goalType] || Target;
            const goalLabel = GOAL_TYPE_LABELS[goal.goalType] || goal.goalType;

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
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-600">
                      <GoalIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">
                          {goalLabel}
                        </h3>
                        {achieved && (
                          <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                      {goal.category && goal.goalType === 'top_category_spent' && (
                        <p className="text-slate-600 text-sm">
                          Category: {goal.category}
                        </p>
                      )}
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
                    <span className="text-sm font-semibold text-slate-700">Current</span>
                    <span className="text-sm font-bold text-slate-900">
                      ${goal.currentProgress.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${goal.targetAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} GYD
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        achieved
                          ? 'bg-emerald-500'
                          : progressPercentage > 90
                          ? 'bg-red-500'
                          : progressPercentage > 75
                          ? 'bg-amber-500'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, progressPercentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">
                      {progressPercentage.toFixed(1)}% of target
                    </span>
                    {achieved && (
                      <span className="text-xs font-semibold text-emerald-600">
                        ✓ Achieved!
                      </span>
                    )}
                  </div>
                </div>

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

