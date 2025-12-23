import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const promptHandledRef = useRef(false);

  // Check if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (iOS/Android)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      // Check if running in standalone mode (iOS Safari)
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
      // Store globally for access
      (window as any).deferredPrompt = promptEvent;
      console.log('beforeinstallprompt event captured');
      
      // If user is already logged in, trigger modal check
      const hasLoggedIn = sessionStorage.getItem('user_logged_in') === 'true' || 
                          localStorage.getItem('user_logged_in') === 'true';
      if (hasLoggedIn && !promptHandledRef.current) {
        window.dispatchEvent(new Event('user-logged-in'));
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle login and show modal
  useEffect(() => {
    if (isInstalled) {
      return;
    }

    const checkLoginAndShowModal = () => {
      const hasLoggedIn = sessionStorage.getItem('user_logged_in') === 'true' || 
                          localStorage.getItem('user_logged_in') === 'true';
      
      if (!hasLoggedIn) {
        return;
      }

      // Check for deferredPrompt or global stored prompt
      const prompt = deferredPrompt || (window as any).deferredPrompt;
      
      if (prompt && !promptHandledRef.current) {
        // Show modal on first login (only once, marked in localStorage)
        const firstLoginShown = localStorage.getItem('pwa_first_login_shown');
        
        if (!firstLoginShown) {
          console.log('Showing PWA modal on first login');
          setShowModal(true);
          localStorage.setItem('pwa_first_login_shown', 'true');
          promptHandledRef.current = true;
        } else {
          // Show modal on subsequent logins (every time until installed)
          console.log('Showing PWA modal on subsequent login');
          setShowModal(true);
          promptHandledRef.current = true;
        }
      } else if (!prompt) {
        // No prompt available yet, but user is logged in - check again after delay
        console.log('User logged in but prompt not available yet, checking again...');
        setTimeout(() => {
          const retryPrompt = deferredPrompt || (window as any).deferredPrompt;
          if (retryPrompt && !promptHandledRef.current) {
            const firstLoginShown = localStorage.getItem('pwa_first_login_shown');
            if (!firstLoginShown) {
              setShowModal(true);
              localStorage.setItem('pwa_first_login_shown', 'true');
              promptHandledRef.current = true;
            } else {
              setShowModal(true);
              promptHandledRef.current = true;
            }
          }
        }, 1500);
      }
    };

    // Check immediately
    checkLoginAndShowModal();

    // Listen for custom login event (triggered from App.tsx after login)
    const handleLogin = () => {
      console.log('Login event received, checking PWA modal');
      promptHandledRef.current = false; // Reset to allow showing modal again
      setTimeout(checkLoginAndShowModal, 500); // Small delay to ensure deferredPrompt is set
    };

    window.addEventListener('user-logged-in', handleLogin);

    return () => {
      window.removeEventListener('user-logged-in', handleLogin);
    };
  }, [deferredPrompt, isInstalled]);

  // Listen for app installation
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('App installed event received');
      setIsInstalled(true);
      setShowModal(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed on mount
    const installed = localStorage.getItem('pwa_installed') === 'true';
    if (installed || window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (window as any).deferredPrompt;
    
    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
          setIsInstalled(true);
          setShowModal(false);
          localStorage.setItem('pwa_installed', 'true');
        } else {
          console.log('User dismissed the PWA install prompt');
        }
        
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
        promptHandledRef.current = false;
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    } else {
      // Fallback: Show instructions for manual installation
      alert('To install this app:\n\nOn Android: Tap the menu (⋮) and select "Add to Home screen"\n\nOn iOS: Tap the Share button and select "Add to Home Screen"');
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    promptHandledRef.current = false; // Allow showing again on next login
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
