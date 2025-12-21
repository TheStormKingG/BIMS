import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Award } from 'lucide-react';

export const VerifySearch: React.FC = () => {
  const navigate = useNavigate();
  const [credentialNumber, setCredentialNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!credentialNumber.trim()) {
      setError('Please enter a credential number');
      return;
    }

    // Format validation (STW-YYYY-XXXXXX)
    const credentialPattern = /^STW-\d{4}-[A-Z0-9]{6}$/;
    if (!credentialPattern.test(credentialNumber.trim().toUpperCase())) {
      setError('Invalid credential number format. Expected: STW-YYYY-XXXXXX');
      return;
    }

    // Navigate to verification page
    navigate(`/verify/${credentialNumber.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/stashway-logo.png"
              alt="Stashway Logo"
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Verify Badge Credential
          </h1>
          <p className="text-slate-600">
            Enter a credential number to verify its authenticity
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="credential-number" className="block text-sm font-medium text-slate-700 mb-2">
                Credential Number
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="credential-number"
                  type="text"
                  value={credentialNumber}
                  onChange={(e) => {
                    setCredentialNumber(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="STW-2025-XXXXXX"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Format: STW-YYYY-XXXXXX (e.g., STW-2025-9F4KQ2)
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Verify Credential
            </button>
          </form>

          {/* Info Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">About Verification</h3>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• All credentials are cryptographically signed</li>
              <li>• Verification confirms authenticity and active status</li>
              <li>• No login required to verify</li>
              <li>• Credentials can be shared publicly</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a
            href="/about"
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            Learn more about Stashway badges
          </a>
        </div>
      </div>
    </div>
  );
};

