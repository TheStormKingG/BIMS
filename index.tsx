import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Unregister any existing service workers to prevent errors and network issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    const unregisterPromises = registrations.map((registration) => 
      registration.unregister().catch(() => {
        // Silently ignore errors - service worker may already be unregistered
      })
    );
    return Promise.all(unregisterPromises);
  }).catch(() => {
    // Silently ignore if getRegistrations fails
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