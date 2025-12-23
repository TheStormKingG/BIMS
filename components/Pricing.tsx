import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check } from 'lucide-react';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: 'personal',
      title: 'Personal',
      subtitle: 'Start managing your finances',
      monthlyPrice: 6,
      annualPrice: 6,
      monthlyBilling: 7.99,
      features: [
        'Unlimited Transactions',
        'Unlimited Goals',
        'Receipt Scanning',
        'Basic Reports'
      ],
      popular: false
    },
    {
      id: 'pro',
      title: 'Pro',
      subtitle: 'Build your financial future',
      monthlyPrice: 12,
      annualPrice: 12,
      monthlyBilling: 14.99,
      features: [
        'Everything in Personal',
        'Advanced Analytics',
        'Export to PDF/Excel',
        'Custom Categories',
        'AI Financial Insights'
      ],
      popular: false
    },
    {
      id: 'pro-plus',
      title: 'Pro Plus',
      subtitle: 'Expand your financial mastery',
      monthlyPrice: 24,
      annualPrice: 24,
      monthlyBilling: 28.99,
      features: [
        'Everything in Pro',
        'Priority Support',
        'Multiple Bank Accounts',
        'Advanced Budgeting Tools',
        'Financial Forecasting',
        'Custom Reports'
      ],
      popular: true
    },
    {
      id: 'unlimited',
      title: 'Unlimited',
      subtitle: 'Unlimited room for your business',
      monthlyPrice: 44,
      annualPrice: 44,
      monthlyBilling: 49.99,
      features: [
        'Everything in Pro Plus',
        'Team Collaboration',
        'API Access',
        'White-label Options',
        'Dedicated Account Manager'
      ],
      popular: false
    }
  ];

  const handleGetStarted = (planId: string) => {
    // TODO: Implement subscription logic
    alert(`Starting ${planId} plan subscription...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section with Background */}
      <div 
        className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 py-20 px-4"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)'
        }}
      >
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Affordable plans for all your needs
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Try Stashway's 14-day free trial. No credit card required.
          </p>
          <button
            onClick={() => handleGetStarted('free-trial')}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            Get Started
          </button>
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
                plan.popular ? 'border-emerald-500 relative' : 'border-slate-200'
              }`}
              style={plan.popular ? { marginTop: '-20px' } : {}}
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {plan.title}
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  {plan.subtitle}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-slate-600 text-lg ml-2">
                    / month
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                  Billed annually or ${plan.monthlyBilling.toFixed(2)} month-to-month
                </p>
                <button
                  onClick={() => handleGetStarted(plan.id)}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors mb-6 ${
                    plan.popular
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Try it free
                </button>

                {/* Features List */}
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Call to Action */}
        <div className="text-center">
          <p className="text-lg text-slate-700 mb-6 inline-block">
            Try it Free for 14 days.
          </p>
          <button
            onClick={() => handleGetStarted('free-trial')}
            className="ml-4 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-block"
          >
            Get Started
          </button>
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

