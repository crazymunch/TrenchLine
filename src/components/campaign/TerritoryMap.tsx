'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryNode } from '../../types/campaign';
import { Warband } from '../../types/warband';
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
  Maximize2,
  Users,
  Check
} from 'lucide-react';

export const TerritoryMap: React.FC = () => {
  const { 
    campaign, 
    claimTerritory, 
    warbands, 
    allCloudWarbands, 
    fetchAllCloudWarbands, 
    getActiveWarband, 
    setCurrentView 
  } = useStore();

  const activeWb = getActiveWarband();

  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryNode | null>(null);
  const [selectedAssignWarbandId, setSelectedAssignWarbandId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllCloudWarbands();
  }, [fetchAllCloudWarbands]);

  // Combine local and cloud warbands uniquely from Roster Directory
  const allKnownWarbandsMap = new Map<string, Warband>();
  warbands.forEach((wb) => allKnownWarbandsMap.set(wb.id, wb));
  allCloudWarbands.forEach((wb) => {
    if (!allKnownWarbandsMap.has(wb.id)) {
      allKnownWarbandsMap.set(wb.id, wb);
    }
  });
  const allDirectoryWarbands = Array.from(allKnownWarbandsMap.values());

  const handleAssignTerritory = () => {
    if (!selectedTerritory) return;
    if (selectedAssignWarbandId === 'neutral') {
      claimTerritory(selectedTerritory.id, '', '');
      soundEffects.playCathedralBell();
      setSelectedTerritory({
        ...selectedTerritory,
        controlledByWarbandId: undefined,
        controlledByPlayerName: undefined
      });
      setSelectedAssignWarbandId('');
      return;
    }

    const targetWb = allDirectoryWarbands.find(w => w.id === selectedAssignWarbandId);
    if (targetWb) {
      claimTerritory(selectedTerritory.id, targetWb.id, `${targetWb.name} (${targetWb.creatorName || targetWb.factionId})`);
      soundEffects.playCathedralBell();
      setSelectedTerritory({
        ...selectedTerritory,
        controlledByWarbandId: targetWb.id,
        controlledByPlayerName: `${targetWb.name} (${targetWb.creatorName || targetWb.factionId})`
      });
      setSelectedAssignWarbandId('');
    }
  };

  const handleClaimForActive = (node: TerritoryNode) => {
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
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-6 shadow-xl bevel-container font-mono text-xs">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#323846] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
              THE LANDS OF THE GREAT POWERS: STRATEGIC CAMPAIGN MAP
            </h3>
          </div>
          <p className="text-xs text-[#8E95A5]">
            Overarching world map of Trench Crusade. Click any strategic theater pin to assign control to any warband in the directory, or launch an offensive.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-[#0C0E12] p-1 rounded border border-[#323846] text-xs">
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

          {/* Map View Controls (Zoom & Toggles) */}
          {viewMode === 'map' && (
            <div className="flex items-center space-x-1 bg-[#0C0E12] p-1 rounded border border-[#323846]">
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-[#8E95A5] hover:text-[#D4AF37] hover:bg-[#161920] rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-[#8E95A5] hover:text-[#D4AF37] hover:bg-[#161920] rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920] rounded"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-[#323846] mx-1" />
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-1.5 rounded ${showLabels ? 'text-[#D4AF37]' : 'text-[#8E95A5]'}`}
                title="Toggle Theater Labels"
              >
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE WORLD MAP VIEW */}
      {viewMode === 'map' && (
        <div 
          ref={mapContainerRef}
          className="relative w-full rounded-md border-2 border-[#323846] overflow-hidden bg-[#0C0E12] shadow-2xl"
          style={{ height: '580px' }}
        >
          {/* Zoomable Container */}
          <div 
            className="relative w-full h-full transition-transform duration-300 origin-center select-none"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Authentic Lore Map Background */}
            <img
              src="/images/world-map.webp"
              alt="The Lands of the Great Powers World Map"
              className="w-full h-full object-cover object-center pointer-events-none opacity-90 contrast-110"
              style={{ filter: 'brightness(0.95) contrast(1.15) sepia(0.15)' }}
            />

            {/* Strategic Theater Map Pins */}
            {campaign.territories.map((node) => {
              const isClaimedByActive = activeWb && node.controlledByWarbandId === activeWb.id;
              const isClaimedByOther = node.controlledByWarbandId && !isClaimedByActive;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedTerritory(node)}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-20"
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`
                  }}
                >
                  {/* Glowing Pin Marker */}
                  <div className="relative flex items-center justify-center">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all group-hover:scale-125 ${
                        isClaimedByActive
                          ? 'bg-[#4E9A6E] border-white text-white ring-4 ring-[#4E9A6E]/40'
                          : isClaimedByOther
                          ? 'bg-[#8B0000] border-[#D4AF37] text-white ring-4 ring-[#8B0000]/40'
                          : 'bg-[#0C0E12]/90 border-[#D4AF37] text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>

                    {/* Ping Animation on Frontline/Active Node */}
                    {isClaimedByActive && (
                      <span className="absolute w-8 h-8 rounded-full bg-[#4E9A6E] opacity-75 animate-ping pointer-events-none" />
                    )}
                  </div>

                  {/* Pin Label Tooltip */}
                  {showLabels && (
                    <div className="mt-1 px-2 py-0.5 rounded bg-[#0C0E12]/95 border border-[#323846] shadow-xl text-center whitespace-nowrap pointer-events-none group-hover:border-[#D4AF37] transition-all">
                      <span className="font-gothic font-bold text-[11px] text-[#ECEFF4] block leading-tight">
                        {node.name}
                      </span>
                      <span className="text-[9px] text-[#D4AF37] block font-mono">
                        {node.controlledByPlayerName ? `Held by: ${node.controlledByPlayerName.slice(0, 20)}` : 'Unclaimed'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: STRATEGIC THEATERS GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaign.territories.map((node) => {
            const isControlledByMe = activeWb && node.controlledByWarbandId === activeWb.id;
            const isContested = !!node.controlledByWarbandId;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedTerritory(node)}
                className={`p-4 bg-[#0C0E12] border rounded-md transition-all cursor-pointer flex flex-col justify-between hover:border-[#D4AF37] ${
                  isControlledByMe
                    ? 'border-[#4E9A6E] bg-[#4E9A6E]/5 ring-1 ring-[#4E9A6E]'
                    : isContested
                    ? 'border-[#8B0000] bg-[#8B0000]/5'
                    : 'border-[#323846]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#8E95A5]">
                      {node.type} • {node.region || 'Strategic Sector'}
                    </span>
                    {isControlledByMe ? (
                      <span className="text-[10px] font-bold text-[#4E9A6E] flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>FORTIFIED</span>
                      </span>
                    ) : isContested ? (
                      <span className="text-[10px] font-bold text-[#D4AF37] flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>OCCUPIED</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#8E95A5]">UNCLAIMED</span>
                    )}
                  </div>

                  <h4 className="font-gothic font-bold text-base text-[#ECEFF4] flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-[#D4AF37]" />
                    <span>{node.name}</span>
                  </h4>

                  <p className="text-xs text-[#8E95A5] leading-relaxed">
                    {node.description}
                  </p>
                </div>

                {/* Territory Perk & Controller */}
                <div className="mt-4 pt-3 border-t border-[#323846]/60 space-y-1 text-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
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

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-[#D4AF37] uppercase font-bold px-2 py-0.5 rounded bg-[#20242E] border border-[#D4AF37]/30">
                    {selectedTerritory.region || 'Frontline Sector'}
                  </span>
                  <span className="text-xs text-[#8E95A5]">{selectedTerritory.type}</span>
                </div>
                <h2 className="font-gothic font-bold text-2xl text-[#ECEFF4] mt-1.5">{selectedTerritory.name}</h2>
                <p className="text-xs text-[#ECEFF4] mt-2 leading-relaxed bg-[#0C0E12] p-3 rounded border border-[#323846]">
                  {selectedTerritory.description}
                </p>
              </div>

              <div className="p-3.5 bg-[#20242E] rounded border border-[#323846] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8E95A5]">Strategic Territory Perk:</span>
                  <span className="text-[#D4AF37] font-bold">{selectedTerritory.perk}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#323846] pt-2">
                  <span className="text-[#8E95A5]">Current Controller:</span>
                  <span className="text-[#ECEFF4] font-bold">
                    {selectedTerritory.controlledByPlayerName || 'Neutral (Unclaimed Frontier)'}
                  </span>
                </div>
              </div>

              {/* Assign to Any Warband in Roster Directory */}
              <div className="p-4 bg-[#0C0E12] rounded border border-[#323846] space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#D4AF37] flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign Theater Control to Warband from Directory:</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedAssignWarbandId}
                    onChange={(e) => setSelectedAssignWarbandId(e.target.value)}
                    className="flex-1 bg-[#161920] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">-- Select Warband in Directory ({allDirectoryWarbands.length}) --</option>
                    <option value="neutral">🏳️ Neutral (Reset / Unclaimed Frontier)</option>
                    {allDirectoryWarbands.map((wb) => (
                      <option key={wb.id} value={wb.id}>
                        {wb.name} ({wb.factionId}{wb.creatorName ? ` - ${wb.creatorName}` : ''})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignTerritory}
                    disabled={!selectedAssignWarbandId}
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Assign</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {activeWb && (
                  <button
                    onClick={() => handleClaimForActive(selectedTerritory)}
                    className="py-2.5 px-4 bg-[#4E9A6E] hover:bg-[#5BAE7E] text-white text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Claim for Active Warband</span>
                  </button>
                )}

                <button
                  onClick={() => handleChallenge(selectedTerritory)}
                  className="py-2.5 px-4 bg-[#8B0000] hover:bg-[#A30000] text-white text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
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
