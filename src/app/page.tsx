'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '@/store/useStore';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { WarbandDashboard } from '@/components/builder/WarbandDashboard';
import { PlayModeView } from '@/components/play/PlayModeView';
import { CampaignHubView } from '@/components/campaign/CampaignHubView';
import { CodexView } from '@/components/codex/CodexView';
import { CustomizerView } from '@/components/customizer/CustomizerView';
import { RosterDirectoryView } from '@/components/admin/RosterDirectoryView';

export default function Home() {
  const { data: session } = useSession();
  const {
    currentView, currentTheme, syncUserWarbandsWithCloud,
    hydrateCatalogs, getActiveWarband,
  } = useStore();

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
    <div className="min-h-[100dvh] bg-theme-base text-theme-text flex flex-row selection:bg-theme-accent selection:text-white transition-colors duration-300">
      {/* Left Collapsible Desktop Sidebar */}
      <Sidebar />

      {/* Main Content & Header Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-nav-safe lg:pb-6">
          {currentView === 'builder' && <WarbandDashboard />}
          {currentView === 'play' && <PlayModeView />}
          {currentView === 'campaign' && <CampaignHubView />}
          {currentView === 'directory' && <RosterDirectoryView />}
          {currentView === 'codex' && <CodexView />}
          {currentView === 'customizer' && <CustomizerView />}
        </main>
      </div>

      {/* Mobile Bottom Tactical Nav */}
      <MobileNav />
    </div>
  );
}
