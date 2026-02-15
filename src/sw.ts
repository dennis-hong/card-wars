/// <reference lib="WebWorker" />

(function initServiceWorker() {
  const scope = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;
  const APP_CACHE = 'card-wars-cache-v1';
  const IMAGE_CACHE = 'card-wars-images-v1';
  const STATIC_ASSETS = ['/', '/manifest.json', '/images/logo.png'];

  scope.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
      caches.open(APP_CACHE).then((cache: Cache) => cache.addAll(STATIC_ASSETS)),
    );
    scope.skipWaiting();
  });

  scope.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
      Promise.all([
        scope.clients?.claim?.(),
        caches.keys().then((cacheNames: string[]) =>
          Promise.all(
            cacheNames
              .filter((name) => name !== APP_CACHE && name !== IMAGE_CACHE)
              .map((name) => caches.delete(name)),
          ),
        ),
      ]),
    );
  });

  scope.addEventListener('fetch', (event: FetchEvent) => {
    const req = event.request;
    const url = new URL(req.url);

    if (req.method !== 'GET') return;

    if (req.headers.get('accept')?.includes('text/html')) {
      event.respondWith(
        caches.match('/').then((cached: Response | undefined) => cached || fetch(req)),
      );
      return;
    }

    if (url.pathname.startsWith('/images/') || req.destination === 'image') {
      event.respondWith(
        caches.open(IMAGE_CACHE).then(async (cache: Cache) => {
          const cached = await cache.match(req);
          if (cached) return cached;

          const response = await fetch(req);
          if (response.ok) {
            cache.put(req, response.clone());
          }
          return response;
        }),
      );
      return;
    }

    event.respondWith(
      caches.match(req).then((cached: Response | undefined) => cached || fetch(req)),
    );
  });

  console.log('[sw] service worker started');
})();
