'use client';

import React, { useState, useEffect } from 'react';
import { useStore, AppView } from '../../store/useStore';
import { useSession } from 'next-auth/react';
import { THEMES } from '../../types/theme';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
import { AuthModal } from '../auth/AuthModal';
import { 
  Shield, 
  Swords, 
  Flag, 
  BookOpen, 
  SlidersHorizontal, 
  Sparkles, 
  Coins, 
  Skull,
  User,
  Palette,
  ChevronLeft,
  ChevronRight,
  Users,
  Crown,
  LogIn,
  LogOut
} from 'lucide-react';

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
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
    { id: 'customizer', label: 'Rules Customizer', icon: <SlidersHorizontal className="w-5 h-5" /> }
  ];

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-[#0C0E12] border-r border-[#323846] text-[#ECEFF4] transition-all duration-300 z-30 sticky top-0 h-screen select-none ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* 1. Header: Brand & Collapse Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-[#323846] h-16">
          {!isCollapsed ? (
            <div 
              onClick={() => setCurrentView('builder')}
              className="flex items-center space-x-3 cursor-pointer overflow-hidden"
            >
              <div 
                className="w-10 h-10 rounded bg-[#161920] border flex items-center justify-center shadow-lg flex-shrink-0 p-1"
                style={{ borderColor: activeThemeObj.primaryColor }}
              >
                <img src="/logo.webp" alt="Trench Crusade" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span 
                    className="font-gothic font-bold text-lg tracking-wider"
                    style={{ color: activeThemeObj.primaryColor }}
                  >
                    TRENCHLINE
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-[#8B0000] text-white font-mono uppercase font-bold">
                    TC
                  </span>
                </div>
                <span className="text-[9px] text-[#8E95A5] font-mono leading-none">
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
                className="w-10 h-10 rounded bg-[#161920] border flex items-center justify-center shadow-lg p-1"
                style={{ borderColor: activeThemeObj.primaryColor }}
              >
                <img src="/logo.webp" alt="Trench Crusade" className="w-full h-full object-contain" />
              </div>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded hover:bg-[#20242E] text-[#8E95A5] hover:text-white transition-colors ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Active Warband Command Widget (When Expanded) */}
        {!isCollapsed && activeWarband && (
          <div className="p-3.5 mx-3 mt-3 bg-[#161920] border border-[#323846] rounded-md space-y-2.5 shadow bevel-container">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#8E95A5] uppercase font-bold flex items-center space-x-1.5">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentFaction?.color || activeThemeObj.primaryColor }}
                />
                <span className="truncate max-w-[130px]">{currentFaction?.name || 'Active Roster'}</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-[#D4AF37]">
                {totalCost}/{activeWarband.ducatLimit} D
              </span>
            </div>

            <select
              value={activeWarbandId || ''}
              onChange={(e) => setActiveWarbandId(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded px-2.5 py-1.5 text-xs font-mono text-[#ECEFF4] font-bold focus:outline-none focus:border-[#D4AF37]"
            >
              {warbands.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.units.reduce((s, u) => s + u.totalCost, 0)} D)
                </option>
              ))}
            </select>

            {/* Point Meter */}
            <div className="w-full bg-[#0C0E12] h-1.5 rounded-full overflow-hidden border border-[#323846]">
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
            <div className="px-3 pb-1 text-[10px] font-mono uppercase font-bold text-[#8E95A5] tracking-wider">
              OPERATIONAL COMMAND
            </div>
          )}

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center rounded-md font-mono text-xs transition-all relative group ${
                  isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 space-x-3'
                } ${
                  isActive
                    ? 'bg-[#161920] border border-[#323846] font-bold text-white shadow'
                    : 'text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]/60'
                }`}
                style={{
                  borderLeftColor: isActive ? activeThemeObj.primaryColor : undefined,
                  borderLeftWidth: isActive ? '3px' : undefined
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <div 
                  className="flex-shrink-0 transition-colors"
                  style={{ color: isActive ? activeThemeObj.primaryColor : undefined }}
                >
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                    isCollapsed ? 'absolute top-1 right-1 w-2 h-2 p-0 rounded-full bg-[#8B0000]' : 'bg-[#8B0000] text-white'
                  }`}>
                    {!isCollapsed && item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 4. Bottom Footer: Theme Switcher, User Profile & Expand Toggle */}
        <div className="p-3 border-t border-[#323846] space-y-2 bg-[#0C0E12]">
          
          {/* Theme Switcher Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className={`w-full flex items-center rounded bg-[#161920] hover:bg-[#20242E] border border-[#323846] text-xs font-mono transition-colors ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-2.5'
            }`}
            title="Switch Visual Theme"
          >
            <Palette className="w-4 h-4 flex-shrink-0" style={{ color: activeThemeObj.primaryColor }} />
            {!isCollapsed && (
              <span className="truncate flex-1 text-left text-[#ECEFF4]">
                Theme: <strong style={{ color: activeThemeObj.primaryColor }}>{activeThemeObj.name.split(' ')[0]}</strong>
              </span>
            )}
          </button>

          {/* User Auth Profile */}
          {session?.user ? (
            <div className={`flex items-center rounded bg-[#161920] border border-[#323846] text-xs font-mono ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 justify-between'
            }`}>
              <div className="flex items-center space-x-2 truncate">
                {(session.user as any).isAdmin || session.user.email === 'crazymunch@gmail.com' ? (
                  <Crown className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-[#8E95A5] flex-shrink-0" />
                )}
                {!isCollapsed && (
                  <div className="truncate flex flex-col">
                    <span className="font-bold text-[#ECEFF4] truncate text-[11px]">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                    {((session.user as any).isAdmin || session.user.email === 'crazymunch@gmail.com') && (
                      <span className="text-[8px] text-[#D4AF37] font-bold uppercase leading-none">
                        CRUSADE ADMIN
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-[#8E95A5] hover:text-white p-1"
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
              className="w-full flex justify-center p-2 rounded hover:bg-[#20242E] text-[#8E95A5] hover:text-white transition-colors"
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

      {/* Theme Switcher Modal */}
      <ThemeSwitcherModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />
    </>
  );
};
