'use client';

import React, { useState, useEffect } from 'react';
import { useStore, AppView } from '../../store/useStore';
import { useSession } from 'next-auth/react';
import { THEMES } from '../../types/theme';
import { AuthModal } from '../auth/AuthModal';
import { 
  Shield, 
  Swords, 
  Flag, 
  BookOpen, 
  SlidersHorizontal, 
  User,
  ChevronLeft,
  ChevronRight,
  Users,
  Crown,
  LogIn,
  Sparkles
} from 'lucide-react';
import { sessionIsAdmin } from '../../lib/session';

export const Sidebar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    warbands, 
    activeWarbandId, 
    setActiveWarbandId, 
    getActiveWarband, 
    factions,
    currentTheme
  } = useStore();

  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isAdmin = sessionIsAdmin(session);

  useEffect(() => {
    if (!isAdmin && currentView === 'customizer') {
      setCurrentView('builder');
    }
  }, [isAdmin, currentView, setCurrentView]);

  // Load persisted collapse state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trenchline_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Ignore in SSR
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('trenchline_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const activeWarband = getActiveWarband();
  const currentFaction = factions.find((f) => f.id === activeWarband?.factionId);
  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const totalCost = activeWarband?.units.reduce((sum, u) => sum + u.totalCost, 0) || 0;

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'builder', label: 'Warband Roster', icon: <Shield className="w-5 h-5" /> },
    { id: 'play', label: 'Tabletop Combat', icon: <Swords className="w-5 h-5" />, badge: 'LIVE' },
    { id: 'campaign', label: 'Crusade Campaign', icon: <Flag className="w-5 h-5" /> },
    { id: 'directory', label: 'Roster Directory', icon: <Users className="w-5 h-5" /> },
    { id: 'codex', label: 'Rules Codex', icon: <BookOpen className="w-5 h-5" /> },
    ...(isAdmin ? [{ id: 'customizer' as AppView, label: 'Rules Customizer', icon: <SlidersHorizontal className="w-5 h-5" /> }] : [])
  ];

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-theme-base border-r border-theme-border text-theme-text transition-all duration-300 z-30 sticky top-0 h-[100dvh] select-none ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* 1. Header: Brand & Collapse Toggle */}
        <div className="flex items-center justify-between p-3.5 border-b border-theme-border h-16">
          {!isCollapsed ? (
            <div 
              onClick={() => setCurrentView('builder')}
              className="flex items-center space-x-2.5 cursor-pointer overflow-hidden flex-1 min-w-0"
            >
              <div 
                className="w-9 h-9 rounded bg-theme-surface border flex items-center justify-center shadow-lg flex-shrink-0 p-1"
                style={{ borderColor: activeThemeObj.primaryColor }}
              >
                <img src="/logo.webp" alt="TrenchLine" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span 
                    className="font-gothic font-bold text-base tracking-wider truncate"
                    style={{ color: activeThemeObj.primaryColor }}
                  >
                    TRENCHLINE
                  </span>
                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-theme-accent text-white font-mono uppercase font-bold flex-shrink-0">
                    TC
                  </span>
                </div>
                <span className="text-xs sm:text-[9px] text-theme-muted font-mono truncate">
                  Tactical Companion OS
                </span>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setCurrentView('builder')}
              className="w-full flex justify-center cursor-pointer"
              title="TrenchLine OS"
            >
              <div 
                className="w-9 h-9 rounded bg-theme-surface border flex items-center justify-center shadow-lg p-1"
                style={{ borderColor: activeThemeObj.primaryColor }}
              >
                <img src="/logo.webp" alt="TrenchLine" className="w-full h-full object-contain" />
              </div>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors flex-shrink-0 ml-1 ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Active Warband Command Widget (When Expanded) */}
        {!isCollapsed && activeWarband && (
          <div className="px-3 py-3 mx-0 border-b border-theme-border space-y-2">
            <div className="flex items-center justify-between gap-1 text-xs sm:text-[10px] font-mono">
              <span className="text-theme-muted uppercase font-bold flex items-center space-x-1.5 min-w-0 flex-1">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentFaction?.color || activeThemeObj.primaryColor }}
                />
                <span className="truncate">{currentFaction?.name || 'Active Roster'}</span>
              </span>
              {/*
                Glory beside the Ducats, because this is now the only place on
                a desktop that carries either.

                The top bar used to show a pill with the name, the budget AND
                the Glory; it duplicated this widget everywhere except Glory,
                so removing it as redundant would have taken the one figure
                that was not. `tabular-nums` and `whitespace-nowrap` for the
                same reason the old pill had them: a budget that wraps reads
                as a different number.
              */}
              <span className="flex items-center gap-2 flex-shrink-0 ml-1 tabular-nums whitespace-nowrap">
                <span className="font-bold text-theme-primary">
                  {totalCost}/{activeWarband.ducatLimit} D
                </span>
                <span className="flex items-center gap-1 text-theme-primary">
                  <Sparkles className="w-3 h-3" />
                  {activeWarband.gloryPoints}
                </span>
              </span>
            </div>

            <select
              value={activeWarbandId || ''}
              onChange={(e) => setActiveWarbandId(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded px-2.5 py-1.5 text-xs font-mono text-theme-text font-bold focus:outline-none focus:border-theme-primary"
            >
              {warbands.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.units.reduce((s, u) => s + u.totalCost, 0)} D)
                </option>
              ))}
            </select>

            {/* Point Meter */}
            <div className="w-full bg-theme-base h-1.5 rounded-full overflow-hidden border border-theme-border">
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (totalCost / activeWarband.ducatLimit) * 100)}%`,
                  backgroundColor: totalCost > activeWarband.ducatLimit ? '#E53935' : activeThemeObj.primaryColor
                }}
              />
            </div>
          </div>
        )}

        {/* 3. Navigation Links List */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 pb-1 text-xs sm:text-[10px] font-mono uppercase font-bold text-theme-muted tracking-wider">
              OPERATIONAL COMMAND
            </div>
          )}

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center text-[13px] transition-colors relative group border-l-2 ${
                  isCollapsed ? 'justify-center h-[52px] border-l-0' : 'px-3 py-2.5 gap-2.5'
                } ${
                  isActive
                    ? 'bg-theme-surface border-l-theme-primary font-semibold text-theme-text'
                    : 'border-l-transparent text-theme-muted hover:text-theme-text hover:bg-theme-elevated'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-theme-primary' : ''}`}>
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded text-xs sm:text-[9px] font-bold uppercase font-mono ${
                    isCollapsed ? 'absolute top-1 right-1 w-2 h-2 p-0 rounded-full bg-theme-accent' : 'bg-theme-accent text-white'
                  }`}>
                    {!isCollapsed && item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/*
          4. Bottom Footer: the signed-in identity and the expand toggle.

          It carried a Theme button and a Report a Bug button too — the third
          copy of each, after the top bar's and the phone account menu's. All
          three now live in one place, the account menu in the top bar, which
          is open at every width. Three copies of a setting is two of them
          drifting.
        */}
        <div className="p-3 border-t border-theme-border space-y-2 bg-theme-base">

          {/* User Auth Profile */}
          {session?.user ? (
            <div className={`flex items-center rounded bg-theme-surface border border-theme-border text-xs font-mono ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 justify-between'
            }`}>
              <div className="flex items-center space-x-2 truncate">
                {sessionIsAdmin(session) ? (
                  <Crown className="w-4 h-4 text-theme-primary flex-shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-theme-muted flex-shrink-0" />
                )}
                {!isCollapsed && (
                  <div className="truncate flex flex-col">
                    <span className="font-bold text-theme-text truncate text-xs sm:text-[11px]">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                    {sessionIsAdmin(session) && (
                      <span className="text-[8px] text-theme-primary font-bold uppercase leading-none">
                        CRUSADE ADMIN
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="tap text-theme-muted hover:text-theme-text p-1"
                  title="Account Details"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`w-full flex items-center rounded font-mono text-xs font-bold uppercase transition-colors shadow ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-2'
              }`}
              style={{ backgroundColor: activeThemeObj.primaryColor, color: '#000000' }}
              title="Login / Authenticate"
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Login</span>}
            </button>
          )}

          {/* Expand Toggle when Collapsed */}
          {isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="w-full flex justify-center p-2 rounded hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

        </div>

      </aside>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </>
  );
};
