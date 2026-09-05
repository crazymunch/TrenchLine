'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useSession, signOut } from 'next-auth/react';
import { THEMES } from '../../types/theme';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
import { AuthModal } from '../auth/AuthModal';
import { BugReportModal } from '../feedback/BugReportModal';
import { SyncStatus } from './SyncStatus';
import { 
  User,
  LogOut,
  LogIn,
  Palette,
  Crown,
  Coins,
  Sparkles,
  Shield,
  Swords,
  Flag,
  Users,
  BookOpen,
  SlidersHorizontal,
  Bug
} from 'lucide-react';
import { sessionIsAdmin } from '../../lib/session';
import type { RulesetVersion } from '../../types/rules';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView,
    getActiveWarband, 
    factions,
    currentTheme,
    rulesetVersion,
    setRulesetVersion
  } = useStore();

  const { data: session } = useSession();
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  const activeWarband = getActiveWarband();
  const currentFaction = factions.find(f => f.id === activeWarband?.factionId);
  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];
  const totalSpent = activeWarband?.units.reduce((sum, u) => sum + u.totalCost, 0) || 0;

  const viewTitles: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
    builder: { title: 'WARBAND ROSTER BUILDER', subtitle: 'Muster, equip, and customize your warriors', icon: <Shield className="w-4 h-4" /> },
    play: { title: 'TABLETOP COMBAT MODE', subtitle: 'Interactive wounds, blood markers, and actions tracker', icon: <Swords className="w-4 h-4" /> },
    campaign: { title: 'CRUSADE CAMPAIGN HUB', subtitle: 'Strategic world map, standings, and narrative battle chronicles', icon: <Flag className="w-4 h-4" /> },
    directory: { title: 'ROSTER DIRECTORY & ROSTERS', subtitle: 'Global warband registry and crusade administration', icon: <Users className="w-4 h-4" /> },
    codex: { title: 'OFFICIAL RULES CODEX', subtitle: 'Scenarios, tactical deployment maps, keywords, and armoury', icon: <BookOpen className="w-4 h-4" /> },
    customizer: { title: 'RULES CUSTOMIZER & DIFFS', subtitle: 'Custom unit profiles and rule overrides engine', icon: <SlidersHorizontal className="w-4 h-4" /> },
  };

  const currentViewInfo = viewTitles[currentView] || viewTitles.builder;

  return (
    <>
      <header className="sticky top-0 z-20 bg-theme-base/95 backdrop-blur border-b border-theme-border text-theme-text shadow-md transition-colors duration-300">
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3 min-w-0">
            
            {/* 1. Left (Mobile Only): Brand Emblem */}
            <div 
              className="flex lg:hidden items-center space-x-2.5 cursor-pointer flex-shrink-0"
              onClick={() => setCurrentView('builder')}
            >
              <div 
                className="w-8 h-8 rounded bg-theme-surface border flex items-center justify-center shadow-lg p-0.5"
                style={{ borderColor: activeThemeObj.primaryColor }}
              >
                <img src="/logo.webp" alt="TrenchLine" className="w-full h-full object-contain" />
              </div>
              <span 
                className="font-gothic font-bold text-base tracking-wider"
                style={{ color: activeThemeObj.primaryColor }}
              >
                TRENCHLINE
              </span>
            </div>

            {/*
              1. Left (Desktop): View Title Breadcrumb

              `min-w-0` and `truncate` are load-bearing. Without them this block
              sizes to its longest subtitle, and the Codex's — "Scenarios,
              tactical deployment maps, keywords, and armoury" — pushed the
              whole header to 1306px on a 1280px screen, so the desktop page
              scrolled sideways on that view and only that view. Same failure as
              the mobile header in Phase 0: a flex row whose children refuse to
              shrink is as wide as its contents, not as wide as the screen.
            */}
            <div className="hidden lg:flex items-center space-x-3 min-w-0 flex-1">
              <div 
                className="w-8 h-8 rounded bg-theme-surface border flex items-center justify-center shadow-inner flex-shrink-0"
                style={{ borderColor: activeThemeObj.primaryColor, color: activeThemeObj.primaryColor }}
              >
                {currentViewInfo.icon}
              </div>
              <div className="min-w-0">
                <h2 className="font-gothic font-bold text-sm tracking-wide text-theme-text truncate">
                  {currentViewInfo.title}
                </h2>
                <p className="text-xs sm:text-[10px] font-mono text-theme-muted leading-none truncate">
                  {currentViewInfo.subtitle}
                </p>
              </div>
            </div>

            {/*
              2. Middle: Active Warband Pill — tablet only.

              `lg:hidden` because at `lg:` the sidebar appears, and it already
              carries the faction, a selector naming the warband, the Ducat
              figure and a meter for it. Two copies of one number on one screen
              is one of them going stale in a future nobody plans for.

              It stays below `lg:`, where there is no sidebar: a tablet at a
              table would otherwise have nothing on screen saying which warband
              is active or what it has spent.
            */}
            {activeWarband && (
              <div className="hidden sm:flex lg:hidden items-center space-x-2.5 bg-theme-surface px-2 sm:px-3 py-1.5 rounded border border-theme-border text-xs font-mono min-w-0 shrink">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentFaction?.color || activeThemeObj.primaryColor }}
                />
                <span className="font-bold text-theme-text truncate max-w-[120px] sm:max-w-[180px]">
                  {activeWarband.name}
                </span>

                <div className="h-3 w-[1px] bg-theme-border" />

                {/*
                  `whitespace-nowrap` and `flex-shrink-0`: the pill shrinks, and
                  without both the budget broke across two lines as `1045` /
                  `1220 D`, which reads as a different number. A budget either
                  fits on one line or the warband name gives up width for it.
                */}
                <div className="flex items-center space-x-1 whitespace-nowrap flex-shrink-0 tabular-nums">
                  <Coins className="w-3 h-3 text-theme-primary" />
                  <span className={totalSpent > activeWarband.ducatLimit ? 'text-status-error font-bold' : 'text-theme-text'}>
                    {totalSpent}
                  </span>
                  <span className="text-theme-muted">/{activeWarband.ducatLimit} D</span>
                </div>

                <div className="hidden sm:flex items-center space-x-1 text-theme-primary whitespace-nowrap flex-shrink-0 tabular-nums">
                  <Sparkles className="w-3 h-3" />
                  <span>{activeWarband.gloryPoints}</span>
                </div>
              </div>
            )}

            {/* 3. Right: Quick Actions (Theme & Auth) */}
            {/*
              The actions never shrink; the title does.

              `min-w-0` here let this group shrink below its own content, and its
              children are `flex-shrink-0`, so they simply spilled past its right
              edge — 26px of sideways page scroll on every view whose title is
              long. Shrinking is the *title's* job: it truncates, and these are
              controls that stop being usable the moment they are clipped.
            */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

              {/* Icon-only below `md:`, where the top bar has no room for a
                  word — the tooltip and the screen-reader label carry the rest.
                  The group's gap drops to 4px on a phone to pay for it: adding
                  the icon at 6px gaps put the Login button 4px past the right
                  edge and gave the whole page a sideways scroll. */}
              <span className="hidden md:flex"><SyncStatus /></span>
              <span className="flex md:hidden"><SyncStatus compact /></span>

              
              {/* User Profile / Auth Button */}
              <div className="relative flex-shrink-0">
                {session?.user ? (
                  <button
                    onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-theme-elevated hover:bg-theme-border rounded border border-theme-border text-xs font-mono transition-colors"
                  >
                    {sessionIsAdmin(session) ? (
                      <Crown className="w-3.5 h-3.5 text-theme-primary" />
                    ) : (
                      <User className="w-3.5 h-3.5" style={{ color: activeThemeObj.primaryColor }} />
                    )}
                    <span className="max-w-[70px] sm:max-w-[110px] truncate text-theme-text font-bold">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                    {sessionIsAdmin(session) && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-theme-primary text-theme-base font-bold font-mono">
                        ADMIN
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                    aria-haspopup="menu"
                    aria-expanded={isAuthMenuOpen}
                    className="flex items-center space-x-1 px-2.5 py-1.5 text-theme-base font-mono text-xs font-bold uppercase rounded shadow transition-colors"
                    style={{ backgroundColor: activeThemeObj.primaryColor }}
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Login</span>
                  </button>
                )}

                {/*
                  The account menu, and on a phone the settings drawer too.

                  The bottom bar used to carry the theme switcher, the bug
                  reporter and — for an admin — the ruleset differ, alongside
                  five destinations. Seven or eight items in a 375px bar is why
                  every label was one font-metric away from clipping. They are
                  settings and utilities rather than places, so they moved
                  here; the bar keeps the five destinations and got bigger.

                  It opens when signed OUT as well. Those utilities are not an
                  account feature, and a visitor using the app locally — which
                  is supported everywhere else — must not lose the theme
                  switcher and the way to report a bug for want of signing in.
                */}
                {isAuthMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 bg-theme-surface border border-theme-border rounded-md shadow-2xl py-1 z-50"
                  >
                    {session?.user ? (
                      <>
                        <div className="px-3 py-2 border-b border-theme-border text-xs font-mono text-theme-muted">
                          Signed in as <strong className="text-theme-text block truncate">{session.user.email}</strong>
                        </div>
                        <button
                          role="menuitem"
                          onClick={() => { setIsAuthMenuOpen(false); signOut(); }}
                          className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-mono text-status-error hover:bg-theme-elevated flex items-center space-x-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <button
                        role="menuitem"
                        onClick={() => { setIsAuthMenuOpen(false); setIsAuthModalOpen(true); }}
                        className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-mono text-theme-text hover:bg-theme-elevated flex items-center space-x-2"
                      >
                        <LogIn className="w-3.5 h-3.5 text-theme-primary" />
                        <span className="font-bold">Sign in</span>
                      </button>
                    )}

                    {/*
                      The settings, at every width.

                      They were three buttons in the top bar on a desktop and
                      the same three in here on a phone, which is two designs
                      to keep in step and one of them always the poor relation.
                      Now there is one. They are settings rather than places:
                      you set a theme once and a ruleset per campaign, and
                      neither is worth 200px of a bar you look at constantly.
                    */}
                    <div className="border-t border-theme-border pt-1 mt-1">
                      <label className="block px-3 pt-1 pb-1 text-xs sm:text-[11px] font-mono uppercase tracking-wider text-theme-muted">
                        Ruleset
                      </label>
                      <select
                        value={rulesetVersion}
                        onChange={(e) => setRulesetVersion(e.target.value as RulesetVersion)}
                        aria-label="Active Ruleset Version"
                        /* 16px: anything smaller and iOS zooms the page on focus. */
                        className="mx-3 mb-1 w-[calc(100%-1.5rem)] min-h-[44px] px-2 bg-theme-base border border-theme-border rounded text-theme-primary text-base font-mono font-bold focus:outline-none focus:border-theme-primary"
                      >
                        <option value="1.0">v1.0 Core</option>
                        <option value="1.0.2">v1.0.2 Errata</option>
                        <option value="1.0.2TD">v1.0.2TD Dispatch</option>
                      </select>

                      <button
                        role="menuitem"
                        onClick={() => { setIsAuthMenuOpen(false); setIsThemeModalOpen(true); }}
                        className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-mono text-theme-text hover:bg-theme-elevated flex items-center space-x-2"
                      >
                        <Palette className="w-3.5 h-3.5" style={{ color: activeThemeObj.primaryColor }} />
                        <span>Theme — {activeThemeObj.name}</span>
                      </button>

                      {sessionIsAdmin(session) && (
                        <button
                          role="menuitem"
                          onClick={() => { setIsAuthMenuOpen(false); setCurrentView('customizer'); }}
                          className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-mono text-theme-text hover:bg-theme-elevated flex items-center space-x-2"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-theme-primary" />
                          <span>Ruleset differ</span>
                        </button>
                      )}

                      <button
                        role="menuitem"
                        onClick={() => { setIsAuthMenuOpen(false); setIsBugReportOpen(true); }}
                        className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-mono text-status-error hover:bg-theme-elevated flex items-center space-x-2"
                      >
                        <Bug className="w-3.5 h-3.5" />
                        <span>Report a bug</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Theme Switcher Modal */}
      <ThemeSwitcherModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />
    </>
  );
};
