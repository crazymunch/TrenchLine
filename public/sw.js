/*
  TrenchLine's service worker.

  The app is used at a table, in a hall, in a shop basement — places with no
  signal. Before this, opening it there gave you a browser error page, and the
  rules data it needs (~1.6 MB, served from /api/dataset rather than bundled)
  was unreachable, so even a cached shell would have had no statlines in it.

  Three caching rules, and the differences between them are the whole design.

  1. STATIC ASSETS — cache-first.
     Next.js fingerprints its build output, so a URL under /_next/static/ names
     one immutable file. Serving it from cache forever is correct, and a new
     build asks for new URLs.

  2. THE RULESET — stale-while-revalidate.
     Serve the cached copy at once so a phone with no signal still has rules,
     and refresh it in the background for next time. Not cache-first-forever:
     a deploy can change the dataset without changing the URL, and rules that
     silently never update are the kind of quietly-wrong data this project
     exists to stop shipping.

  3. NAVIGATION — network-first, falling back to the cached shell.
     The network wins when it is there, so a deploy is picked up on the next
     load rather than after an eviction. Offline falls back to whatever page
     was cached, and finally to the roster.

  And one rule about what is NOT cached: anything under /api/ that is a user's
  own data — warbands, campaigns, bug reports. Those have an authoritative copy
  in localStorage and a sync that knows how to reconcile it (see
  src/services/sync.ts). A cached HTTP response would be a third copy with no
  merge rule, handed back as if it were current. Offline for that data is the
  store's job, not this file's.
*/

const VERSION = 'v1';
const SHELL = `trenchline-shell-${VERSION}`;
const STATIC = `trenchline-static-${VERSION}`;
const RULES = `trenchline-rules-${VERSION}`;

/** The routes the app can open cold. */
const SHELL_ROUTES = ['/roster', '/play', '/campaign', '/directory', '/codex'];

const KEEP = new Set([SHELL, STATIC, RULES]);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Individually, not addAll: addAll rejects the whole install if any single
    // request fails, and one route 404ing should not leave the app with no
    // service worker at all.
    await Promise.all(SHELL_ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { cache: 'reload' });
        if (res.ok) await cache.put(route, res);
      } catch {
        // Installed while offline. The route caches on its first successful
        // visit instead.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n.startsWith('trenchline-') && !KEEP.has(n))
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

/** Cache-first: for URLs that name one immutable file. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

/** Serve the cached copy now, refresh it for next time. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });

  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  // `hit || refresh` and not `await refresh` — the point is that a cached
  // ruleset is served without waiting for a network that may not answer.
  if (hit) return hit;
  const res = await refresh;
  if (res) return res;
  throw new Error('offline and no cached ruleset');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A user's own data is never served from here. See the header.
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/dataset')) return;

  if (url.pathname.startsWith('/api/dataset')) {
    event.respondWith(staleWhileRevalidate(request, RULES));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/maps/')) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        if (res.ok) {
          const cache = await caches.open(SHELL);
          cache.put(request, res.clone());
        }
        return res;
      } catch {
        const cache = await caches.open(SHELL);
        /*
          `ignoreVary` matters here.

          Next.js answers a navigation with `Vary: RSC,
          Next-Router-State-Tree, Next-Router-Prefetch, ...`, and by spec
          `cache.match` honours Vary — so a cached page only matches a request
          whose values for every one of those headers are identical. A client
          navigation and a cold load differ in exactly those headers, which
          makes the cached shell miss and the page fail offline with
          ERR_ABORTED, having been cached correctly the whole time.

          There is one document per URL here, so the Vary axes carry no
          information worth matching on.
        */
        return (await cache.match(request, { ignoreVary: true }))
          ?? (await cache.match('/roster', { ignoreVary: true }))
          ?? Response.error();
      }
    })());
  }
});
