import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { updateUserSubscriptionPlan, SubscriptionPlan } from '../services/subscriptionService';
import { getSupabase } from '../services/supabaseClient';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { entitlement, subscription, refreshSubscription } = useSubscription();
  const [selectingPlan, setSelectingPlan] = useState<string | null>(null);

  // Convert USD to GYD (approximately 209 GYD per USD)
  const usdToGyd = (usd: number) => Math.round(usd * 209);

  const handleChoosePlan = async (planId: string) => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('Please log in to choose a plan');
      return;
    }

    // Navigate to MMG payment flow instead of directly updating subscription
    navigate(`/pay/mmg?plan=${planId}`);
  };

  const plans = [
    {
      id: 'personal',
      title: 'Personal',
      subtitle: 'Foundation & Awareness',
      usdPrice: 9,
      gydPrice: usdToGyd(9),
      popular: false,
      features: [
        'Cash Wallet Management (GYD denominations)',
        'Single Cash Wallet',
        'Up to 2 Bank Accounts',
        'Account Balance Tracking',
        'Funds In/Out Transactions',
        'Multi-Account basics (within limits)',
        'Net Worth Calculation (basic)',
        'Manual Transaction Entry',
        'Transaction Categorization',
        'Monthly Transaction View',
        'Transaction Search',
        'Overview Dashboard (basic cards)',
        'Spending Metrics (Today, 7 Days, 30 Days)',
        'Category Spending Pie Chart',
        'Limited Analytics (last 30 days only)',
        'Up to 3 Custom Spending Goals',
        'Phase 1 Achievement System + Phase 1 badges only',
        'Conversational AI (general Q&A only; no data-aware insights)',
        'App sharing',
        'PDF Export (summary only)',
        'Profile & Settings + legal pages',
      ],
    },
    {
      id: 'pro',
      title: 'Pro',
      subtitle: 'Automation & Insight',
      usdPrice: 18,
      gydPrice: usdToGyd(18),
      popular: true,
      features: [
        'Everything in Personal',
        'Unlimited Bank Accounts',
        'Full Net Worth tracking (all accounts)',
        'Archive Bank Accounts',
        'AI Receipt Scanning (Gemini)',
        'Automatic Receipt Parsing',
        'Receipt Image Storage',
        'Receipt Modal View',
        'Transaction editing + deletion',
        'Advanced Analytics (7d, 30d, 90d, 3m, 6m, 1y)',
        'Category/time filters',
        'Top Spending Item section',
        'Up to 15 Custom Goals',
        'Achievement phases 1–3',
        '30+ badges',
        'Celebration modals',
        'Contextual AI (reads user spending data)',
        'AI insights',
        'AI tips generation',
        'Tips settings',
        'PDF detailed exports',
        'CSV exports',
        'Excel exports',
      ],
    },
    {
      id: 'pro_max',
      title: 'Pro Max',
      subtitle: 'Mastery & Proof',
      usdPrice: 45,
      gydPrice: usdToGyd(45),
      popular: false,
      features: [
        'Everything in Pro',
        'Full-history analytics (All-time)',
        'Predictive spending pattern insights (Coming soon)',
        'Advanced AI coaching (Coming soon)',
        'Unlimited custom goals',
        'All 5 achievement phases',
        'All 50 system goals',
        'All 50 badges',
        'Phase completion certificates (gold coin certificates)',
        'Verifiable badge credentials',
        'QR verification pages',
        'Public verification',
        'Social sharing optimized for achievements',
        'Full dashboard PDF export',
        'Full history exports',
        'Priority access / early access flags for future features',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section with Background */}
      <div 
        className="relative py-20 px-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/pexels-andriy-nestruiev-288919368-19896100.jpg)'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Affordable plans for all your needs
          </h1>
          <p className="text-xl text-white/95 mb-8 drop-shadow-md">
            Start with a free 14-day trial. No credit card required.
          </p>
        </div>
      </div>

      {/* Pricing Plans Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Most Popular Badge */}
        <div className="relative mb-8">
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 z-20">
            <div className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
              MOST POPULAR
            </div>
          </div>
        </div>

        {/* Current Plan / Trial Status Banner */}
        {(entitlement.isTrialActive || entitlement.isPaidActive) && (
          <div className="mb-8 max-w-3xl mx-auto">
            <div className={`rounded-xl p-6 text-center border-2 ${
              entitlement.isTrialActive 
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              {entitlement.isTrialActive ? (
                <>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3">
                    <span className="text-xl font-bold text-emerald-900">
                      🎉 You're on a Free Trial
                    </span>
                    {entitlement.daysLeftOnTrial !== null && (
                      <span className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                        {entitlement.daysLeftOnTrial} {entitlement.daysLeftOnTrial === 1 ? 'day' : 'days'} remaining
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-800 text-sm mb-2">
                    Your trial gives you full access to <strong className="font-semibold">Pro</strong> features
                  </p>
                  <p className="text-emerald-700 text-xs">
                    {subscription?.trial_end_at 
                      ? `Trial ends ${new Date(subscription.trial_end_at).toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}`
                      : 'Choose a plan to continue after your trial ends'
                    }
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold text-slate-900 mb-2">
                    Current Plan: <span className="text-emerald-600 capitalize">{entitlement.currentPlan === 'none' ? 'None' : entitlement.currentPlan.replace('_', ' ')}</span>
                  </div>
                  <p className="text-slate-600 text-sm">
                    You can upgrade or change your plan at any time
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-7xl mx-auto">
          {plans.map((plan) => {
            // Determine if this is the user's current effective plan
            // Trial = Pro access, so show "Current" on Pro during trial
            const isCurrentPlan = entitlement.isTrialActive 
              ? plan.id === 'pro'  // Trial grants Pro access
              : entitlement.currentPlan === plan.id;
            const isSelecting = selectingPlan === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
                  plan.popular ? 'border-emerald-500 relative' : 'border-slate-200'
                } ${isCurrentPlan ? 'ring-2 ring-emerald-400 border-emerald-500' : ''}`}
                style={plan.popular ? { marginTop: '-20px' } : {}}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {plan.title}
                    </h3>
                    {isCurrentPlan && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                        {entitlement.isTrialActive ? 'Trial' : 'Current'}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-6">
                    {plan.subtitle}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900">
                      GYD {plan.gydPrice.toLocaleString()}
                    </span>
                    <span className="text-slate-600 text-lg ml-2">
                      / month
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-6">
                    ${plan.usdPrice} USD per month
                  </p>
                  <button
                    onClick={() => handleChoosePlan(plan.id)}
                    disabled={isCurrentPlan || isSelecting}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors mb-6 ${
                      isCurrentPlan
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-400'
                        : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400'
                    }`}
                  >
                    {isSelecting ? 'Processing...' : isCurrentPlan ? (entitlement.isTrialActive ? 'Trial Active' : 'Current Plan') : 'Choose Plan'}
                  </button>

                  {/* Features List */}
                  <div className="max-h-96 overflow-y-auto">
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700 text-xs">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
          <span>Back to Settings</span>
        </button>
      </div>
    </div>
  );
};
