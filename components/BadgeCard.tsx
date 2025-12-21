import React from 'react';
import { BadgeCredential } from '../services/credentialService';

interface BadgeCardProps {
  credential: BadgeCredential;
  className?: string;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ credential, className = '' }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get base URL - use production URL in production, localhost in dev
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return window.location.origin;
      }
      return 'https://stashway.app';
    }
    return 'https://stashway.app';
  };

  const verificationUrl = `${getBaseUrl()}/verify/${credential.credential_number}`;

  // A4 landscape dimensions: 297mm x 210mm
  // At 300 DPI (print quality): 3508px x 2480px
  // At 144 DPI (web display): 1684px x 1191px
  // Using 1684x1191 for screen display, html2canvas will scale up for print
  const a4LandscapeWidth = 1684;
  const a4LandscapeHeight = 1191;
  
  return (
    <div 
      className={`bg-white ${className}`} 
      style={{ 
        width: `${a4LandscapeWidth}px`, 
        height: `${a4LandscapeHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* Header Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-12 py-5 border-b-2 border-emerald-200 flex-shrink-0" style={{ boxSizing: 'border-box' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img
              src="/stashway-logo.png"
              alt="Stashway Logo"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Certificate of Achievement</h1>
              <p className="text-sm text-slate-600">Stashway Badge Credential</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Flex to fill available space */}
      <div className="px-12 py-6 flex-1 flex flex-col justify-center min-h-0" style={{ boxSizing: 'border-box' }}>
        {/* Badge Display */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
              alt="Badge"
              className="w-48 h-48 object-contain"
            />
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-2">
            {credential.badge_name}
          </h2>
          {credential.badge_level && (
            <p className="text-xl text-emerald-700 font-semibold mb-3">
              {credential.badge_level}
            </p>
          )}
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
            {credential.badge_description}
          </p>
        </div>

        {/* Awarded To Section */}
        <div className="text-center mb-6">
          <p className="text-base text-slate-600 mb-2">Awarded to</p>
          <p className="text-3xl font-bold text-slate-900">
            {credential.recipient_display_name}
          </p>
        </div>

        {/* Horizontal Divider */}
        <div className="border-t border-emerald-200 my-6"></div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">Achievement</p>
            <p className="text-base text-slate-900">{credential.goal_title}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">Issued</p>
            <p className="text-base text-slate-900">{formatDate(credential.issued_at)}</p>
          </div>
        </div>

        {/* Criteria */}
        <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-900 mb-1">Criteria</p>
          <p className="text-base text-emerald-800 leading-relaxed">{credential.criteria_summary}</p>
        </div>

        {/* Credential Number */}
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-1">Credential ID</p>
          <p className="text-xl font-mono text-slate-900">{credential.credential_number}</p>
        </div>
      </div>

      {/* Footer Section */}
      <div className="bg-slate-50 px-12 py-5 border-t-2 border-slate-200 flex-shrink-0" style={{ boxSizing: 'border-box' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">Issued by</p>
            <p className="text-lg font-semibold text-slate-900">{credential.issuing_org_name}</p>
            <p className="text-sm text-slate-600">{credential.issuing_org_url}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600 mb-1">Verify this credential</p>
            <p className="text-sm font-mono text-emerald-600 break-all max-w-md">
              {verificationUrl}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

