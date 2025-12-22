import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Check, Trophy, Share2 } from 'lucide-react';
import { useSystemGoals } from '../hooks/useSystemGoals';
import { getUserBadgesWithGoals } from '../services/badgesService';
import { getSupabase } from '../services/supabaseClient';
import { getCredentialByUserAndGoal, BadgeCredential } from '../services/credentialService';
import { getPhaseCertificate } from '../services/phaseCertificateService';
import { ShareBadgeModal } from './ShareBadgeModal';
import { fixMissingCredentialsForUser } from '../services/fixMissingCredentials';

export const SystemGoals: React.FC = () => {
  const navigate = useNavigate();
  const { goals, progress, badges, phaseUnlocks, loading } = useSystemGoals();
  const [badgesWithGoals, setBadgesWithGoals] = useState<Array<{ goal_id: number }>>([]);
  const [credentials, setCredentials] = useState<Map<number, BadgeCredential>>(new Map());
  const [phaseCertificates, setPhaseCertificates] = useState<Map<number, BadgeCredential>>(new Map());
  const [selectedCredential, setSelectedCredential] = useState<BadgeCredential | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const supabase = getSupabase();

  // Function to fetch badges with goal IDs and credentials
  const fetchBadgesAndCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userBadgesWithGoals = await getUserBadgesWithGoals(user.id);
      setBadgesWithGoals(userBadgesWithGoals);

      // Fetch credentials for all completed goals
      const credentialsMap = new Map<number, BadgeCredential>();
      const missingCredentials: number[] = [];
      
      for (const badge of userBadgesWithGoals) {
        const credential = await getCredentialByUserAndGoal(user.id, badge.goal_id);
        if (credential) {
          credentialsMap.set(badge.goal_id, credential);
        } else {
          // Track badges missing credentials for automatic backfill
          missingCredentials.push(badge.goal_id);
        }
      }
      
      setCredentials(credentialsMap);
      
      // Fetch phase certificates
      const phaseCertsMap = new Map<number, BadgeCredential>();
      for (let phase = 1; phase <= 5; phase++) {
        const phaseCert = await getPhaseCertificate(user.id, phase);
        if (phaseCert) {
          phaseCertsMap.set(phase, phaseCert as BadgeCredential);
        }
      }
      setPhaseCertificates(phaseCertsMap);
      
      // Automatically backfill any missing credentials (silently, without user interaction)
      if (missingCredentials.length > 0) {
        console.log(`Found ${missingCredentials.length} badge(s) missing credentials, automatically creating them...`);
        try {
          const createdCount = await fixMissingCredentialsForUser(user.id);
          if (createdCount > 0) {
            console.log(`✓ Automatically created ${createdCount} missing credential(s)`);
            // Refresh credentials after backfill
            for (const goalId of missingCredentials) {
              const credential = await getCredentialByUserAndGoal(user.id, goalId);
              if (credential) {
                credentialsMap.set(goalId, credential);
              }
            }
            setCredentials(new Map(credentialsMap));
          }
        } catch (backfillError) {
          console.error('Error automatically backfilling credentials:', backfillError);
          // Don't show error to user - this is a background operation
        }
      }
    } catch (error) {
      console.error('Error fetching badges with goals:', error);
    }
  };


  // Fetch badges with goal IDs and credentials
  useEffect(() => {
    if (!loading) {
      fetchBadgesAndCredentials();
    }
  }, [loading, supabase]);

  // Create a map of goal ID to progress
  const progressMap = useMemo(() => {
    const map = new Map<number, any>();
    progress.forEach(p => map.set(p.goal_id, p));
    return map;
  }, [progress]);

  // Create a set of goal IDs that have earned badges
  const earnedBadgeGoalIds = useMemo(() => {
    return new Set(badgesWithGoals.map(b => b.goal_id));
  }, [badgesWithGoals]);

  const getProgressForGoal = (goalId: number) => {
    return progressMap.get(goalId);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Loading goals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/goals')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Goals"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Achievement Goals</h2>
            <p className="text-slate-500 text-sm mt-1">
              Complete goals to earn badges and level up your financial skills
            </p>
          </div>
        </div>
      </div>

      {/* Overall Progress Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">
              {badges.length}
            </div>
            <div className="text-sm text-slate-600 mt-1">Badges Earned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Object.values(phaseUnlocks).filter(Boolean).length}
            </div>
            <div className="text-sm text-slate-600 mt-1">Phases Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">
              {Math.round(progress.reduce((sum, p) => sum + p.progress_percentage, 0) / Math.max(progress.length, 1))}%
            </div>
            <div className="text-sm text-slate-600 mt-1">Average Progress</div>
          </div>
        </div>
      </div>

      {/* Goals by Phase */}
      {[1, 2, 3, 4, 5].map(phase => {
        const phaseGoals = goals[phase] || [];
        const isUnlocked = phaseUnlocks[phase] ?? false;
        const phaseCompleted = phaseGoals.filter(g => {
          const prog = getProgressForGoal(g.id);
          return prog?.is_completed;
        }).length;
        const phaseProgress = phaseGoals.length > 0 
          ? Math.round((phaseCompleted / phaseGoals.length) * 100)
          : 0;

        return (
          <div key={phase} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Phase Header */}
            <div className={`p-6 border-b border-slate-200 ${!isUnlocked ? 'bg-slate-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {!isUnlocked && (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Phase {phase}
                      {phase === 1 && ' - The Quick-Start Sprint'}
                      {phase === 2 && ' - Basic Engagement'}
                      {phase === 3 && ' - Intermediate Tracking'}
                      {phase === 4 && ' - Advanced Budgeting'}
                      {phase === 5 && ' - Financial Mastery'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {phaseCompleted} of {phaseGoals.length} goals completed ({phaseProgress}%)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Phase Certificate Icon (Golden Coin) - extreme right */}
                  {phaseCertificates.has(phase) && (
                    <button
                      onClick={() => {
                        const cert = phaseCertificates.get(phase);
                        if (cert) {
                          setSelectedCredential(cert);
                          setShowShareModal(true);
                        }
                      }}
                      className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                      title="Phase Certificate - Click to share"
                    >
                      <img
                        src="/Gold_coin_icon.png"
                        alt={`Phase ${phase} Certificate`}
                        className="w-12 h-12 object-contain"
                      />
                      <span className="text-xs font-semibold text-amber-600">Certificate</span>
                    </button>
                  )}
                  {!isUnlocked && (
                    <div className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium">
                      Locked
                    </div>
                  )}
                </div>
              </div>
              {/* Phase Progress Bar */}
              {isUnlocked && (
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${phaseProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Phase Goals */}
            {isUnlocked ? (
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {phaseGoals.map(goal => {
                    const prog = getProgressForGoal(goal.id);
                    const isCompleted = prog?.is_completed || false;
                    const progressPercent = prog?.progress_percentage || 0;
                    const hasBadge = earnedBadgeGoalIds.has(goal.id);

                    return (
                      <div
                        key={goal.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isCompleted
                            ? 'border-emerald-500 bg-emerald-50/30'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isCompleted ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <span className="text-sm font-bold">{goal.difficulty_rank}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-900">
                                  {goal.title}
                                </h4>
                                {isCompleted && (
                                  <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mb-2">
                                {goal.description}
                              </p>
                              {(!isCompleted || !hasBadge) && (
                                <div className="space-y-1">
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                      {progressPercent}% complete
                                    </span>
                                    <span className="text-xs font-medium text-slate-700">
                                      Badge: {goal.badge_name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Badge on extreme right (only for completed goals with badges) */}
                          {isCompleted && hasBadge ? (
                            <div className="flex flex-col items-center flex-shrink-0 gap-2">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-semibold text-emerald-600 mb-1 text-center">
                                  ✓ Badge Earned:
                                </span>
                                <img
                                  src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
                                  alt={`${goal.badge_name} badge`}
                                  className="w-16 h-16 object-contain"
                                />
                                <span className="text-xs font-semibold text-emerald-600 mt-1 text-center max-w-[80px]">
                                  {goal.badge_name}
                                </span>
                              </div>
                              {/* Share Badge Button */}
                              {credentials.has(goal.id) && (
                                <button
                                  onClick={() => {
                                    const cred = credentials.get(goal.id);
                                    if (cred) {
                                      setSelectedCredential(cred);
                                      setShowShareModal(true);
                                    }
                                  }}
                                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                                  title="Share this badge"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share</span>
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Phase {phase} is Locked</h4>
                <p className="text-slate-500">
                  Complete all goals in Phase {phase - 1} to unlock Phase {phase}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Share Badge Modal */}
      {showShareModal && selectedCredential && (() => {
        const phaseCert = selectedCredential as any;
        const isPhaseCert = phaseCert.goal_id === null && phaseCert.phase_number !== undefined;
        const phaseNumber = isPhaseCert ? phaseCert.phase_number : undefined;
        const phaseNames: Record<number, string> = {
          1: 'The Quick-Start Sprint',
          2: 'Basic Engagement',
          3: 'Intermediate Tracking',
          4: 'Advanced Budgeting',
          5: 'Financial Mastery'
        };
        return (
          <ShareBadgeModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false);
              setSelectedCredential(null);
            }}
            credential={selectedCredential}
            isCertificate={isPhaseCert}
            phaseNumber={phaseNumber}
            phaseName={phaseNumber ? phaseNames[phaseNumber] : undefined}
          />
        );
      })()}
    </div>
  );
};

