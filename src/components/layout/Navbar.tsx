import React from 'react';
import { useStore, AppView } from '../../store/useStore';
import { 
  Shield, 
  Swords, 
  Flag, 
  BookOpen, 
  SlidersHorizontal, 
  Sparkles,
  Coins,
  Skull
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    warbands, 
    activeWarbandId, 
    setActiveWarbandId, 
    getActiveWarband,
    factions 
  } = useStore();

  const activeWarband = getActiveWarband();
  const currentFaction = factions.find(f => f.id === activeWarband?.factionId);

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'builder', label: 'Warband Roster', icon: <Shield className="w-4 h-4" /> },
    { id: 'play', label: 'Play Mode', icon: <Swords className="w-4 h-4" />, badge: 'LIVE' },
    { id: 'campaign', label: 'Campaign Hub', icon: <Flag className="w-4 h-4" /> },
    { id: 'codex', label: 'Rules Codex', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'customizer', label: 'Customizer & Diff', icon: <SlidersHorizontal className="w-4 h-4" /> }
  ];

  const totalSpent = activeWarband?.units.reduce((sum, u) => sum + u.totalCost, 0) || 0;

  return (
    <header className="sticky top-0 z-40 bg-[#0C0E12]/95 backdrop-blur border-b border-[#323846] text-[#ECEFF4]">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('builder')}>
            <div className="w-10 h-10 rounded-sm bg-[#161920] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg shadow-black/50">
              <Skull className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-gothic font-bold text-xl tracking-wider text-[#D4AF37]">TRENCHLINE</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#8B0000] text-white font-mono uppercase tracking-widest font-bold">TC OS</span>
              </div>
              <p className="text-xs text-[#8E95A5] font-mono hidden sm:block">Tactical Warband & Multi-Player Campaign System</p>
            </div>
          </div>

          {/* Active Warband Quick Info / Selector */}
          {activeWarband && (
            <div className="hidden md:flex items-center space-x-4 bg-[#161920] px-4 py-1.5 rounded border border-[#323846]">
              {/* Warband Dropdown */}
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: currentFaction?.color || '#D4AF37' }} 
                />
                <select
                  value={activeWarbandId || ''}
                  onChange={(e) => setActiveWarbandId(e.target.value)}
                  className="bg-transparent text-sm font-semibold font-gothic text-[#ECEFF4] focus:outline-none cursor-pointer pr-2"
                >
                  {warbands.map((wb) => (
                    <option key={wb.id} value={wb.id} className="bg-[#161920] text-white">
                      {wb.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-[1px] bg-[#323846]" />

              {/* Ducats / Limit */}
              <div className="flex items-center space-x-1.5 text-xs font-mono">
                <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className={totalSpent > activeWarband.ducatLimit ? 'text-[#E53935] font-bold' : 'text-[#ECEFF4]'}>
                  {totalSpent}
                </span>
                <span className="text-[#8E95A5]">/ {activeWarband.ducatLimit} D</span>
              </div>

              {/* Glory */}
              <div className="flex items-center space-x-1.5 text-xs font-mono text-[#D4AF37]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{activeWarband.gloryPoints} Glory</span>
              </div>
            </div>
          )}

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/50 shadow-inner'
                      : 'text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#8B0000] text-white font-mono font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        </div>
      </div>
    </header>
  );
};
