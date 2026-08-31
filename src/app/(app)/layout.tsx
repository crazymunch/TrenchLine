'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useStore } from '@/store/useStore';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ServiceWorker } from '@/components/providers/ServiceWorker';
import { viewForPath, pathForView } from '@/lib/routes';

/**
 * The app shell, and the one place the URL and the store agree on where you
 * are.
 *
 * Every view used to render from a single `page.tsx` switching on
 * `currentView`, so there was one URL for the whole app: no deep links, no
 * shareable roster, and a back button that did nothing. A player could not
 * send a teammate their list except by describing it.
 *
 * The route is now authoritative and `currentView` is derived from it. That
 * direction matters — the alternative is two sources of truth for where the
 * user is, which is the same shape of bug as the roster persistence had.
 *
 * The 19 `setCurrentView(...)` call sites are untouched: the store action
 * navigates instead of setting state, using the router registered here. A
 * store lives outside React and cannot call `useRouter` itself.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const {
    currentTheme, syncUserWarbandsWithCloud, hydrateCatalogs,
    getActiveWarband, registerNavigate, setCurrentViewLocal,
  } = useStore();

  // Give the store a way to navigate. Cleared on unmount so a stale router
  // from a torn-down tree cannot be called.
  useEffect(() => {
    registerNavigate((view, rosterId) => router.push(pathForView(view, rosterId)));
    return () => registerNavigate(null);
  }, [router, registerNavigate]);

  // The URL decides the view, including on a back/forward navigation — which
  // is the half a click handler cannot cover.
  useEffect(() => {
    setCurrentViewLocal(viewForPath(pathname));
  }, [pathname, setCurrentViewLocal]);

  /**
   * Fill the store's rule catalogs from the generated dataset.
   *
   * Until this runs the catalogs are empty, and that is the honest state — the
   * alternative is what the app did before: seed them from `defaultRules.ts`,
   * whose statlines the audit measured as 97% wrong. There is deliberately no
   * fallback here for the same reason `useDataset` has none.
   *
   * Re-runs when the active warband's faction changes, because wargear is
   * priced per faction: an Automatic Rifle is 40 Ducats in one Armoury and 2
   * Glory in another, so there is no faction-neutral gear list to load once.
   */
  const rulesetId = typeof window !== 'undefined'
    ? window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID
    : DEFAULT_RULESET_ID;
  const { dataset } = useDataset(rulesetId);
  const factionId = getActiveWarband()?.factionId;

  useEffect(() => {
    if (dataset) hydrateCatalogs(dataset, factionId);
  }, [dataset, factionId, hydrateCatalogs]);

  useEffect(() => {
    syncUserWarbandsWithCloud(session?.user?.email || undefined, session?.user?.name || undefined);
  }, [session, syncUserWarbandsWithCloud]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentTheme) {
      // Set on <html> only. Setting it on <body> as well meant body carried its
      // own value, which shadows the inherited one for everything inside it —
      // so if the two ever diverged, the whole app would silently render the
      // body's theme and the html one would look applied but do nothing.
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.body?.removeAttribute('data-theme');
    }
  }, [currentTheme]);

  return (
    /*
      The Iron Ledger shell: a dark chrome frame around a cream sheet.

      The rail, the top bar and the phone nav are the *app*; everything inside
      `<main>` is the *document*. `.sheet` on main is what flips the whole token
      set to paper for its subtree, so no view had to be recoloured by hand.

      `min-h-[100dvh]` on the frame and `flex-1` on the sheet mean the paper
      always reaches the bottom of the viewport even when a view is short —
      otherwise the sheet ends mid-screen and the dark ground shows through
      below it, which reads as a rendering fault rather than a design.
    */
    <div className="min-h-[100dvh] bg-theme-base text-theme-text flex flex-row selection:bg-theme-primary selection:text-theme-base">
      {/* Desktop rail / tablet icon rail */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        {/*
          Not a flex container. Making the sheet `flex flex-col` to get it to
          fill the viewport height also made its children size to their content
          on the cross axis, which put 200px of sideways scroll on the phone.
          `flex-1` alone already stretches it in the parent column, and the
          content decides its own layout.
        */}
        <main className="sheet flex-1 min-w-0 pb-nav-safe lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tactical Nav */}
      <MobileNav />

      {/* Renders nothing. Makes the app open at a table with no signal. */}
      <ServiceWorker />
    </div>
  );
}
