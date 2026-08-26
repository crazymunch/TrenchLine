import React from 'react';
import { useStore, AppView } from '../../store/useStore';
import { Shield, Swords, Flag, BookOpen, SlidersHorizontal } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentView, setCurrentView } = useStore();

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'builder', label: 'Roster', icon: <Shield className="w-5 h-5" /> },
    { id: 'play', label: 'Play', icon: <Swords className="w-5 h-5" />, badge: 'LIVE' },
    { id: 'campaign', label: 'Campaign', icon: <Flag className="w-5 h-5" /> },
    { id: 'codex', label: 'Codex', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'customizer', label: 'Diff / Edit', icon: <SlidersHorizontal className="w-5 h-5" /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0C0E12]/95 backdrop-blur border-t border-[#323846] px-2 py-1">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded transition-colors relative ${
                isActive ? 'text-[#D4AF37] bg-[#161920]' : 'text-[#8E95A5] hover:text-[#ECEFF4]'
              }`}
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
      </div>
    </nav>
  );
};
