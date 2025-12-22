import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Download, Share2, Linkedin, MessageCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { BadgeCredential } from '../services/credentialService';
import { BadgeCard } from './BadgeCard';
import { Badge } from './Badge';
import { logCredentialEvent } from '../services/credentialService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ShareBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: BadgeCredential;
  isCertificate?: boolean; // true for phase certificates, false for individual badges
  phaseNumber?: number;
  phaseName?: string;
}

export const ShareBadgeModal: React.FC<ShareBadgeModalProps> = ({
  isOpen,
  onClose,
  credential,
  isCertificate = false,
  phaseNumber,
  phaseName,
}) => {
  const [copied, setCopied] = useState<'link' | 'number' | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const badgeCardRef = useRef<HTMLDivElement>(null);

  // Get base URL - use production URL in production, localhost in dev
  const getBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.origin;
    }
    return 'https://stashway.app';
  };

  const verificationUrl = `${getBaseUrl()}/verify/${credential.credential_number}`;

  useEffect(() => {
    const message = `I just earned the ${credential.badge_name} badge on Stashway for ${credential.criteria_summary}.\n\nVerify my achievement: ${verificationUrl}`;
    setShareMessage(message);
  }, [credential.badge_name, credential.criteria_summary, verificationUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
      
      // Log share event
      await logCredentialEvent(credential.id, 'SHARED', {
        method: 'copy_link',
        credential_number: credential.credential_number
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleCopyCredentialNumber = async () => {
    try {
      await navigator.clipboard.writeText(credential.credential_number);
      setCopied('number');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy credential number:', error);
    }
  };

  const handleDownload = async () => {
    if (!badgeCardRef.current) return;

    setDownloading(true);
    try {
      if (isCertificate) {
        // Certificate: Download as PDF (A4 landscape)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const badgeCardElement = badgeCardRef.current;
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '1684px';
        tempContainer.style.height = '1191px';
        tempContainer.style.overflow = 'hidden';
        document.body.appendChild(tempContainer);
        
        const badgeClone = badgeCardElement.cloneNode(true) as HTMLElement;
        badgeClone.style.transform = 'scale(1)';
        badgeClone.style.transformOrigin = 'top left';
        badgeClone.style.position = 'relative';
        badgeClone.style.left = '0';
        badgeClone.style.top = '0';
        tempContainer.appendChild(badgeClone);
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(tempContainer, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          width: 1684,
          height: 1191,
          windowWidth: 1684,
          windowHeight: 1191,
          allowTaint: false,
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`stashway-certificate-${credential.credential_number}.pdf`);

        await logCredentialEvent(credential.id, 'SHARED', {
          method: 'download_pdf',
          credential_number: credential.credential_number
        });
      } else {
        // Badge: Download as PNG (portrait)
        const badgeCardElement = badgeCardRef.current;
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '1191px';
        tempContainer.style.height = '1684px';
        tempContainer.style.overflow = 'hidden';
        document.body.appendChild(tempContainer);
        
        const badgeClone = badgeCardElement.cloneNode(true) as HTMLElement;
        badgeClone.style.transform = 'scale(1)';
        badgeClone.style.transformOrigin = 'top left';
        badgeClone.style.position = 'relative';
        badgeClone.style.left = '0';
        badgeClone.style.top = '0';
        tempContainer.appendChild(badgeClone);
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(tempContainer, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          width: 1191,
          height: 1684,
          windowWidth: 1191,
          windowHeight: 1684,
          allowTaint: false,
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `stashway-badge-${credential.credential_number}.png`;
        link.href = imgData;
        link.click();

        await logCredentialEvent(credential.id, 'SHARED', {
          method: 'download_image',
          credential_number: credential.credential_number
        });
      }
    } catch (error) {
      console.error('Failed to download:', error);
      alert(`Failed to download ${isCertificate ? 'certificate' : 'badge'}. Please try again.`);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    
    // Log share event
    logCredentialEvent(credential.id, 'SHARED', {
      method: 'linkedin',
      credential_number: credential.credential_number
    }).catch(console.error);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(shareMessage);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    
    // Log share event
    logCredentialEvent(credential.id, 'SHARED', {
      method: 'whatsapp',
      credential_number: credential.credential_number
    }).catch(console.error);
  };

  const handleShareX = () => {
    const text = encodeURIComponent(`I just earned the ${credential.badge_name} badge on Stashway!`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(verificationUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    
    // Log share event
    logCredentialEvent(credential.id, 'SHARED', {
      method: 'twitter',
      credential_number: credential.credential_number
    }).catch(console.error);
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verificationUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    
    // Log share event
    logCredentialEvent(credential.id, 'SHARED', {
      method: 'facebook',
      credential_number: credential.credential_number
    }).catch(console.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-slate-900">Share Badge</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
              <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50 overflow-auto" style={{ maxHeight: '600px' }}>
                <div className="origin-top-left" style={{ 
                  transform: isCertificate ? 'scale(0.35)' : 'scale(0.25)', 
                  transformOrigin: 'top left' 
                }}>
                  <div ref={badgeCardRef}>
                    {isCertificate ? (
                      <BadgeCard 
                        credential={credential} 
                        phaseNumber={phaseNumber}
                        phaseName={phaseName}
                      />
                    ) : (
                      <Badge
                        badgeName={credential.badge_name}
                        badgeDescription={credential.badge_description}
                        recipientName={credential.recipient_display_name}
                        credentialNumber={credential.credential_number}
                        issuedAt={credential.issued_at}
                        verificationUrl={verificationUrl}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Share Actions */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Share Options</h3>
                
                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  {copied === 'link' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy Verification Link</span>
                    </>
                  )}
                </button>

                {/* Copy Credential Number */}
                <button
                  onClick={handleCopyCredentialNumber}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  {copied === 'number' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span>Credential Number Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy Credential Number</span>
                    </>
                  )}
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-6 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating {isCertificate ? 'PDF' : 'Image'}...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download {isCertificate ? 'Certificate PDF' : 'Badge Image'}</span>
                    </>
                  )}
                </button>

                {/* Social Sharing */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Share to Social Media</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleShareLinkedIn}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Linkedin className="w-5 h-5" />
                      <span>LinkedIn</span>
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={handleShareX}
                      className="bg-black hover:bg-slate-800 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>X (Twitter)</span>
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>
                </div>

                {/* Share Message Template */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Share Message (editable)
                  </label>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Customize this message before sharing to social media
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

