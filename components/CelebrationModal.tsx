import React, { useState, useEffect } from 'react';
import { Trophy, Check } from 'lucide-react';
import { Celebration } from '../services/celebrationService';
import { SystemGoal, getSystemGoalById } from '../services/goalsService';

interface CelebrationModalProps {
  celebration: Celebration | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ celebration, isOpen, onClose }) => {
  const [goal, setGoal] = useState<SystemGoal | null>(null);

  useEffect(() => {
    if (!celebration || !isOpen) return;
    
    const fetchGoal = async () => {
      try {
        const goalData = await getSystemGoalById(celebration.goal_id);
        setGoal(goalData);
      } catch (error) {
        console.error('Error fetching goal:', error);
      }
    };

    fetchGoal();
  }, [celebration?.goal_id, isOpen]);

  if (!isOpen || !celebration || !goal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-2xl p-6 max-w-md w-full mx-4 relative animate-scale-in">
        <div className="flex items-center gap-4 mb-6">
          {/* Circular check icon on the left, vertically centered */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Content on the right */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">
                Congratulations!
              </h2>
              <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">
              You completed <strong>"{goal.title}"</strong> and earned the <strong>"{goal.badge_name}"</strong> badge!
            </p>
            <p className="text-xs text-slate-500 italic">
              {goal.description}
            </p>
          </div>
        </div>

        {/* OK Button - Required to close modal */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

