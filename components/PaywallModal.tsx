import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Sparkles } from 'lucide-react';
import { SubscriptionPlan } from '../services/subscriptionService';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan?: SubscriptionPlan;
  featureName?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  requiredPlan = 'pro',
  featureName = 'This feature',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const planNames: Record<SubscriptionPlan, string> = {
    none: 'Free',
    personal: 'Personal',
    pro: 'Pro',
    pro_max: 'Pro Max',
  };

  const planName = planNames[requiredPlan] || 'Pro';

  const handleUpgrade = () => {
    onClose();
    navigate('/settings/pricing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Upgrade Required
        </h2>

        {/* Message */}
        <p className="text-slate-600 text-center mb-6">
          {featureName} requires a <span className="font-semibold text-emerald-600">{planName}</span> plan or higher.
        </p>

        {/* Features highlight */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm">Unlock with {planName}:</span>
          </div>
          <ul className="text-sm text-slate-600 space-y-1 ml-6">
            {requiredPlan === 'personal' && (
              <>
                <li>• Up to 2 bank accounts</li>
                <li>• Basic analytics</li>
                <li>• Up to 3 custom goals</li>
              </>
            )}
            {requiredPlan === 'pro' && (
              <>
                <li>• AI receipt scanning</li>
                <li>• Unlimited bank accounts</li>
                <li>• Advanced analytics</li>
                <li>• CSV & Excel exports</li>
                <li>• AI insights & tips</li>
              </>
            )}
            {requiredPlan === 'pro_max' && (
              <>
                <li>• All Pro features</li>
                <li>• Phase certificates</li>
                <li>• Verifiable badge credentials</li>
                <li>• Unlimited goals</li>
                <li>• All-time analytics</li>
              </>
            )}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
};

