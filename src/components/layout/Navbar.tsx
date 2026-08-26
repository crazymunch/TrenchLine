'use client';

import React, { useState } from 'react';
import { useStore, AppView } from '../../store/useStore';
import { useSession, signIn, signOut } from 'next-auth/react';
import { THEMES } from '../../types/theme';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
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
  LogOut,
  LogIn,
  Palette,
  ChevronDown,
  Users
} from 'lucide-react';

export const Navbar: React.FC = () => {
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
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const activeWarband = getActiveWarband();
  const currentFaction = factions.find(f => f.id === activeWarband?.factionId);
  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'builder', label: 'Roster', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'play', label: 'Play', icon: <Swords className="w-3.5 h-3.5" />, badge: 'LIVE' },
    { id: 'campaign', label: 'Campaign', icon: <Flag className="w-3.5 h-3.5" /> },
    { id: 'directory', label: 'Directory', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'codex', label: 'Codex', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'customizer', label: 'Customizer', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> }
  ];

  const totalSpent = activeWarband?.units.reduce((sum, u) => sum + u.totalCost, 0) || 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0C0E12]/95 backdrop-blur border-b border-[#323846] text-[#ECEFF4] shadow-md transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* 1. Left: Brand & Logo */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0"
              onClick={() => setCurrentView('builder')}
            >
              <div 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-[#161920] border-2 flex items-center justify-center shadow-lg transition-colors"
                style={{ borderColor: activeThemeObj.primaryColor }}
              >
                <Skull className="w-5 h-5 sm:w-5 sm:h-5" style={{ color: activeThemeObj.primaryColor }} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span 
                    className="font-gothic font-bold text-base sm:text-lg tracking-wider transition-colors"
                    style={{ color: activeThemeObj.primaryColor }}
                  >
                    TRENCHLINE
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-[#8B0000] text-white font-mono uppercase font-bold">
                    TC
                  </span>
                </div>
                <span className="text-[9px] text-[#8E95A5] font-mono hidden xl:block leading-none">
                  Tactical Companion OS
                </span>
              </div>
            </div>

            {/* 2. Middle-Left: Active Warband Quick Info / Dropdown */}
            {activeWarband && (
              <div className="hidden md:flex items-center space-x-3 bg-[#161920] px-3 py-1.5 rounded border border-[#323846] flex-shrink-0 transition-colors">
                <div className="flex items-center space-x-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: currentFaction?.color || activeThemeObj.primaryColor }} 
                  />
                  <div className="relative flex items-center">
                    <select
                      value={activeWarbandId || ''}
                      onChange={(e) => setActiveWarbandId(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm font-semibold font-gothic text-[#ECEFF4] focus:outline-none cursor-pointer pr-4 appearance-none max-w-[140px] lg:max-w-[180px] truncate"
                    >
                      {warbands.map((wb) => (
                        <option key={wb.id} value={wb.id} className="bg-[#161920] text-white">
                          {wb.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-[#8E95A5] absolute right-0 pointer-events-none" />
                  </div>
                </div>

                <div className="h-3.5 w-[1px] bg-[#323846]" />

                {/* Ducats / Limit */}
                <div className="flex items-center space-x-1 text-xs font-mono">
                  <Coins className="w-3 h-3" style={{ color: activeThemeObj.primaryColor }} />
                  <span className={totalSpent > activeWarband.ducatLimit ? 'text-[#E53935] font-bold' : 'text-[#ECEFF4]'}>
                    {totalSpent}
                  </span>
                  <span className="text-[#8E95A5] text-[10px]">/{activeWarband.ducatLimit}D</span>
                </div>

                {/* Glory */}
                <div className="hidden lg:flex items-center space-x-1 text-xs font-mono" style={{ color: activeThemeObj.primaryColor }}>
                  <Sparkles className="w-3 h-3" />
                  <span>{activeWarband.gloryPoints}G</span>
                </div>
              </div>
            )}

            {/* 3. Middle-Right: Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#20242E] border shadow-inner'
                        : 'text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]'
                    }`}
                    style={{
                      color: isActive ? activeThemeObj.primaryColor : undefined,
                      borderColor: isActive ? `${activeThemeObj.primaryColor}80` : 'transparent'
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-[#8B0000] text-white font-mono font-bold animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 4. Right: Theme Switcher & Auth Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              
              {/* Theme Switcher Button */}
              <button
                onClick={() => setIsThemeModalOpen(true)}
                title={`Visual Style: ${activeThemeObj.name} (Click to switch theme)`}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#161920] hover:bg-[#20242E] rounded border border-[#323846] hover:border-[#8E95A5] transition-all group shadow-sm flex-shrink-0"
              >
                <div 
                  className="w-3 h-3 rounded-full border border-black/50 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: activeThemeObj.primaryColor }}
                />
                <Palette className="w-3.5 h-3.5 text-[#8E95A5] group-hover:text-white" />
                <span className="text-xs font-mono font-bold hidden sm:inline" style={{ color: activeThemeObj.primaryColor }}>
                  {activeThemeObj.name.split(' ')[0]}
                </span>
              </button>

              {/* Auth Button */}
              <div className="relative flex-shrink-0">
                {session?.user ? (
                  <button
                    onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#20242E] hover:bg-[#323846] rounded border border-[#323846] text-xs font-mono transition-colors"
                  >
                    <User className="w-3.5 h-3.5" style={{ color: activeThemeObj.primaryColor }} />
                    <span className="max-w-[80px] lg:max-w-[110px] truncate text-[#ECEFF4] font-bold">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => signIn()}
                    className="flex items-center space-x-1 px-2.5 py-1.5 text-black font-mono text-xs font-bold uppercase rounded shadow transition-colors"
                    style={{ backgroundColor: activeThemeObj.primaryColor }}
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Login</span>
                  </button>
                )}

                {/* Dropdown Logout Menu */}
                {isAuthMenuOpen && session?.user && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#161920] border border-[#323846] rounded-md shadow-2xl py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#323846] text-xs font-mono text-[#8E95A5]">
                      Signed in as <strong className="text-[#ECEFF4] block truncate">{session.user.email}</strong>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full px-3 py-2 text-left text-xs font-mono text-[#E53935] hover:bg-[#20242E] flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Theme Switcher Modal */}
      <ThemeSwitcherModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />
    </>
  );
};
