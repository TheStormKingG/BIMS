import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Smartphone, HelpCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Helper function to detect if PWA installation is possible
const canInstallPWA = (): boolean => {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return false;
  }
  if ((window.navigator as any).standalone === true) {
    return false;
  }
  
  // Check if service worker and manifest are available (basic PWA requirements)
  // These checks ensure the app is installable even if beforeinstallprompt hasn't fired
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  
  return hasServiceWorker && hasHTTPS;
};

// Helper function to detect browser type
const getBrowserInfo = (): { name: string; isSamsung: boolean; isIOS: boolean; isAndroid: boolean } => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isSamsung = /samsungbrowser/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  let name = 'unknown';
  if (isSamsung) {
    name = 'Samsung Internet';
  } else if (userAgent.includes('chrome')) {
    name = 'Chrome';
  } else if (userAgent.includes('firefox')) {
    name = 'Firefox';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    name = 'Safari';
  } else if (userAgent.includes('edge')) {
    name = 'Edge';
  }
  
  return { name, isSamsung, isIOS, isAndroid };
};

// Get manual installation instructions based on browser
const getManualInstallInstructions = (): string => {
  const { name, isSamsung, isIOS, isAndroid } = getBrowserInfo();
  
  if (isIOS) {
    return 'Tap the Share button (square with arrow) at the bottom, then scroll down and tap "Add to Home Screen".';
  } else if (isSamsung) {
    return 'Tap the Menu button (three dots) in the top right, then tap "Add page to" and select "Home screen".';
  } else if (isAndroid) {
    return 'Tap the Menu button (three dots) in the top right, then tap "Add to Home screen" or "Install app".';
  } else {
    return 'Look for an install icon in your browser\'s address bar, or use the browser menu to add this page to your home screen.';
  }
};

export const InstallModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const promptHandledRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Check if PWA can be installed
    setCanInstall(canInstallPWA());

    // Listen for the beforeinstallprompt event (Chrome, Edge, Samsung Internet on newer versions)
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
        // Delay slightly to ensure state is updated
        setTimeout(() => {
          window.dispatchEvent(new Event('user-logged-in'));
        }, 100);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Handle login and show modal with improved retry logic
  useEffect(() => {
    if (isInstalled) {
      return;
    }

    const checkLoginAndShowModal = (retryCount: number = 0) => {
      const hasLoggedIn = sessionStorage.getItem('user_logged_in') === 'true' || 
                          localStorage.getItem('user_logged_in') === 'true';
      
      if (!hasLoggedIn) {
        return;
      }

      // Check if PWA can be installed (even without beforeinstallprompt)
      const installable = canInstallPWA();
      if (!installable) {
        console.log('PWA installation not available on this device/browser');
        return;
      }

      // Check for deferredPrompt or global stored prompt
      const prompt = deferredPrompt || (window as any).deferredPrompt;
      
      // Show modal if:
      // 1. We have a native prompt available, OR
      // 2. PWA is installable but we don't have the prompt yet (show manual instructions)
      const shouldShow = (prompt || canInstall) && !promptHandledRef.current;
      
      if (shouldShow) {
        const firstLoginShown = localStorage.getItem('pwa_first_login_shown');
        
        if (!firstLoginShown) {
          console.log('Showing PWA modal on first login');
          setShowModal(true);
          setShowManualInstructions(!prompt); // Show manual instructions if no native prompt
          localStorage.setItem('pwa_first_login_shown', 'true');
          promptHandledRef.current = true;
        } else {
          // Show modal on subsequent logins (every time until installed)
          // Only show if user hasn't dismissed it in this session
          const dismissedThisSession = sessionStorage.getItem('pwa_modal_dismissed') === 'true';
          if (!dismissedThisSession) {
            console.log('Showing PWA modal on subsequent login');
            setShowModal(true);
            setShowManualInstructions(!prompt);
            promptHandledRef.current = true;
          }
        }
      } else if (!prompt && canInstall && retryCount < 3) {
        // Retry with exponential backoff for browsers that delay beforeinstallprompt (like Samsung Internet)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 1s, 2s, 4s, max 5s
        console.log(`User logged in but prompt not available yet, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
        
        retryTimeoutRef.current = setTimeout(() => {
          checkLoginAndShowModal(retryCount + 1);
        }, delay);
      }
    };

    // Initial check with small delay to ensure state is ready
    const initialTimeout = setTimeout(() => {
      checkLoginAndShowModal(0);
    }, 300);

    // Listen for custom login event (triggered from App.tsx after login)
    const handleLogin = () => {
      console.log('Login event received, checking PWA modal');
      promptHandledRef.current = false; // Reset to allow showing modal again
      sessionStorage.removeItem('pwa_modal_dismissed'); // Reset dismissal flag
      
      // Check with delays to handle browsers that fire beforeinstallprompt after page load
      setTimeout(() => checkLoginAndShowModal(0), 500);
      setTimeout(() => checkLoginAndShowModal(1), 2000);
      setTimeout(() => checkLoginAndShowModal(2), 4000);
    };

    window.addEventListener('user-logged-in', handleLogin);

    return () => {
      clearTimeout(initialTimeout);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      window.removeEventListener('user-logged-in', handleLogin);
    };
  }, [deferredPrompt, isInstalled, canInstall]);

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
          setShowModal(false);
          sessionStorage.setItem('pwa_modal_dismissed', 'true');
        }
        
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
        promptHandledRef.current = false;
      } catch (error) {
        console.error('Error showing install prompt:', error);
        // If native prompt fails, show manual instructions
        setShowManualInstructions(true);
      }
    } else {
      // No native prompt available, show manual instructions
      setShowManualInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem('pwa_modal_dismissed', 'true');
    promptHandledRef.current = false; // Allow showing again on next login
  };

  const handleShowInstructions = () => {
    setShowManualInstructions(true);
  };

  if (!showModal || isInstalled) {
    return null;
  }

  const manualInstructions = getManualInstallInstructions();
  const { name: browserName } = getBrowserInfo();

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Install Stashway™
          </h2>
          {!showManualInstructions ? (
            <p className="text-slate-600 dark:text-slate-300">
              Install Stashway™ to your device for easier access and offline use!
            </p>
          ) : (
            <div className="text-left w-full mt-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      Manual Installation ({browserName})
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {manualInstructions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Maybe Later
          </button>
          {!showManualInstructions ? (
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Install
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
            >
              Got It
            </button>
          )}
        </div>

        {!showManualInstructions && !deferredPrompt && (
          <button
            onClick={handleShowInstructions}
            className="w-full mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            Need help? See installation instructions
          </button>
        )}
      </div>
    </div>
  );
};
