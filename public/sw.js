
const CACHE_NAME = 'tc-pabillonis-v3';

const APP_SHELL = [
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

function getAttribute(tag, name) {
  const match = tag.match(
    new RegExp(
      `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      'i'
    )
  );

  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

function getAppAssets(html) {
  const tags = html.match(/<(?:script|link)\b[^>]*>/gi) || [];

  return tags.map(tag => {
    const src = getAttribute(tag, 'src');
    const href = getAttribute(tag, 'href');
    const type = getAttribute(tag, 'type');
    const rel = (getAttribute(tag, 'rel') || '').toLowerCase();

    if (src && type === 'module') return src;

    if (
      href &&
      (rel.includes('stylesheet') || rel.includes('modulepreload'))
    ) {
      return href;
    }

    return null;
  }).filter(Boolean);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    const indexUrl = new URL('/index.html', self.location.origin);
    const rootUrl = new URL('/', self.location.origin);

    // Scarica la pagina principale pubblicata.
    const response = await fetch(indexUrl.href, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Impossibile scaricare index.html');
    }

    const html = await response.clone().text();

    await cache.put(indexUrl.href, response.clone());
    await cache.put(rootUrl.href, response.clone());

    // Individua i file necessari per avviare React.
    const assets = getAppAssets(html);

    // Salva JavaScript, CSS e moduli principali.
    for (const asset of assets) {
      const assetUrl = new URL(asset, self.location.origin);

      if (assetUrl.origin !== self.location.origin) continue;

      const assetResponse = await fetch(assetUrl.href, {
        cache: 'no-store'
      });

      if (!assetResponse.ok) {
        throw new Error(
          'Impossibile salvare una risorsa dell’app: ' + asset
        );
      }

      await cache.put(assetUrl.href, assetResponse);
    }

    // Salva manifest e icone.
    await Promise.all(
      APP_SHELL.map(async path => {
        const url = new URL(path, self.location.origin);
        const assetResponse = await fetch(url.href);

        if (assetResponse.ok) {
          await cache.put(url.href, assetResponse);
        }
      })
    );

    // Il nuovo Service Worker rimane in attesa
    // del comando manuale dell'utente.
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(
            key =>
              key.startsWith('tc-pabillonis-') &&
              key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Le pagine vengono recuperate online.
  // Se manca Internet, viene restituito solo
  // l'HTML necessario ad avviare React e mostrare l'avviso.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);

        return (
          await cache.match(request) ||
          await cache.match(new URL('/', self.location.origin)) ||
          await cache.match(new URL('/index.html', self.location.origin))
        );
      })
    );

    return;
  }

  // Cache per le risorse statiche dell'app.
  // Nessuna memorizzazione delle richieste Supabase.
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    ['script', 'style', 'image', 'font'].includes(request.destination);

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return new Response('Risorsa non disponibile', {
          status: 503,
          statusText: 'Offline'
        });
      }
    })());
  }
});
