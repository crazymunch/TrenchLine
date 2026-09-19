'use client';

import React, { useState } from 'react';
import { useStore, AppView } from '../../store/useStore';
import { THEMES } from '../../types/theme';
import { Shield, Swords, Flag, BookOpen, Users, MoreHorizontal, ScrollText } from 'lucide-react';
import { Sheet } from '../ui/Sheet';

/**
 * The bottom bar: four destinations and a door.
 *
 * It used to carry the theme switcher, the bug reporter and — for an admin —
 * the ruleset differ as well, which is seven or eight items in 375px. Every
 * label was one font metric away from clipping, and two of them had already
 * clipped in CI while passing locally. Horizontal padding went first, then the
 * utilities down to 32px, then their labels entirely.
 *
 * That was the wrong thing to economise on. Those three are SETTINGS, not
 * places you navigate to, and they now live in the account menu in the top
 * right (`Navbar`). Five slots split 375px into 75px each — enough for any
 * label here — and the room bought back went into size: 20px icons rather than
 * 16, 14px labels rather than 12, and a 52px bar rather than 44.
 *
 * Five is where it stops. A sixth clips whatever it is called, and "whether it
 * clips" turned out to depend on the platform font — `Directory` fitted in the
 * sandbox and ellipsed on CI's. So the count is now fixed and the FIFTH slot is
 * a door rather than a destination: everything behind it costs one extra tap,
 * and the bar never has to be renegotiated when a view is added. The Chronicle
 * of Battles was the view that proved this was needed.
 */
export const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, currentTheme } = useStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
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
    // The Codex keeps a slot rather than moving behind the door because it is
    // consulted mid-game, with a model in your other hand — the one view here
    // where an extra tap is paid for on every single use.
    { id: 'codex', label: 'Codex', icon: <BookOpen className="w-5 h-5" /> },
  ];

  /*
    The destinations that do not fit, behind the one slot that does.

    Full labels, not the bar's seven-character budget: a sheet is a list with
    the whole width to itself, so there is no reason to call this "Players"
    here. Each carries a line of what it is, which the bar has never had room
    for, and `e2e/helpers.ts` reaches them through this sheet so the mobile
    sweep covers them like any other view.
  */
  const moreItems: { id: AppView; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      id: 'chronicle', label: 'Chronicle of Battles',
      hint: 'Every battle recorded on this device, and the Deeds claimed in them',
      icon: <ScrollText className="w-5 h-5" />,
    },
    {
      id: 'directory', label: 'Roster Directory',
      hint: 'Other players\u2019 warbands',
      icon: <Users className="w-5 h-5" />,
    },
  ];
  const isMoreActive = moreItems.some((i) => i.id === currentView);

  return (
    /*
      The sheet is a SIBLING of the bar, not a child of it.

      `backdrop-blur` on the nav sets `backdrop-filter`, and an element with a
      filter becomes the containing block for its `position: fixed`
      descendants. So a `Sheet` rendered inside this nav resolves its
      `inset-0` against the nav's own box — a ~73px strip along the bottom
      edge — rather than the viewport.

      That failed silently on a phone, where the sheet's content happened to
      fit inside what was left, and failed on the tablet, where the second row
      landed outside the viewport: visible, enabled, and unclickable. CI caught
      it; the phone run did not. Nothing about the sheet's own markup was
      wrong, which is what makes this worth a comment rather than a fix.
    */
    <>
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

          {/* The door. Marked active when what is behind it is what you are
              looking at, so the bar still says where you are. */}
          <button
            onClick={() => setIsMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isMoreOpen}
            className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center rounded px-0.5 py-2 transition-colors ${
              isMoreActive ? 'bg-theme-surface' : 'text-theme-muted hover:text-theme-text'
            }`}
            style={{ color: isMoreActive ? activeThemeObj.primaryColor : undefined }}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="mt-1 max-w-full truncate text-sm font-semibold leading-tight tracking-tight">
              More
            </span>
          </button>
        </div>

    </nav>

    <Sheet
          open={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          title="More"
          subtitle="Places that do not fit in the bar"
        >
          <ul className="space-y-1.5">
            {moreItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => { setCurrentView(item.id); setIsMoreOpen(false); }}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded border px-3 text-left transition-colors ${
                    currentView === item.id
                      ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                      : 'border-theme-border text-theme-text hover:border-theme-primary'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{item.label}</span>
                    <span className="block text-xs text-theme-muted">{item.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
    </>
  );
};
