import React, { useState, useEffect } from 'react';
import { Trophy, Check, Share2 } from 'lucide-react';
import { Celebration } from '../services/celebrationService';
import { SystemGoal, getSystemGoalById } from '../services/goalsService';
import { getCredentialByUserAndGoal, BadgeCredential } from '../services/credentialService';
import { getPhaseCertificate } from '../services/phaseCertificateService';
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
  const [phaseInfo, setPhaseInfo] = useState<{ phase: number; phaseName: string } | null>(null);
  const isPhaseCertificate = celebration?.phase_number !== null && celebration?.phase_number !== undefined;

  useEffect(() => {
    if (!celebration || !isOpen) return;
    
    const fetchData = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (isPhaseCertificate && celebration.phase_number) {
          // Handle phase certificate
          const phaseNames: Record<number, string> = {
            1: 'The Quick-Start Sprint',
            2: 'Basic Engagement',
            3: 'Intermediate Tracking',
            4: 'Advanced Budgeting',
            5: 'Financial Mastery'
          };
          const phaseName = phaseNames[celebration.phase_number] || `Phase ${celebration.phase_number}`;
          setPhaseInfo({ phase: celebration.phase_number, phaseName });
          
          // Fetch phase certificate credential
          const phaseCred = await getPhaseCertificate(user.id, celebration.phase_number);
          if (phaseCred) {
            setCredential(phaseCred as BadgeCredential);
          }
        } else if (celebration.goal_id) {
          // Handle regular goal completion
          const goalData = await getSystemGoalById(celebration.goal_id);
          setGoal(goalData);
          
          // Fetch credential for this goal
          const cred = await getCredentialByUserAndGoal(user.id, celebration.goal_id);
          setCredential(cred);
        }
      } catch (error) {
        console.error('Error fetching celebration data:', error);
      }
    };

    fetchData();
  }, [celebration?.goal_id, celebration?.phase_number, isOpen, isPhaseCertificate]);

  if (!isOpen || !celebration) {
    return null;
  }

  // For phase certificates, we don't need goal data
  if (!isPhaseCertificate && !goal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-emerald-500 dark:border-emerald-400 shadow-2xl p-6 max-w-md w-full mx-4 relative animate-scale-in">
        <div className="flex items-start gap-4 mb-6">
          {/* Badge or coin icon image on the left */}
          <div className="flex-shrink-0">
            {isPhaseCertificate ? (
              <img
                src="/Gold_coin_icon.png"
                alt={`Phase ${phaseInfo?.phase} Certificate`}
                className="w-16 h-16 object-contain"
              />
            ) : (
              <img
                src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
                alt={`${goal?.badge_name} badge`}
                className="w-16 h-16 object-contain"
              />
            )}
          </div>

          {/* Content on the right */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">
                Congratulations!
              </h2>
              <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            </div>
            {isPhaseCertificate && phaseInfo ? (
              <>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  You completed all goals in <strong>"{phaseInfo.phaseName}"</strong> and earned your <strong>Phase {phaseInfo.phase} Certificate</strong>!
                </p>
                <p className="text-xs text-slate-500 italic">
                  {celebration.message}
                </p>
              </>
            ) : goal ? (
              <>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  You completed <strong>"{goal.title}"</strong> and earned the <strong>"{goal.badge_name}"</strong> badge!
                </p>
                <p className="text-xs text-slate-500 italic">
                  {goal.description}
                </p>
              </>
            ) : null}
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
            isCertificate={isPhaseCertificate}
            phaseNumber={phaseInfo?.phase}
            phaseName={phaseInfo?.phaseName}
          />
        )}
      </div>
    </div>
  );
};

