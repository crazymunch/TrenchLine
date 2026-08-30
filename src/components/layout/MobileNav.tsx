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
    { id: 'campaign', label: 'Campaign', icon: <Flag className="w-4 h-4" /> },
    { id: 'directory', label: 'Directory', icon: <Users className="w-4 h-4" /> },
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
        <div className="flex items-stretch gap-0.5">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[44px] py-1.5 px-0.5 rounded transition-colors relative ${
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
                <span className="text-[10px] font-mono mt-0.5 uppercase font-semibold truncate max-w-full leading-tight">{item.label}</span>
              </button>
            );
          })}

          {/* Theme switcher button on mobile */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex-1 min-w-0 flex flex-col items-center justify-center min-h-[44px] py-1.5 px-0.5 rounded transition-colors text-theme-muted hover:text-theme-text"
          >
            <div className="relative">
              <Palette className="w-4 h-4" style={{ color: activeThemeObj.primaryColor }} />
            </div>
            <span className="text-[10px] font-mono mt-0.5 uppercase font-semibold truncate max-w-full leading-tight">Theme</span>
          </button>

          {/* Bug report button on mobile */}
          <button
            onClick={() => setIsBugReportOpen(true)}
            className="flex-1 min-w-0 flex flex-col items-center justify-center min-h-[44px] py-1.5 px-0.5 rounded transition-colors text-status-error/80 hover:text-status-error"
          >
            <div className="relative">
              <Bug className="w-4 h-4 text-status-error" />
            </div>
            <span className="text-[10px] font-mono mt-0.5 uppercase font-semibold text-status-error truncate max-w-full leading-tight">Bug</span>
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
