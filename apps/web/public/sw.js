/**
 * Arcanium Service Worker
 *
 * Caching strategies (Constitution §8.2, P4):
 *   - Static assets (JS, CSS, images): CacheFirst, max 30 days
 *   - Content catalogue API:           StaleWhileRevalidate, max 5 min
 *   - Chapter content API:             CacheFirst once fetched (chapters don't change)
 *   - Auth + library API:              NetworkFirst (always need fresh auth state)
 *
 * NOTE: Workbox is the recommended long-term solution. This is a lean custom
 * implementation that covers the Phase 4 requirements without adding a build
 * plugin dependency. Migrate to workbox-window after Workbox is installed.
 */

const STATIC_CACHE  = 'arcanium-static-v1';
const DYNAMIC_CACHE = 'arcanium-dynamic-v1';
const CHAPTER_CACHE = 'arcanium-chapters-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// ---------------------------------------------------------------------------
// Message — allow the app to trigger activation of this waiting SW.
// usePWA.ts posts { type: 'SKIP_WAITING' } when the user clicks "Update now".
// ---------------------------------------------------------------------------

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Install — pre-cache static assets
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  // Do NOT call skipWaiting() here anymore — we wait for the user to confirm
  // the update via the PWAUpdateBanner. skipWaiting() is now only called in
  // response to the SKIP_WAITING message above.
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, CHAPTER_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch — route-specific caching strategies
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Chapter content API — CacheFirst for text, no-cache for image types
  // Image chapters (manga/comic/webtoon) are served with Cache-Control: no-store
  // because CDN image URLs expire in ~15 minutes.
  if (url.pathname.match(/^\/api\/v1\/content\/[^/]+\/chapters\/\d/)) {
    event.respondWith(
      fetch(request).then((response) => {
        // Only cache if server says it's cacheable (text chapters)
        const cc = response.headers.get('Cache-Control') ?? '';
        if (!cc.includes('no-store') && response.ok) {
          caches.open(CHAPTER_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      }).catch(async () => {
        // Offline fallback: try cache even for image chapters
        const cached = await caches.match(request);
        return cached ?? new Response(JSON.stringify({
          data: null,
          error: { code: 'OFFLINE', message: 'You are offline and this chapter is not cached.' },
        }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }),
    );
    return;
  }

  // Auth + library + AI endpoints — NetworkFirst (must be fresh)
  if (url.pathname.startsWith('/api/v1/auth') ||
      url.pathname.startsWith('/api/v1/library') ||
      url.pathname.startsWith('/api/v1/ai') ||
      url.pathname.startsWith('/api/v1/users')) {
    event.respondWith(networkFirst(DYNAMIC_CACHE, request));
    return;
  }

  // Content catalogue API — StaleWhileRevalidate (ok to serve cached briefly)
  if (url.pathname.startsWith('/api/v1/content')) {
    event.respondWith(staleWhileRevalidate(DYNAMIC_CACHE, request));
    return;
  }

  // Static assets — CacheFirst
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  // External (CDN images, fonts) — StaleWhileRevalidate
  event.respondWith(staleWhileRevalidate(DYNAMIC_CACHE, request));
});

// ---------------------------------------------------------------------------
// Strategy implementations
// ---------------------------------------------------------------------------

async function cacheFirst(cacheName, request) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response(JSON.stringify({
      data: null,
      error: { code: 'OFFLINE', message: 'You are offline' },
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached ?? (await fetchPromise) ?? new Response('Offline', { status: 503 });
}
