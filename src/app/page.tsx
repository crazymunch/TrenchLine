'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { WarbandDashboard } from '@/components/builder/WarbandDashboard';
import { PlayModeView } from '@/components/play/PlayModeView';
import { CampaignHubView } from '@/components/campaign/CampaignHubView';
import { CodexView } from '@/components/codex/CodexView';
import { CustomizerView } from '@/components/customizer/CustomizerView';

export default function Home() {
  const { currentView } = useStore();

  return (
    <div className="min-h-screen bg-[#0C0E12] text-[#ECEFF4] flex flex-col selection:bg-[#8B0000] selection:text-white">
      {/* Top Grimdark Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'builder' && <WarbandDashboard />}
        {currentView === 'play' && <PlayModeView />}
        {currentView === 'campaign' && <CampaignHubView />}
        {currentView === 'codex' && <CodexView />}
        {currentView === 'customizer' && <CustomizerView />}
      </main>

      {/* Mobile Bottom Tactical Nav */}
      <MobileNav />
    </div>
  );
}
