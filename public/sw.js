
const CACHE_NAME = 'tc-pabillonis-v4';

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

    // Memorizza prima la pagina necessaria all'avvio.
    const response = await fetch(indexUrl.href, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Impossibile scaricare index.html');
    }

    const html = await response.clone().text();

    await cache.put(indexUrl.href, response.clone());
    await cache.put(rootUrl.href, response.clone());

    // Memorizza gli script, i fogli CSS e i moduli di React.
    const assets = getAppAssets(html);

    for (const asset of assets) {
      try {
        const assetUrl = new URL(asset, self.location.origin);

        if (assetUrl.origin !== self.location.origin) continue;

        const assetResponse = await fetch(assetUrl.href, {
          cache: 'no-store'
        });

        if (assetResponse.ok) {
          await cache.put(assetUrl.href, assetResponse);
        } else {
          console.warn('Risorsa non memorizzata:', asset);
        }
      } catch (error) {
        console.warn('Errore nel salvataggio della risorsa:', asset, error);
      }
    }

    // Memorizza manifest e icone.
    await Promise.all(
      APP_SHELL.map(async path => {
        try {
          const url = new URL(path, self.location.origin);
          const assetResponse = await fetch(url.href);

          if (assetResponse.ok) {
            await cache.put(url.href, assetResponse);
          }
        } catch (error) {
          console.warn('Risorsa non disponibile:', path);
        }
      })
    );

    // Rimane in attesa del comando manuale di aggiornamento.
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

  // Non intercetta richieste diverse da GET o verso altri domini.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Gestione dell'apertura della PWA e delle pagine.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          // Aggiorna la pagina memorizzata quando Internet è disponibile.
          const indexUrl = new URL('/index.html', self.location.origin);
          const rootUrl = new URL('/', self.location.origin);

          await cache.put(indexUrl.href, response.clone());
          await cache.put(rootUrl.href, response.clone());

          return response;
        }
      } catch (error) {
        // Connessione assente: passa alla pagina memorizzata.
      }

      // ignoreSearch permette di recuperare la pagina
      // anche se l'indirizzo contiene parametri.
      const cachedPage =
        await cache.match(request, { ignoreSearch: true }) ||
        await cache.match('/', { ignoreSearch: true }) ||
        await cache.match('/index.html', { ignoreSearch: true });

      if (cachedPage) return cachedPage;

      return new Response('Connessione Internet assente', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    })());

    return;
  }

  // Gestione delle risorse statiche: JavaScript, CSS, immagini e font.
  // Le richieste verso Supabase non vengono memorizzate.
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    ['script', 'style', 'image', 'font'].includes(request.destination);

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      const cached = await cache.match(request, {
        ignoreSearch: true
      });

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return new Response('Risorsa non disponibile offline', {
          status: 503,
          statusText: 'Offline'
        });
      }
    })());
  }
});
