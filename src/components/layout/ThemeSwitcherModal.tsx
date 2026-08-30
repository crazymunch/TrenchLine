'use client';

import React from 'react';
import { useStore } from '../../store/useStore';
import { THEMES } from '../../types/theme';
import { 
  Palette, 
  Check, 
  Shield, 
  Skull, 
  Flame, 
  Cross, 
  Crown, 
  Biohazard, 
  X,
  Sparkles
} from 'lucide-react';

interface ThemeSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSwitcherModal: React.FC<ThemeSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { currentTheme, setTheme, getActiveWarband, factions } = useStore();

  if (!isOpen) return null;

  const activeWarband = getActiveWarband();
  const activeFaction = factions.find(f => f.id === activeWarband?.factionId);

  const getIcon = (iconName: string, color: string) => {
    const props = { className: "w-5 h-5", style: { color } };
    switch (iconName) {
      case 'Shield': return <Shield {...props} />;
      case 'Skull': return <Skull {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Cross': return <Cross {...props} />;
      case 'Crown': return <Crown {...props} />;
      case 'Biohazard': return <Biohazard {...props} />;
      default: return <Palette {...props} />;
    }
  };

  const handleAutoMatch = () => {
    if (!activeWarband) return;
    const matched = THEMES.find(t => t.factionId === activeWarband.factionId);
    if (matched) {
      setTheme(matched.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-theme-surface border-2 border-theme-border rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border bg-theme-base flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-sm bg-theme-elevated border border-theme-primary flex items-center justify-center">
              <Palette className="w-5 h-5 text-theme-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-gothic tracking-wider text-theme-text uppercase">
                Visual Style & Grimdark Themes
              </h2>
              <p className="text-xs text-theme-muted font-mono">
                Select your faction aesthetic or tactical battle HUD skin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto Match Banner */}
        {activeWarband && (
          <div className="px-5 py-2.5 bg-theme-elevated/80 border-b border-theme-border flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-theme-muted">
              <span>Active Warband:</span>
              <span className="text-theme-text font-bold">{activeWarband.name}</span>
              <span className="text-theme-primary">({activeFaction?.name || activeWarband.factionId})</span>
            </div>
            <button
              onClick={handleAutoMatch}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-theme-base border border-theme-primary/50 text-theme-primary text-xs font-mono font-bold hover:bg-theme-primary/10 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Match Warband Faction</span>
            </button>
          </div>
        )}

        {/* Themes Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`relative p-4 rounded-sm border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
                  isSelected
                    ? 'border-theme-primary bg-theme-elevated shadow-lg shadow-black/40 scale-[1.01]'
                    : 'border-theme-border bg-theme-base/80 hover:border-theme-muted hover:bg-theme-surface'
                }`}
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div 
                        className="w-8 h-8 rounded-sm flex items-center justify-center border"
                        style={{ 
                          backgroundColor: theme.surfaceColor, 
                          borderColor: theme.borderColor 
                        }}
                      >
                        {getIcon(theme.iconName, theme.primaryColor)}
                      </div>
                      <div>
                        <h3 className="font-gothic font-bold text-sm tracking-wide text-theme-text group-hover:text-white">
                          {theme.name}
                        </h3>
                        <span 
                          className="text-[10px] font-mono font-bold uppercase tracking-wider block"
                          style={{ color: theme.primaryColor }}
                        >
                          {theme.primaryColor}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-theme-primary/20 border border-theme-primary text-theme-primary text-[10px] font-mono font-bold uppercase tracking-widest">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-theme-muted uppercase group-hover:text-theme-text">
                        Select
                      </span>
                    )}
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-theme-muted font-sans mb-3 line-clamp-2">
                    {theme.tagline}
                  </p>
                </div>

                {/* Color Palette Swatches */}
                <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-theme-muted uppercase">Palette</span>
                  <div className="flex items-center space-x-1.5">
                    <div 
                      className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.primaryColor }}
                      title={`Primary: ${theme.primaryColor}`}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.accentColor }}
                      title={`Accent: ${theme.accentColor}`}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.surfaceColor }}
                      title={`Surface: ${theme.surfaceColor}`}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.bgColor }}
                      title={`Background: ${theme.bgColor}`}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.borderColor }}
                      title={`Border: ${theme.borderColor}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border bg-theme-base flex items-center justify-between">
          <p className="text-xs text-theme-muted font-mono">
            Themes are saved automatically to your device.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-theme-elevated border border-theme-border hover:border-theme-primary text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
