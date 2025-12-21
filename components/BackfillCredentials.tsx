import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { backfillMissingCredentials, checkForMissingCredentials } from '../services/backfillCredentialsService';

/**
 * Component to backfill credentials for existing badges
 * This should be shown to admins or run automatically once
 */
export const BackfillCredentials: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [missingCount, setMissingCount] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    checkMissing();
  }, []);

  const checkMissing = async () => {
    setChecking(true);
    try {
      const count = await checkForMissingCredentials();
      setMissingCount(count);
    } catch (error) {
      console.error('Error checking for missing credentials:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleBackfill = async () => {
    if (!confirm(`This will create credentials for ${missingCount} existing badges. Continue?`)) {
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const backfillResults = await backfillMissingCredentials();
      setResults(backfillResults);
      // Re-check after backfill
      await checkMissing();
    } catch (error: any) {
      setResults({
        success: 0,
        failed: 0,
        errors: [error.message || 'Failed to backfill credentials'],
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-slate-600">Checking for missing credentials...</span>
        </div>
      </div>
    );
  }

  if (missingCount === 0 && !results) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-800 font-medium">
            All badges have credentials! No backfill needed.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Backfill Badge Credentials</h3>
          <p className="text-sm text-slate-600 mt-1">
            {missingCount > 0
              ? `${missingCount} badge(s) need credentials (earned before credentials system was added)`
              : 'No badges need credentials'}
          </p>
        </div>
        <button
          onClick={checkMissing}
          disabled={loading || checking}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 text-slate-600 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {missingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium mb-1">
                Missing Credentials Detected
              </p>
              <p className="text-sm text-amber-700">
                Some badges were earned before the credentials system was implemented. Click the
                button below to create credentials for them so they can be shared and verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {missingCount > 0 && (
        <button
          onClick={handleBackfill}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Backfilling Credentials...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Backfill {missingCount} Missing Credential{missingCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </button>
      )}

      {results && (
        <div className={`rounded-lg p-4 border ${
          results.failed === 0
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3 mb-3">
            {results.failed === 0 ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium mb-1 ${
                results.failed === 0 ? 'text-emerald-800' : 'text-amber-800'
              }`}>
                Backfill Complete
              </p>
              <p className={`text-sm ${
                results.failed === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {results.success} credential(s) created successfully
                {results.failed > 0 && `, ${results.failed} failed`}
              </p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800">Errors:</p>
              <ul className="text-xs text-amber-700 space-y-1">
                {results.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

