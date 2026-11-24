
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

// --------------------------------------------------
// CONTROLLO EFFETTIVO DELLA CONNESSIONE INTERNET
// --------------------------------------------------

const SUPABASE_HEALTH_URL =
  'https://wzofhptxcbsmqbxujuhp.supabase.co/auth/v1/health';

let lastConnectivity = navigator.onLine;
let checkingConnection = false;

async function checkInternetConnection() {
  if (checkingConnection) return;

  checkingConnection = true;

  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    await fetch(SUPABASE_HEALTH_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });

    if (!lastConnectivity) {
      lastConnectivity = true;
      window.dispatchEvent(new Event('online'));
    }

  } catch (error) {
    if (lastConnectivity) {
      lastConnectivity = false;
      window.dispatchEvent(new Event('offline'));
    }

  } finally {
    window.clearTimeout(timeout);
    checkingConnection = false;
  }
}

// Primo controllo dopo il caricamento della pagina.
window.addEventListener('load', () => {
  checkInternetConnection();

  // Controllo periodico della raggiungibilità di Supabase.
  window.setInterval(checkInternetConnection, 5000);
});

// Ricontrolla quando si torna sulla pagina.
window.addEventListener('focus', checkInternetConnection);

// Quando il browser segnala un cambiamento di rete,
// verifica anche la raggiungibilità effettiva del server.
window.addEventListener('online', () => {
  checkInternetConnection();
});

window.addEventListener('offline', () => {
  if (lastConnectivity) {
    lastConnectivity = false;
  }
});

// --------------------------------------------------
// REGISTRAZIONE E GESTIONE AGGIORNAMENTI PWA
// --------------------------------------------------

if ('serviceWorker' in navigator) {
  let refreshing = false;
  let updateAvailable = false;

  const notifyUpdateAvailable = () => {
    if (updateAvailable) return;
    updateAvailable = true;
    window.dispatchEvent(
      new Event('tc-app-update-available')
    );
  };

  const getAssets = (doc) => {
    const scripts = [
      ...doc.querySelectorAll(
        'script[type="module"][src]'
      )
    ].map(el => el.getAttribute('src'));

    const styles = [
      ...doc.querySelectorAll(
        'link[rel="stylesheet"][href]'
      )
    ].map(el => el.getAttribute('href'));

    return [...scripts, ...styles].sort();
  };

  const checkPublishedVersion = async () => {
    if (!navigator.onLine || updateAvailable) return;

    try {
      const response = await fetch(
        `/index.html?version_check=${Date.now()}`,
        { cache: 'no-store' }
      );

      if (!response.ok) return;

      const html = await response.text();

      const publishedDocument =
        new DOMParser().parseFromString(
          html,
          'text/html'
        );

      const currentAssets = getAssets(document);
      const publishedAssets = getAssets(
        publishedDocument
      );

      if (
        currentAssets.length &&
        publishedAssets.length &&
        JSON.stringify(currentAssets) !==
          JSON.stringify(publishedAssets)
      ) {
        notifyUpdateAvailable();
      }

    } catch (error) {
      console.error(
        'Controllo versione non riuscito:',
        error
      );
    }
  };

  window.addEventListener('load', async () => {
    try {
      const registration =
        await navigator.serviceWorker.register('/sw.js');

      if (
        registration.waiting &&
        navigator.serviceWorker.controller
      ) {
        notifyUpdateAvailable();
      }

      registration.addEventListener(
        'updatefound',
        () => {
          const installingWorker =
            registration.installing;

          if (!installingWorker) return;

          installingWorker.addEventListener(
            'statechange',
            () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                notifyUpdateAvailable();
              }
            }
          );
        }
      );

      const checkForUpdates = () => {
        if (!navigator.onLine) return;

        registration.update().catch(() => {});
        checkPublishedVersion();
      };

      checkForUpdates();

      window.setInterval(checkForUpdates, 60000);

      window.addEventListener(
        'focus',
        checkForUpdates
      );

      window.addEventListener(
        'online',
        checkForUpdates
      );

      window.addEventListener(
        'tc-app-update-apply',
        () => {
          if (registration.waiting) {
            registration.waiting.postMessage({
              type: 'SKIP_WAITING'
            });
          } else if (updateAvailable) {
            window.location.reload();
          }
        }
      );

      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          if (refreshing) return;

          refreshing = true;
          window.location.reload();
        }
      );

    } catch (error) {
      console.error(
        'Errore Service Worker:',
        error
      );
    }
  });
}

// --------------------------------------------------
// AVVIO REACT
// --------------------------------------------------

createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
