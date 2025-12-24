import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Service Worker registration and update management
if ('serviceWorker' in navigator) {
  let refreshing = false;
  let registration: ServiceWorkerRegistration | null = null;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        registration = reg;
        console.log('Service Worker registered successfully:', reg.scope);

        // Check for updates immediately and periodically (every hour)
        checkForUpdates(reg);
        setInterval(() => {
          checkForUpdates(reg);
        }, 60 * 60 * 1000); // Check every hour

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            console.log('Service Worker: Update found, installing new worker...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('Service Worker: New version available');
                
                // Notify user about update
                if (window.confirm('A new version of Stashway is available! Refresh now to get the latest features?')) {
                  // User wants to update now
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                } else {
                  // User will update later - show a banner or notification
                  showUpdateNotification();
                }
              }
              
              if (newWorker.state === 'activated') {
                console.log('Service Worker: New version activated');
              }
            });
          }
        });

        // Handle controller change (service worker updated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            console.log('Service Worker: Controller changed, reloading page...');
            refreshing = true;
            window.location.reload();
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });

  // Function to check for service worker updates
  function checkForUpdates(reg: ServiceWorkerRegistration) {
    reg.update().catch((error) => {
      console.error('Service Worker: Error checking for updates:', error);
    });
  }

  // Function to show update notification (can be customized with a banner)
  function showUpdateNotification() {
    // Create a notification banner at the top of the page
    const notification = document.createElement('div');
    notification.id = 'sw-update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    notification.innerHTML = `
      <span>New version available! </span>
      <button onclick="window.location.reload()" style="
        background: white;
        color: #10b981;
        border: none;
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-left: 12px;
      ">Refresh Now</button>
      <button onclick="this.parentElement.remove()" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 8px;
      ">Later</button>
    `;
    document.body.appendChild(notification);
  }

  // Expose manual refresh function globally for debugging
  (window as any).forceServiceWorkerUpdate = () => {
    if (registration) {
      registration.update();
    } else {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update();
      });
    }
  };
}

// Handle GitHub Pages 404 redirect
// If we're on GitHub Pages and the URL has a query parameter starting with /?/
// (which means it was redirected from 404.html), we need to restore the original path
if (window.location.search.includes('?/')) {
  const path = window.location.search
    .replace(/^\?\/?/, '')
    .replace(/~and~/g, '&')
    .split('&')[0];
  
  if (path) {
    const newPath = '/' + path + window.location.hash;
    window.history.replaceState({}, '', newPath);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
