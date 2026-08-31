'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that makes the app work with no signal.
 *
 * Mounted from the app shell rather than the root layout so it only runs for
 * the app itself, and only in the browser.
 *
 * Registration is deliberately quiet about success and loud about nothing: a
 * service worker that fails to register leaves the app exactly as it was
 * before there was one, which is a working online app. There is nothing for a
 * player to do about it, so there is nothing to tell them. What they *do* need
 * to know — whether their roster is backed up — `SyncStatus` already says.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    /*
      `import.meta.env` is not available here and `process.env.NODE_ENV` is
      inlined at build time, so this is a compile-time branch: the worker is
      never registered in development.

      That is not tidiness. A service worker caches the app shell, and in `next
      dev` the shell is rebuilt on every edit — a cached one serves yesterday's
      bundle against today's chunks, which fails as a blank page with a chunk
      404 and looks like a code bug for as long as it takes to remember the
      worker is there.
    */
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        // Registration can fail for reasons the user cannot act on: private
        // browsing, an insecure origin, an enterprise policy. The app works
        // online regardless, so this is a developer note, not a user-facing
        // failure.
        console.warn('Service worker registration failed:', e);
      });
    };

    // After load, so fetching and caching the shell never competes with the
    // first paint on the connection that is already struggling.
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
