'use client';

import React, { useState } from 'react';
import { useStore, AppView } from '../../store/useStore';
import { useSession } from 'next-auth/react';
import { THEMES } from '../../types/theme';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
import { BugReportModal } from '../feedback/BugReportModal';
import { Shield, Swords, Flag, BookOpen, SlidersHorizontal, Palette, Users, Bug } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, currentTheme } = useStore();
  const { data: session } = useSession();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  const isAdmin = (session?.user as any)?.isAdmin || session?.user?.email === 'crazymunch@gmail.com';

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'builder', label: 'Roster', icon: <Shield className="w-4 h-4" /> },
    { id: 'play', label: 'Play', icon: <Swords className="w-4 h-4" />, badge: 'LIVE' },
    // "Crusade", not "Campaign": at 12px in a 375px bar the longer word clips
    // to "Campaig…", and this is what the view calls itself anyway — the
    // sidebar reads "Crusade Campaign" and the header "CRUSADE CAMPAIGN HUB".
    { id: 'campaign', label: 'Crusade', icon: <Flag className="w-4 h-4" /> },
    // "Players", not "Directory": nine characters do not fit in the ~53px a
    // five-way split of a 375px bar gives each label, and whether they *appear*
    // to fit depends on the platform font — it passed locally and clipped on
    // CI's. "Crusade" is seven and fits on both, so seven is the safe width.
    // The icon here is already `Users`, and this is other players' warbands as
    // against your own roster in the first slot.
    { id: 'directory', label: 'Players', icon: <Users className="w-4 h-4" /> },
    { id: 'codex', label: 'Codex', icon: <BookOpen className="w-4 h-4" /> },
    ...(isAdmin ? [{ id: 'customizer' as AppView, label: 'Diff', icon: <SlidersHorizontal className="w-4 h-4" /> }] : [])
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-theme-base/95 backdrop-blur border-t border-theme-border px-1 pt-1 pb-safe">
        {/*
          Flex, not grid: the item count varies with the admin flag, and a
          template-literal `grid-cols-${n}` is never compiled by Tailwind's
          static scanner — which silently collapsed this nav to one column.
          `flex-1` needs no class per count and cannot fail the same way.
        */}
        {/*
          Five destinations that carry a label, two utilities that do not.

          The margins here are small and have been measured twice. The Iron
          Ledger pass moved the whole app onto Archivo, which is wider than the
          stack it replaced, and "Crusade" came back down to 3px of slack —
          close enough that a different font on a different device clips it,
          which is exactly how "Directory" failed on CI and passed locally. The
          horizontal padding on each destination is gone and the two utility
          buttons are 32px rather than 36px, which buys the labels back about
          6px each. Their touch targets are unaffected: `.tap` gives both
          utilities a 44px overlay regardless of their drawn width.

          3.4 raised every sub-12px string in the app to 12px, and at 12px
          "Campaign" and "Directory" clipped to "Campai…" in a seven-way split
          of a 375px screen — a clipped label is worse than the 10px one it
          replaced, so the nav had to give the destinations more room rather
          than the type less size. Theme and the bug reporter are utilities, not
          places you navigate to; their icons are unambiguous and they now take
          a fixed 44px each instead of a seventh of the bar.
        */}
        <div className="flex items-stretch gap-px">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[44px] py-1.5 px-0 rounded transition-colors relative ${
                  isActive ? 'bg-theme-surface' : 'text-theme-muted hover:text-theme-text'
                }`}
                style={{
                  color: isActive ? activeThemeObj.primaryColor : undefined
                }}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-status-error animate-ping" />
                  )}
                </div>
                <span className="text-xs sm:text-[10px] mt-0.5 font-semibold tracking-tighter truncate max-w-full leading-tight">{item.label}</span>
              </button>
            );
          })}

          {/* Theme switcher button on mobile */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            aria-label="Change theme"
            title="Change theme"
            className="tap flex-none w-8 flex items-center justify-center min-h-[44px] rounded transition-colors text-theme-muted hover:text-theme-text"
          >
            <Palette className="w-5 h-5" style={{ color: activeThemeObj.primaryColor }} />
          </button>

          {/* Bug report button on mobile */}
          <button
            onClick={() => setIsBugReportOpen(true)}
            aria-label="Report a bug"
            title="Report a bug"
            className="tap flex-none w-8 flex items-center justify-center min-h-[44px] rounded transition-colors text-status-error/80 hover:text-status-error"
          >
            <Bug className="w-5 h-5 text-status-error" />
          </button>
        </div>
      </nav>

      <ThemeSwitcherModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />
    </>
  );
};
