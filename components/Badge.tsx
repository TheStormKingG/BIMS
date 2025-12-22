import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface BadgeProps {
  badgeName: string;
  badgeDescription: string;
  recipientName: string;
  credentialNumber: string;
  issuedAt: string;
  verificationUrl: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  badgeName,
  badgeDescription,
  recipientName,
  credentialNumber,
  issuedAt,
  verificationUrl,
  className = ''
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Portrait orientation for badges (aspect ratio ~3:4)
  // Using A4 portrait equivalent: 210mm x 297mm = 1191px x 1684px at 144 DPI
  const badgeWidth = 1191;
  const badgeHeight = 1684;
  
  return (
    <div 
      className={`bg-white ${className}`} 
      style={{ 
        width: `${badgeWidth}px`, 
        height: `${badgeHeight}px`,
        display: 'flex',
        flexDirection: 'column',
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

      {/* Top Section */}
      <div style={{ padding: '50px 60px 40px 60px', position: 'relative', zIndex: 1, boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ marginBottom: '50px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
            VERIFIED
          </div>
          <div style={{ fontSize: '24px', color: '#111827', fontWeight: '600', letterSpacing: '1px' }}>
            BADGE
          </div>
        </div>

        {/* Logo at top right */}
        <div style={{ position: 'absolute', top: '50px', right: '60px', textAlign: 'right' }}>
          <img
            src="/stashway-logo.png"
            alt="Stashway Logo"
            style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '10px' }}
          />
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
            Stashway
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 60px 60px 60px',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box'
      }}>
        {/* Badge Title */}
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#111827', marginBottom: '40px', textAlign: 'center' }}>
          {badgeName}
        </div>

        {/* Badge Image */}
        <div style={{ marginBottom: '40px' }}>
          <img
            src="/pngtree-3d-star-badge-clipart-png-image_6564314.png"
            alt="Badge"
            style={{ width: '400px', height: '400px', objectFit: 'contain' }}
          />
        </div>

        {/* Welcome Message */}
        <div style={{ fontSize: '22px', color: '#374151', textAlign: 'center', maxWidth: '800px', lineHeight: '1.5', marginBottom: '60px' }}>
          {badgeDescription}
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ 
        padding: '40px 60px 50px 60px', 
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '40px',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box'
      }}>
        {/* QR Code */}
        <div>
          <QRCodeSVG value={verificationUrl} size={120} level="H" />
        </div>

        {/* Issue Details */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '10px', letterSpacing: '0.5px' }}>
            ISSUE DATE
          </div>
          <div style={{ fontSize: '14px', color: '#111827', marginBottom: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
            {credentialNumber}
          </div>
          <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px' }}>
            Issued {formatDate(issuedAt)}
          </div>
          
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
            VERIFY AT:
          </div>
          <div style={{ fontSize: '13px', color: '#059669', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.5' }}>
            {verificationUrl}
          </div>
        </div>
      </div>
    </div>
  );
};

