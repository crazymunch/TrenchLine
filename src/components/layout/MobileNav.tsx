'use client';

import React from 'react';
import { useStore, AppView } from '../../store/useStore';
import { THEMES } from '../../types/theme';
import { Shield, Swords, Flag, BookOpen, Users } from 'lucide-react';

/**
 * The bottom bar: five destinations, and only destinations.
 *
 * It used to carry the theme switcher, the bug reporter and — for an admin —
 * the ruleset differ as well, which is seven or eight items in 375px. Every
 * label was one font metric away from clipping, and two of them had already
 * clipped in CI while passing locally. The notes below record how much was
 * shaved to keep "Crusade" and "Players" whole: horizontal padding, then the
 * utilities down to 32px, then their labels removed entirely.
 *
 * That was the wrong thing to economise on. Those three are SETTINGS, not
 * places you navigate to, and they now live in the account menu in the top
 * right (`Navbar`). Five destinations split 375px into 75px each — enough for
 * any label here — and the room bought back went into size: 20px icons rather
 * than 16, 14px labels rather than 12, and a 52px bar rather than 44.
 */
export const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, currentTheme } = useStore();
  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  /*
    No `badge`. The Play item carried one — a red `animate-ping` dot here and
    a "LIVE" pill in the sidebar — and it advertised a feature this app does
    not have: live multi-device play is the one unbuilt row on the feature
    checklist, labelled "Coming Soon" inside the view the badge pointed at.
    A flashing red dot is the strongest attention signal in the whole chrome
    and it was spent on nothing happening.
  */
  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'builder', label: 'Roster', icon: <Shield className="w-5 h-5" /> },
    { id: 'play', label: 'Play', icon: <Swords className="w-5 h-5" /> },
    // "Crusade", not "Campaign": at 12px in a 375px bar the longer word clips
    // to "Campaig…", and this is what the view calls itself anyway — the
    // sidebar reads "Crusade Campaign" and the header "CRUSADE CAMPAIGN HUB".
    { id: 'campaign', label: 'Crusade', icon: <Flag className="w-5 h-5" /> },
    // "Players", not "Directory": nine characters do not fit in the ~53px a
    // five-way split of a 375px bar gives each label, and whether they *appear*
    // to fit depends on the platform font — it passed locally and clipped on
    // CI's. "Crusade" is seven and fits on both, so seven is the safe width.
    // The icon here is already `Users`, and this is other players' warbands as
    // against your own roster in the first slot.
    { id: 'directory', label: 'Players', icon: <Users className="w-5 h-5" /> },
    { id: 'codex', label: 'Codex', icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-theme-base/95 backdrop-blur border-t border-theme-border px-1 pt-1.5 pb-safe">
        {/*
          Flex, not grid.

          The count is a fixed five now that the admin-only differ has moved to
          the account menu, so `grid-cols-5` would compile. It stays flex
          anyway: a template-literal `grid-cols-${n}` is never seen by
          Tailwind's static scanner, which once silently collapsed this nav to
          one column, and the next person to make the count conditional again
          should not have to rediscover that. `flex-1` needs no class per count
          and cannot fail the same way (docs/MOBILE.md §5).
        */}
        <div className="flex items-stretch gap-px">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[52px] py-2 px-0.5 rounded transition-colors relative ${
                  isActive ? 'bg-theme-surface' : 'text-theme-muted hover:text-theme-text'
                }`}
                style={{
                  color: isActive ? activeThemeObj.primaryColor : undefined
                }}
              >
                {item.icon}
                <span className="text-sm mt-1 font-semibold tracking-tight truncate max-w-full leading-tight">{item.label}</span>
              </button>
            );
          })}

        </div>
    </nav>
  );
};
