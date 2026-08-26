'use client';

import React, { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryNode } from '../../types/campaign';
import { soundEffects } from '../../services/soundEffects';
import { 
  Flag, 
  Shield, 
  MapPin, 
  CheckCircle, 
  Crosshair, 
  Award,
  X,
  Swords,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Globe,
  Flame,
  Castle,
  Maximize2
} from 'lucide-react';

export const TerritoryMap: React.FC = () => {
  const { campaign, claimTerritory, getActiveWarband, setCurrentView } = useStore();
  const activeWb = getActiveWarband();

  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryNode | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleClaim = (node: TerritoryNode) => {
    if (!activeWb) return;
    claimTerritory(node.id, activeWb.id, activeWb.name);
    soundEffects.playCathedralBell();
    setSelectedTerritory({
      ...node,
      controlledByWarbandId: activeWb.id,
      controlledByPlayerName: activeWb.name
    });
  };

  const handleChallenge = (node: TerritoryNode) => {
    soundEffects.playTrenchWhistle();
    setSelectedTerritory(null);
    setCurrentView('play');
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.35, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.35, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-6 shadow-xl bevel-container">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#323846] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
              THE LANDS OF THE GREAT POWERS: STRATEGIC CAMPAIGN MAP
            </h3>
          </div>
          <p className="text-xs font-mono text-[#8E95A5]">
            Overarching world map of Trench Crusade. Click any strategic theater pin to inspect lore, assess control, or launch a warband offensive.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-[#0C0E12] p-1 rounded border border-[#323846] text-xs font-mono">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${
                viewMode === 'map'
                  ? 'bg-[#D4AF37] text-black shadow'
                  : 'text-[#8E95A5] hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>World Map</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${
                viewMode === 'grid'
                  ? 'bg-[#D4AF37] text-black shadow'
                  : 'text-[#8E95A5] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Theaters Grid</span>
            </button>
          </div>

          {activeWb && (
            <div className="text-xs font-mono text-[#8E95A5] bg-[#0C0E12] px-3 py-1.5 rounded border border-[#323846]">
              Active: <strong className="text-[#D4AF37]">{activeWb.name}</strong>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE WORLD MAP */}
      {viewMode === 'map' && (
        <div className="space-y-3">
          
          {/* Map Toolbar */}
          <div className="flex items-center justify-between bg-[#0C0E12] px-4 py-2 rounded-md border border-[#323846] text-xs font-mono">
            <span className="text-[#D4AF37] font-bold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scale: 1:{zoomLevel.toFixed(2)}x | 12 Contested Theaters</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-1.5 rounded border transition-colors flex items-center space-x-1 ${
                  showLabels 
                    ? 'bg-[#20242E] text-[#D4AF37] border-[#D4AF37]/50' 
                    : 'bg-[#161920] text-[#8E95A5] border-[#323846]'
                }`}
                title="Toggle Theater Banners"
              >
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="hidden sm:inline text-[11px] font-bold">Labels</span>
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                className="p-1.5 bg-[#20242E] hover:bg-[#323846] disabled:opacity-40 text-white rounded border border-[#323846]"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1.5 bg-[#20242E] hover:bg-[#323846] disabled:opacity-40 text-white rounded border border-[#323846]"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetZoom}
                className="p-1.5 bg-[#20242E] hover:bg-[#323846] text-[#8E95A5] hover:text-white rounded border border-[#323846]"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Map Viewer Viewport */}
          <div 
            ref={mapContainerRef}
            className="w-full h-[650px] bg-[#0C0E12] border-2 border-[#D4AF37]/60 rounded-md overflow-auto relative select-none scrollbar-thin shadow-2xl"
          >
            <div 
              className="relative transition-transform duration-200 origin-top-left"
              style={{
                width: zoomLevel > 1 ? `${zoomLevel * 100}%` : '100%',
                minWidth: '1000px',
                height: 'auto'
              }}
            >
              {/* Overarching Official Map Image */}
              <img
                src="/maps/trench_crusade_world_map.webp"
                alt="The Lands of the Great Powers World Map"
                className="w-full h-auto block rounded"
                draggable={false}
              />

              {/* Interactive Tactical Theater Hotspots */}
              {campaign.territories.map((node) => {
                const posX = node.x !== undefined ? node.x : 50;
                const posY = node.y !== undefined ? node.y : 50;
                const isControlledByMe = activeWb && node.controlledByWarbandId === activeWb.id;
                const isContested = !node.controlledByWarbandId;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedTerritory(node)}
                    style={{ left: `${posX}%`, top: `${posY}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                  >
                    {/* Pin Marker */}
                    <div className="relative flex items-center justify-center">
                      {/* Pulse Ring for Contested */}
                      {isContested && (
                        <div className="absolute w-8 h-8 rounded-full bg-[#D4AF37]/30 animate-ping" />
                      )}
                      {isControlledByMe && (
                        <div className="absolute w-8 h-8 rounded-full bg-[#4E9A6E]/40 animate-pulse" />
                      )}

                      {/* Icon Button */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-2xl border-2 transition-transform duration-200 group-hover:scale-125 ${
                          isControlledByMe
                            ? 'bg-[#4E9A6E] border-white text-white ring-2 ring-[#4E9A6E]/80'
                            : isContested
                            ? 'bg-[#0C0E12] border-[#D4AF37] text-[#D4AF37] ring-2 ring-[#D4AF37]/80'
                            : 'bg-[#8B0000] border-white text-white ring-2 ring-[#8B0000]/80'
                        }`}
                      >
                        {isControlledByMe ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isContested ? (
                          <Crosshair className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Permanent / Hover Label */}
                    {showLabels && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap pointer-events-none z-30 transition-all">
                        <div className={`px-2 py-0.5 rounded shadow-lg border text-[10px] font-mono font-bold uppercase flex items-center space-x-1 ${
                          isControlledByMe
                            ? 'bg-[#161920]/95 border-[#4E9A6E] text-[#4E9A6E]'
                            : isContested
                            ? 'bg-[#0C0E12]/95 border-[#D4AF37] text-[#ECEFF4]'
                            : 'bg-[#161920]/95 border-[#8B0000] text-[#E53935]'
                        }`}>
                          <span>{node.name}</span>
                          {node.controlledByPlayerName && (
                            <span className="text-[9px] text-[#D4AF37]">({node.controlledByPlayerName})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#8E95A5] flex items-center justify-between px-2">
            <span>Click any theater marker to inspect regional lore, strategic bonuses, and command options.</span>
            <span className="text-[#D4AF37]">The Lands of the Great Powers (800th Year of the Crusade)</span>
          </div>

        </div>
      )}

      {/* VIEW 2: STRATEGIC THEATERS GRID CARDS */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaign.territories.map((node) => {
            const isControlledByMe = activeWb && node.controlledByWarbandId === activeWb.id;
            const isContested = !node.controlledByWarbandId;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedTerritory(node)}
                className={`p-4 rounded-md border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between bevel-container ${
                  isControlledByMe
                    ? 'bg-[#161920] border-[#4E9A6E] ring-1 ring-[#4E9A6E]/40'
                    : isContested
                    ? 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]/60'
                    : 'bg-[#161920] border-[#8B0000]/80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#20242E] text-[#D4AF37]">
                      {node.region || node.type}
                    </span>

                    {isControlledByMe ? (
                      <span className="text-[10px] font-mono font-bold text-[#4E9A6E] flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>CONTROLLED</span>
                      </span>
                    ) : isContested ? (
                      <span className="text-[10px] font-mono font-bold text-[#D4AF37] flex items-center space-x-1">
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>CONTESTED</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-[#E53935] flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>OCCUPIED</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-gothic font-bold text-base text-[#ECEFF4] flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-[#D4AF37]" />
                    <span>{node.name}</span>
                  </h4>

                  <p className="text-xs text-[#8E95A5] font-sans leading-relaxed">
                    {node.description}
                  </p>
                </div>

                {/* Territory Perk & Controller */}
                <div className="mt-4 pt-3 border-t border-[#323846]/60 space-y-1 text-xs font-mono">
                  <div className="text-[#D4AF37] flex items-center space-x-1 font-semibold">
                    <Award className="w-3.5 h-3.5" />
                    <span>Perk: {node.perk}</span>
                  </div>
                  <div className="text-[11px] text-[#8E95A5]">
                    Controller: <strong className="text-[#ECEFF4]">{node.controlledByPlayerName || 'None (Unclaimed)'}</strong>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Strategic Theater Dossier Modal */}
      {selectedTerritory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-xl rounded-md shadow-2xl overflow-hidden bevel-container">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">STRATEGIC THEATER DOSSIER</h3>
              </div>
              <button
                onClick={() => setSelectedTerritory(null)}
                className="text-[#8E95A5] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold px-2 py-0.5 rounded bg-[#20242E] border border-[#D4AF37]/30">
                    {selectedTerritory.region || 'Frontline Sector'}
                  </span>
                  <span className="text-xs font-mono text-[#8E95A5]">{selectedTerritory.type}</span>
                </div>
                <h2 className="font-gothic font-bold text-2xl text-[#ECEFF4] mt-1.5">{selectedTerritory.name}</h2>
                <p className="text-xs text-[#ECEFF4] font-mono mt-2 leading-relaxed bg-[#0C0E12] p-3 rounded border border-[#323846]">
                  {selectedTerritory.description}
                </p>
              </div>

              <div className="p-3.5 bg-[#20242E] rounded border border-[#323846] space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[#8E95A5]">Strategic Territory Perk:</span>
                  <span className="text-[#D4AF37] font-bold">{selectedTerritory.perk}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#323846] pt-2">
                  <span className="text-[#8E95A5]">Current Theater Controller:</span>
                  <span className="text-[#ECEFF4] font-bold">
                    {selectedTerritory.controlledByPlayerName || 'Neutral (Unclaimed Frontier)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleClaim(selectedTerritory)}
                  className="py-2.5 px-4 bg-[#4E9A6E] hover:bg-[#5BAE7E] text-white font-mono text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Claim for Warband</span>
                </button>

                <button
                  onClick={() => handleChallenge(selectedTerritory)}
                  className="py-2.5 px-4 bg-[#8B0000] hover:bg-[#A30000] text-white font-mono text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Swords className="w-4 h-4" />
                  <span>Launch Offensive</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
