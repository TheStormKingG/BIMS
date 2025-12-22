import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCredential } from '../services/credentialService';

interface BadgeCardProps {
  credential: BadgeCredential;
  phaseNumber?: number;
  phaseName?: string;
  className?: string;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ credential, phaseNumber, phaseName, className = '' }) => {
  const isPhaseCertificate = phaseNumber !== undefined && phaseNumber !== null;
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
  // At 144 DPI (web display): 1684px x 1191px
  const a4LandscapeWidth = 1684;
  const a4LandscapeHeight = 1191;
  
  return (
    <div 
      className={`bg-white ${className}`} 
      style={{ 
        width: `${a4LandscapeWidth}px`, 
        height: `${a4LandscapeHeight}px`,
        display: 'flex',
        flexDirection: 'row',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        position: 'relative',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}
    >
      {/* Subtle background pattern */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Large watermark badge in center background */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.05,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      >
        <img
          src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
          alt="Watermark"
          style={{ width: '600px', height: '600px', objectFit: 'contain' }}
        />
      </div>

      {/* Main Content Area */}
      <div 
        style={{
          flex: 1,
          padding: '60px 80px 50px 80px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
            VERIFIED
          </div>
          <div style={{ fontSize: '18px', color: '#6b7280', fontWeight: '500', letterSpacing: '1px' }}>
            CERTIFICATE of ACHIEVEMENT
          </div>
        </div>

        {/* Main Certificate Text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '16px', color: '#4b5563', marginBottom: '30px', lineHeight: '1.6' }}>
            This is to certify that
          </div>
          
          <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#111827', marginBottom: '30px', lineHeight: '1.2' }}>
            {credential.recipient_display_name}
          </div>
          
          <div style={{ fontSize: '16px', color: '#4b5563', marginBottom: '30px', lineHeight: '1.6' }}>
            successfully completed and received a passing grade in
          </div>
          
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '20px', lineHeight: '1.3' }}>
            {credential.goal_title}
          </div>

          {/* Achievement Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '30px', marginBottom: '40px' }}>
            <img
              src={isPhaseCertificate ? "/Gold_coin_icon.png" : "/pngtree-3d-star-badge-clipart-png-image_6564314.png"}
              alt={isPhaseCertificate ? "Phase Certificate" : "Badge"}
              style={{ width: '120px', height: '120px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                {credential.badge_name}
              </div>
              {credential.badge_level && (
                <div style={{ fontSize: '18px', color: '#059669', fontWeight: '600' }}>
                  {credential.badge_level}
                </div>
              )}
              {isPhaseCertificate && phaseName && (
                <div style={{ fontSize: '18px', color: '#059669', fontWeight: '600', marginTop: '8px' }}>
                  {phaseName}
                </div>
              )}
            </div>
          </div>

          {/* 30-word Description - appears after badge, before QR code */}
          <div style={{ fontSize: '16px', color: '#4b5563', marginBottom: '40px', lineHeight: '1.6', maxWidth: '700px' }}>
            {credential.badge_description}
          </div>
        </div>

        {/* Bottom Section with QR Code and Verification */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '60px', marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #e5e7eb' }}>
          {/* Left: QR Code and Issue Details */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '30px' }}>
            <div>
              <QRCodeSVG value={verificationUrl} size={120} level="H" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
                ISSUE DATE
              </div>
              <div style={{ fontSize: '14px', color: '#111827', marginBottom: '20px', fontFamily: 'monospace' }}>
                {credential.credential_number}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563' }}>
                Issued {formatDate(credential.issued_at)}
              </div>
            </div>
          </div>

          {/* Right: Verification URL */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
              VERIFY AT:
            </div>
            <div style={{ fontSize: '13px', color: '#059669', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.5' }}>
              {verificationUrl}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div 
        style={{
          width: '280px',
          backgroundColor: '#f9fafb',
          borderLeft: '1px solid #e5e7eb',
          padding: '50px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box'
        }}
      >
        {/* Logo at top */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <img
            src="/stashway-logo.png"
            alt="Stashway Logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '15px' }}
          />
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', letterSpacing: '1px' }}>
            Stashway
          </div>
        </div>

        {/* Verified Seal */}
        <div 
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: '#059669',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #10b981',
            marginBottom: '40px',
            position: 'relative'
          }}
        >
          {/* Outer dotted circle */}
          <div 
            style={{
              position: 'absolute',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: '2px dashed #ffffff',
              opacity: 0.5
            }}
          />
          {/* Inner dotted circle */}
          <div 
            style={{
              position: 'absolute',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              border: '2px dashed #ffffff',
              opacity: 0.3
            }}
          />
          {/* Checkmark */}
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#ffffff" />
          </svg>
          {/* Text around seal */}
          <div style={{ position: 'absolute', bottom: '-30px', fontSize: '11px', color: '#059669', fontWeight: 'bold', letterSpacing: '1px' }}>
            VERIFIED CERTIFICATE
          </div>
        </div>

        {/* Signature Area */}
        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            {credential.issuing_org_name}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }}>
            {credential.issuing_org_url}
          </div>
        </div>
      </div>
    </div>
  );
};
