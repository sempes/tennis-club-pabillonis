
const CACHE_NAME = 'tc-pabillonis-v2';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );

  // Non attiviamo subito la nuova versione:
  // aspettiamo il comando dell'utente.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('tc-pabillonis-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Le richieste dell'app vengono sempre verificate online.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
