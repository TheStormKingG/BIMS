import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (iOS)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      // Check if running in standalone mode (Android)
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if user has logged in (stored in sessionStorage or localStorage)
    const checkLoginAndShowModal = () => {
      const hasLoggedIn = sessionStorage.getItem('user_logged_in') === 'true' || 
                          localStorage.getItem('user_logged_in') === 'true';
      
      if (hasLoggedIn && deferredPrompt && !isInstalled) {
        const firstLoginShown = localStorage.getItem('pwa_first_login_shown');
        
        // Show modal on first login (only once)
        if (!firstLoginShown) {
          setShowModal(true);
          localStorage.setItem('pwa_first_login_shown', 'true');
        } else {
          // Show modal on subsequent logins (every time until installed)
          setShowModal(true);
        }
      }
    };

    // Check immediately and also listen for login events
    checkLoginAndShowModal();

    // Listen for custom login event (can be triggered from App.tsx after login)
    const handleLogin = () => {
      setTimeout(checkLoginAndShowModal, 500); // Small delay to ensure deferredPrompt is set
    };

    window.addEventListener('user-logged-in', handleLogin);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('user-logged-in', handleLogin);
    };
  }, [deferredPrompt, isInstalled]);

  // Listen for app installation
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowModal(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setIsInstalled(true);
        setShowModal(false);
      } else {
        console.log('User dismissed the PWA install prompt');
      }
      
      setDeferredPrompt(null);
    } else {
      // Fallback: Show instructions for manual installation
      alert('To install this app:\n\nOn Android: Tap the menu (⋮) and select "Add to Home screen"\n\nOn iOS: Tap the Share button and select "Add to Home Screen"');
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (!showModal || isInstalled) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Install Stashway™
          </h2>
          <p className="text-slate-600">
            Install Stashway™ to your device for easier access and offline use!
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
