import React, { useState, useEffect } from 'react';
import { Trophy, Check, Share2 } from 'lucide-react';
import { Celebration } from '../services/celebrationService';
import { SystemGoal, getSystemGoalById } from '../services/goalsService';
import { getCredentialByUserAndGoal, BadgeCredential } from '../services/credentialService';
import { ShareBadgeModal } from './ShareBadgeModal';
import { getSupabase } from '../services/supabaseClient';

interface CelebrationModalProps {
  celebration: Celebration | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ celebration, isOpen, onClose }) => {
  const [goal, setGoal] = useState<SystemGoal | null>(null);
  const [credential, setCredential] = useState<BadgeCredential | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!celebration || !isOpen) return;
    
    const fetchGoalAndCredential = async () => {
      try {
        const goalData = await getSystemGoalById(celebration.goal_id);
        setGoal(goalData);
        
        // Fetch credential for this goal
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && goalData) {
          const cred = await getCredentialByUserAndGoal(user.id, celebration.goal_id);
          setCredential(cred);
        }
      } catch (error) {
        console.error('Error fetching goal or credential:', error);
      }
    };

    fetchGoalAndCredential();
  }, [celebration?.goal_id, isOpen]);

  if (!isOpen || !celebration || !goal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-2xl p-6 max-w-md w-full mx-4 relative animate-scale-in">
        <div className="flex items-start gap-4 mb-6">
          {/* Badge icon image on the left */}
          <div className="flex-shrink-0">
            <img
              src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
              alt={`${goal.badge_name} badge`}
              className="w-16 h-16 object-contain"
            />
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

        {/* Share and OK Buttons */}
        <div className="flex justify-end gap-3">
          {credential && (
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            OK
          </button>
        </div>
        
        {/* Share Badge Modal */}
        {credential && showShareModal && (
          <ShareBadgeModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            credential={credential}
          />
        )}
      </div>
    </div>
  );
};

