import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, can prompt user to refresh
                console.log('New service worker available');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
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