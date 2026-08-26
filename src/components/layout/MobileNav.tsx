'use client';

import React, { useState } from 'react';
import { useStore, AppView } from '../../store/useStore';
import { THEMES } from '../../types/theme';
import { ThemeSwitcherModal } from './ThemeSwitcherModal';
import { Shield, Swords, Flag, BookOpen, SlidersHorizontal, Palette } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, currentTheme } = useStore();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'builder', label: 'Roster', icon: <Shield className="w-4 h-4" /> },
    { id: 'play', label: 'Play', icon: <Swords className="w-4 h-4" />, badge: 'LIVE' },
    { id: 'campaign', label: 'Campaign', icon: <Flag className="w-4 h-4" /> },
    { id: 'codex', label: 'Codex', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'customizer', label: 'Diff', icon: <SlidersHorizontal className="w-4 h-4" /> }
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0C0E12]/95 backdrop-blur border-t border-[#323846] px-2 py-1">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded transition-colors relative ${
                  isActive ? 'bg-[#161920]' : 'text-[#8E95A5] hover:text-[#ECEFF4]'
                }`}
                style={{
                  color: isActive ? activeThemeObj.primaryColor : undefined
                }}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#E53935] animate-ping" />
                  )}
                </div>
                <span className="text-[10px] font-mono mt-1 uppercase font-semibold">{item.label}</span>
              </button>
            );
          })}

          {/* Theme switcher button on mobile */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded transition-colors text-[#8E95A5] hover:text-[#ECEFF4]"
          >
            <div className="relative">
              <Palette className="w-4 h-4" style={{ color: activeThemeObj.primaryColor }} />
            </div>
            <span className="text-[10px] font-mono mt-1 uppercase font-semibold">Theme</span>
          </button>
        </div>
      </nav>

      <ThemeSwitcherModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />
    </>
  );
};
