import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Copy, ExternalLink, Award, Calendar, User } from 'lucide-react';
import { verifyCredentialPublic } from '../services/credentialService';

interface VerificationResult {
  verified: boolean;
  reason?: string;
  credential?: {
    credential_number: string;
    recipient_display_name: string;
    badge_name: string;
    badge_description: string;
    badge_level?: string;
    issued_at: string;
    issuing_org_name: string;
    issuing_org_url: string;
    goal_title: string;
    criteria_summary: string;
  };
  revoked_at?: string;
  revoked_reason?: string;
}

export const VerifyCredential: React.FC = () => {
  const { credential_number } = useParams<{ credential_number: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!credential_number) {
        setLoading(false);
        setResult({ verified: false, reason: 'NO_NUMBER' });
        return;
      }

      try {
        const verificationResult = await verifyCredentialPublic(credential_number);
        setResult(verificationResult);
      } catch (error) {
        console.error('Error verifying credential:', error);
        setResult({ verified: false, reason: 'ERROR' });
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [credential_number]);

  const handleCopy = () => {
    if (result?.credential?.credential_number) {
      navigator.clipboard.writeText(result.credential.credential_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying credential...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          <XCircle className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Verification Error</h1>
          <p>Unable to verify credential. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!result.verified) {
    if (result.reason === 'REVOKED') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">❌ Revoked</h1>
              <p className="text-slate-600">This credential has been revoked.</p>
            </div>
            
            {result.revoked_at && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Revoked Date:</span>
                </div>
                <p className="text-slate-600">{formatDate(result.revoked_at)}</p>
              </div>
            )}
            
            {result.revoked_reason && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700 mb-1">Reason:</p>
                <p className="text-slate-600">{result.revoked_reason}</p>
              </div>
            )}

            <button
              onClick={() => navigate('/verify')}
              className="w-full mt-6 bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Verify Another Credential
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">❌ Not Verified</h1>
          <p className="text-slate-600 mb-6">
            The credential number provided could not be verified.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Please check the credential number and try again. If you received this from someone,
            ask them for the correct credential number.
          </p>
          <button
            onClick={() => navigate('/verify')}
            className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Verify Another Credential
          </button>
        </div>
      </div>
    );
  }

  const { credential } = result;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">✅ Verified</h1>
            <p className="text-slate-600">This credential has been verified by Stashway</p>
          </div>

          {/* Badge Display */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 mb-6 border-2 border-emerald-200">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
                alt="Badge"
                className="w-24 h-24 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
              {credential.badge_name}
            </h2>
            {credential.badge_level && (
              <p className="text-center text-emerald-700 font-semibold mb-2">
                {credential.badge_level}
              </p>
            )}
            <p className="text-center text-slate-600 text-sm">
              {credential.badge_description}
            </p>
          </div>

          {/* Credential Details */}
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Awarded to:</span>
              </div>
              <p className="text-slate-900 font-medium">{credential.recipient_display_name}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Achievement:</span>
              </div>
              <p className="text-slate-900">{credential.goal_title}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Issued:</span>
              </div>
              <p className="text-slate-900">{formatDate(credential.issued_at)}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Credential ID:</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-slate-900 font-mono text-sm break-all">
                {credential.credential_number}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900 mb-1">Criteria:</p>
              <p className="text-emerald-800 text-sm">{credential.criteria_summary}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">Issued by:</span>
                <a
                  href={credential.issuing_org_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  {credential.issuing_org_name}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Share this verification</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Copy Verification Link
            </button>
            <button
              onClick={() => navigate('/verify')}
              className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              Verify Another Credential
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

