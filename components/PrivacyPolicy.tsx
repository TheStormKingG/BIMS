import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
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
          Back to Settings
        </button>

        {/* Privacy Policy Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600 mb-8">Effective Date: January 2025</p>

          <div className="prose prose-slate max-w-none space-y-6">
            <p className="text-slate-700 leading-relaxed">
              We respect your privacy and are committed to protecting your personal data responsibly and transparently.
            </p>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
              <p className="text-slate-700 mb-3">We may collect:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>Images you upload (e.g., receipts)</li>
                <li>Extracted receipt data (dates, items, totals)</li>
                <li>App usage data (features used, errors encountered)</li>
                <li>Basic device information (OS, app version)</li>
              </ul>
              <p className="text-slate-700 mt-3">We do not collect unnecessary personal identifiers.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Information</h2>
              <p className="text-slate-700 mb-3">Your data is used solely to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>Process receipts and display financial insights</li>
                <li>Improve accuracy, performance, and reliability</li>
                <li>Detect errors and enhance user experience</li>
              </ul>
              <p className="text-slate-700 mt-3 font-semibold">We do not sell your data.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Storage & Security</h2>
              <p className="text-slate-700">
                Data is stored securely using industry-standard safeguards. Receipt images may be temporarily processed and deleted once extraction is complete, unless you choose to retain them.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Sharing of Information</h2>
              <p className="text-slate-700 mb-3">We do not share your data with third parties except:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>When legally required</li>
                <li>With trusted service providers under strict confidentiality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Your Rights</h2>
              <p className="text-slate-700">
                You may request access, correction, or deletion of your data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Policy Updates</h2>
              <p className="text-slate-700">
                This policy may be updated to reflect improvements or legal changes. Continued use indicates acceptance.
              </p>
            </section>

            <section className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-slate-700">
                For questions, contact: <a href="mailto:support@stashway.com" className="text-emerald-600 hover:text-emerald-700 font-medium">support@stashway.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

