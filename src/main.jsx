import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

// Registrazione e gestione degli aggiornamenti della PWA.
if ('serviceWorker' in navigator) {
  let refreshing = false;

  const notifyUpdateAvailable = () => {
    window.dispatchEvent(new Event('tc-app-update-available'));
  };

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Se una nuova versione è già in attesa, avvisa l'interfaccia.
      if (registration.waiting && navigator.serviceWorker.controller) {
        notifyUpdateAvailable();
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (
            installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            notifyUpdateAvailable();
          }
        });
      });

      // Controlla la presenza di una nuova versione all'avvio e al ritorno
      // dell'utente nell'app; il controllo periodico evita verifiche continue.
      registration.update().catch(() => {});
      window.setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => {});
      }, 60 * 60 * 1000);

      window.addEventListener('focus', () => {
        if (navigator.onLine) registration.update().catch(() => {});
      });

      // L'attivazione viene richiesta soltanto quando l'utente preme Aggiorna.
      window.addEventListener('tc-app-update-apply', () => {
        const waitingWorker = registration.waiting;
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.error('Errore Service Worker:', error);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
