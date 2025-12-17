import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const SettingsTerms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Terms & Conditions Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms & Conditions</h1>
          <div className="text-slate-600 mb-8 space-y-1">
            <p>Effective Date: January 2025</p>
            <p>Last Updated: January 2025</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-6">
            <p className="text-slate-700 leading-relaxed">
              These Terms & Conditions ("Terms") govern your use of Stashway – Personal Finance ("Stashway," "the App," "we," "us," or "our"), operated by Stashway Inc., incorporated in Guyana, with its principal place of business in Georgetown, Guyana.
            </p>

            <p className="text-slate-700 leading-relaxed">
              Legal contact: <a href="mailto:legal@stashway.app" className="text-emerald-600 hover:text-emerald-700 font-medium">legal@stashway.app</a>
            </p>

            <p className="text-slate-700 leading-relaxed font-semibold">
              By accessing or using Stashway, you agree to these Terms. If you do not agree, do not use the App.
            </p>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. What Stashway Is (and Is Not)</h2>
              <p className="text-slate-700 mb-3">Stashway is a personal finance tracking, analytics, and insights application. It allows users to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Record wallet cash balances</li>
                <li>Record bank account balances (manual, read-only; no bank integrations)</li>
                <li>Scan receipts and track spending</li>
                <li>View summaries, trends, averages, and visual insights</li>
                <li>Interact with AI-powered chat and insights features</li>
                <li>Participate in optional gamified challenges and rankings</li>
              </ul>
              <p className="text-slate-700 mb-3 font-semibold">Stashway is not:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>A bank</li>
                <li>A payment processor</li>
                <li>A financial, investment, tax, or accounting advisor</li>
                <li>A fiduciary or professional service provider</li>
              </ul>
              <p className="text-slate-700">
                The App does not hold, move, transmit, or process money. All outputs are informational and educational only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Eligibility</h2>
              <p className="text-slate-700">
                You must be 18 years or older to use Stashway. By using the App, you confirm you have legal capacity to enter into these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Responsibilities</h2>
              <p className="text-slate-700 mb-3">You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>The accuracy of all data you enter or upload</li>
                <li>Verifying receipt extractions, totals, categories, and analytics</li>
                <li>Any financial decisions you make using the App</li>
              </ul>
              <p className="text-slate-700 mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Upload fake, misleading, or fraudulent receipts</li>
                <li>Upload illegal content</li>
                <li>Upload other people's personal or financial data without consent</li>
                <li>Use the App to facilitate fraud, money laundering, or illegal activity</li>
                <li>Manipulate analytics, rankings, or points systems</li>
              </ul>
              <p className="text-slate-700">Misuse may result in suspension or termination.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Receipt Scanning & Data Accuracy</h2>
              <p className="text-slate-700 mb-3">
                Receipt scanning uses automated image processing and OCR technology. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Errors, omissions, or misclassifications may occur</li>
                <li>Totals, categories, and analytics may be inaccurate</li>
                <li>You must review and confirm all extracted data</li>
              </ul>
              <p className="text-slate-700">We are not responsible for decisions made based on receipt analysis.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. AI Features & AI Chat</h2>
              <p className="text-slate-700 mb-3">Stashway may include AI-powered features ("AI Services"), including:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Chat-based assistance</li>
                <li>Automated analysis of your financial data</li>
                <li>Personalized tips, insights, and suggested targets</li>
              </ul>
              <p className="text-slate-700 mb-3 font-semibold">Important AI Disclosures</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>AI outputs are not financial advice</li>
                <li>AI may generate incorrect, incomplete, or unsuitable suggestions</li>
                <li>AI does not understand your full personal circumstances</li>
              </ul>
              <p className="text-slate-700">You agree to independently evaluate AI outputs before acting on them.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. No Financial Advice or Professional Relationship</h2>
              <p className="text-slate-700 mb-3">Nothing in the App, including AI-generated content, constitutes:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Financial advice</li>
                <li>Investment advice</li>
                <li>Tax advice</li>
                <li>Accounting advice</li>
              </ul>
              <p className="text-slate-700">Use of Stashway does not create any professional-client relationship.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Data Ownership & Use</h2>
              <p className="text-slate-700 mb-3">You retain ownership of all data you upload.</p>
              <p className="text-slate-700 mb-3">By using Stashway, you grant us a limited license to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Process your data to deliver App functionality</li>
                <li>Use anonymized and aggregated data to improve OCR, AI accuracy, system reliability, and user experience</li>
              </ul>
              <p className="text-slate-700 font-semibold">We do not sell your personal data.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Gamification, Points & Rankings</h2>
              <p className="text-slate-700 mb-3">Stashway may include gamified features such as:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Savings or spending challenges</li>
                <li>Targets and streaks</li>
                <li>Points, badges, levels, or rankings</li>
                <li>Optional leaderboards</li>
              </ul>
              <p className="text-slate-700 mb-3 font-semibold">Gamification Rules</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Points and rankings are for motivation and entertainment only</li>
                <li>They have no monetary value and are non-transferable</li>
                <li>We may modify scoring rules, rankings, or rewards at any time</li>
              </ul>
              <p className="text-slate-700">You may not manipulate or exploit the gamification system. Abuse may result in loss of points or account suspension.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Fair Use & Ethical Conduct</h2>
              <p className="text-slate-700 mb-3">You agree to use Stashway ethically and responsibly.</p>
              <p className="text-slate-700 mb-3">Prohibited uses include:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Financial crime facilitation</li>
                <li>Discriminatory, harmful, or abusive behavior</li>
                <li>System exploitation or automation abuse</li>
              </ul>
              <p className="text-slate-700">We reserve the right to enforce ethical safeguards to protect users and the platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Availability & "As Is" Use</h2>
              <p className="text-slate-700 mb-3">The App is provided "as is" and "as available."</p>
              <p className="text-slate-700 mb-3">We do not guarantee:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Continuous availability</li>
                <li>Error-free operation</li>
                <li>Accuracy of analytics, AI outputs, or insights</li>
              </ul>
              <p className="text-slate-700">Features may change, pause, or be discontinued.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Limitation of Liability</h2>
              <p className="text-slate-700 mb-3">To the maximum extent permitted by law:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>We are not liable for AI errors, OCR errors, analytics inaccuracies, or financial decisions</li>
                <li>We are not liable for downtime, data loss, or indirect damages</li>
              </ul>
              <p className="text-slate-700 mb-3">If liability is established, it is limited to the greater of:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Fees paid by you in the last 12 months, or</li>
                <li>USD 50 (or local equivalent) if the App is free</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">12. Pricing & Future Changes</h2>
              <p className="text-slate-700 mb-3">Stashway is currently free.</p>
              <p className="text-slate-700">We may introduce paid features, tiers, or pricing in the future with reasonable notice.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">13. Account Termination</h2>
              <p className="text-slate-700 mb-3">You may delete your account at any time, subject to legal retention requirements.</p>
              <p className="text-slate-700 mb-3">We may suspend or terminate accounts without prior notice where:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Fraud, misuse, or illegal activity is suspected</li>
                <li>System integrity or user safety is at risk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">14. Governing Law & Disputes</h2>
              <p className="text-slate-700 mb-3">These Terms are governed by the laws of Guyana (unless updated).</p>
              <p className="text-slate-700 mb-3">Disputes will follow this order:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4 mb-3">
                <li>Informal resolution via <a href="mailto:legal@stashway.app" className="text-emerald-600 hover:text-emerald-700 font-medium">legal@stashway.app</a></li>
                <li>Courts of competent jurisdiction in Guyana</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">15. Changes to These Terms</h2>
              <p className="text-slate-700">
                We may update these Terms periodically. Continued use of the App constitutes acceptance of the updated Terms.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

