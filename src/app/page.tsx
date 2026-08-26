'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '@/store/useStore';
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
  const { currentView, currentTheme, syncUserWarbandsWithCloud } = useStore();

  useEffect(() => {
    syncUserWarbandsWithCloud(session?.user?.email || undefined, session?.user?.name || undefined);
  }, [session, syncUserWarbandsWithCloud]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.body?.setAttribute('data-theme', currentTheme);
    }
  }, [currentTheme]);

  return (
    <div className="min-h-screen bg-[#0C0E12] text-[#ECEFF4] flex flex-row selection:bg-[#8B0000] selection:text-white transition-colors duration-300">
      {/* Left Collapsible Desktop Sidebar */}
      <Sidebar />

      {/* Main Content & Header Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
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
