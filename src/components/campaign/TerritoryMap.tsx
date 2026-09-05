'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryNode } from '../../types/campaign';
import { frameworkOf } from '@/rules/campaignFramework';
import { Warband } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { useOverlay } from '../ui/useOverlay';
import { 
  Shield, 
  MapPin, 
  CheckCircle, 
  Award, 
  X, 
  Swords, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Layers, 
  Globe, 
  Users,
  Check
} from 'lucide-react';

export const TerritoryMap: React.FC = () => {
  const { 
    campaign, 
    claimTerritory, 
    setTerritoryPerk,
    warbands, 
    allCloudWarbands, 
    fetchAllCloudWarbands, 
    getActiveWarband, 
    setCurrentView 
  } = useStore();

  const activeWb = getActiveWarband();

  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryNode | null>(null);
  const [selectedAssignWarbandId, setSelectedAssignWarbandId] = useState<string>('');
  const [editingPerk, setEditingPerk] = useState(false);
  const [perkDraft, setPerkDraft] = useState('');
  /*
    A Carcass Front campaign has NO pin coordinates. Its zone board — which
    zone borders which — is a graphic on the fold-out sheet in the box, so
    there is nowhere honest to put a marker, and scattering thirty-two of them
    over a map of Europe would be inventing a geography the book does not
    print. The list is the only view it has, and the World Map button is not
    offered rather than being offered and showing an empty map.
  */
  const onCarcassFront = frameworkOf(campaign) === 'carcass-front';
  const [viewMode, setViewMode] = useState<'map' | 'grid'>(onCarcassFront ? 'grid' : 'map');
  /*
    DERIVED, not corrected after the fact.

    `useState`'s initializer runs once. Creating a Carcass Front campaign while
    this view was already open left `viewMode` at `map`, and a Carcass Front
    campaign has no map — so the map branch was suppressed, the grid branch was
    false, and the switcher that would fix it is hidden for that framework.
    Nothing rendered at all until the user changed tabs to force a remount.

    Reading the mode through the framework makes that state unrepresentable
    rather than repaired by an effect after a blank frame. Reported by Codex
    review on #27.
  */
  const mode: 'map' | 'grid' = onCarcassFront ? 'grid' : viewMode;
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(true);
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

  /*
    Selecting a different territory leaves the editor, so an unsaved draft
    cannot be carried onto another territory and saved there by mistake.
  */
  const selectTerritory = (node: TerritoryNode | null) => {
    setEditingPerk(false);
    setSelectedTerritory(node);
  };

  /*
    Escape, the focus trap and the scroll lock for the dossier. Declared with
    a stable closer so the hook is not re-armed on every render.
  */
  const closeDossier = React.useCallback(() => {
    setEditingPerk(false);
    setSelectedTerritory(null);
  }, []);
  const dossier = useOverlay(!!selectedTerritory, closeDossier);

  const handleEditPerk = () => {
    if (!selectedTerritory) return;
    setPerkDraft(selectedTerritory.perk ?? '');
    setEditingPerk(true);
  };

  const handleSavePerk = () => {
    if (!selectedTerritory) return;
    if (!setTerritoryPerk(selectedTerritory.id, perkDraft)) return;
    const text = perkDraft.trim();
    setSelectedTerritory({
      ...selectedTerritory,
      perk: text,
      perkSource: text ? 'campaign' : undefined,
    });
    setEditingPerk(false);
  };

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

  const handleChallenge = (_node: TerritoryNode) => {
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
    <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 space-y-6 shadow-xl bevel-container font-mono text-xs">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-theme-primary" />
            <h3 className="font-gothic font-bold text-lg text-theme-text tracking-wide">
              THE LANDS OF THE GREAT POWERS: STRATEGIC CAMPAIGN MAP
            </h3>
          </div>
          <p className="text-xs text-theme-muted">
            {onCarcassFront
              ? 'The Carcass Front’s zones, each with the Resources it offers and the scenario played there. '
                + 'Which zone borders which is on the fold-out map in the box; the app does not have the board.'
              : 'Overarching world map of Trench Crusade. Click any strategic theater pin to assign control to any warband in the directory, or launch an offensive.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className={`flex bg-theme-base p-1 rounded border border-theme-border text-xs ${onCarcassFront ? 'hidden' : ''}`}>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${
                mode === 'map'
                  ? 'bg-theme-primary text-theme-base shadow'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>World Map</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${
                mode === 'grid'
                  ? 'bg-theme-primary text-theme-base shadow'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Theaters Grid</span>
            </button>
          </div>

          {/* Map View Controls (Zoom & Toggles) */}
          {mode === 'map' && (
            <div className="flex items-center space-x-1 bg-theme-base p-1 rounded border border-theme-border">
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-theme-border mx-1" />
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-1.5 rounded ${showLabels ? 'text-theme-primary' : 'text-theme-muted'}`}
                title="Toggle Theater Labels"
              >
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE WORLD MAP VIEW */}
      {mode === 'map' && (
        <div 
          ref={mapContainerRef}
          className="relative w-full rounded-md border-2 border-theme-border overflow-hidden bg-theme-base shadow-2xl"
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
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectTerritory(node)}
                  /*
                    A button, not a div with an onClick. The pin was reachable
                    only with a pointer: no focus, no Enter or Space, and
                    nothing to announce it as something you could press. A
                    button gives all three without a keydown handler of our own.

                    `tap` because the marker itself is 24px, under the 44px
                    floor (docs/MOBILE.md §3) — it widens the hit area without
                    changing what is drawn.
                  */
                  aria-label={`${node.name} — ${node.controlledByPlayerName
                    ? `held by ${node.controlledByPlayerName}` : 'unclaimed'}`}
                  className="tap absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-20 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-base"
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
                          ? 'bg-status-legal border-white text-white ring-4 ring-status-legal/40'
                          : isClaimedByOther
                          ? 'bg-theme-accent border-theme-primary text-white ring-4 ring-theme-accent/40'
                          : 'bg-theme-base/90 border-theme-primary text-theme-primary group-hover:bg-theme-primary group-hover:text-theme-base'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>

                    {/* Ping Animation on Frontline/Active Node */}
                    {isClaimedByActive && (
                      <span className="absolute w-8 h-8 rounded-full bg-status-legal opacity-75 animate-ping pointer-events-none" />
                    )}
                  </div>

                  {/* Pin Label Tooltip */}
                  {showLabels && (
                    <div className="mt-1 px-2 py-0.5 rounded bg-theme-base/95 border border-theme-border shadow-xl text-center whitespace-nowrap pointer-events-none group-hover:border-theme-primary transition-all">
                      <span className="font-gothic font-bold text-xs sm:text-[11px] text-theme-text block leading-tight">
                        {node.name}
                      </span>
                      <span className="text-xs sm:text-[9px] text-theme-primary block font-mono">
                        {node.controlledByPlayerName ? `Held by: ${node.controlledByPlayerName.slice(0, 20)}` : 'Unclaimed'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: STRATEGIC THEATERS GRID VIEW */}
      {mode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaign.territories.map((node) => {
            const isControlledByMe = activeWb && node.controlledByWarbandId === activeWb.id;
            const isContested = !!node.controlledByWarbandId;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => selectTerritory(node)}
                /*
                  `w-full text-left` because a button centres its text and
                  shrinks to its content, and this card is a left-aligned block
                  that fills its grid cell. Everything else about it is
                  unchanged — the point is the semantics, not the look.
                */
                className={`w-full text-left p-4 bg-theme-base border rounded-md transition-all cursor-pointer flex flex-col justify-between hover:border-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary ${
                  isControlledByMe
                    ? 'border-status-legal bg-status-legal/5 ring-1 ring-status-legal'
                    : isContested
                    ? 'border-theme-accent bg-theme-accent/5'
                    : 'border-theme-border'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted">
                      {node.type} • {node.region || 'Strategic Sector'}
                    </span>
                    {isControlledByMe ? (
                      <span className="text-xs sm:text-[10px] font-bold text-status-legal flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>FORTIFIED</span>
                      </span>
                    ) : isContested ? (
                      <span className="text-xs sm:text-[10px] font-bold text-theme-primary flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>OCCUPIED</span>
                      </span>
                    ) : (
                      <span className="text-xs sm:text-[10px] font-bold text-theme-muted">UNCLAIMED</span>
                    )}
                  </div>

                  <h4 className="font-gothic font-bold text-base text-theme-text flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-theme-primary" />
                    <span>{node.name}</span>
                  </h4>

                  <p className="text-xs text-theme-muted leading-relaxed">
                    {node.description}
                  </p>

                  {/*
                    Carcass Front only, and read off the map's own Zones table.
                    Which Resources a zone offers is what a player decides
                    where to fight on, so it belongs on the card and not two
                    taps away in the detail panel.
                  */}
                  {node.resources && node.resources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {node.resources.map((r) => (
                        <span
                          key={r}
                          className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated border border-theme-border text-theme-text"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/*
                  The perk is shown only where a campaign has one. Every
                  theatre used to carry an invented mechanical effect — a
                  "+15 Ducats & +1 Alchemical Formula discount per match" that
                  no book states — presented beside rules the pipeline derives
                  with nothing to tell a player which was which.
                */}
                <div className="mt-4 pt-3 border-t border-theme-border/60 space-y-1 text-xs">
                  {node.perk && (
                    <div className="text-theme-primary flex items-center space-x-1 font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      <span>Perk: {node.perk}</span>
                    </div>
                  )}
                  <div className="text-xs sm:text-[11px] text-theme-muted">
                    Controller: <strong className="text-theme-text">{node.controlledByPlayerName || 'None (Unclaimed)'}</strong>
                  </div>
                </div>

              </button>
            );
          })}
        </div>
      )}

      {/*
        The dossier.

        `useOverlay` gives it the three things every overlay owes the user and
        this one had none of: Escape, a focus trap, and a body scroll lock —
        so it could not be closed from a keyboard, Tab walked out into the map
        behind it, and the page scrolled under a finger on the panel. The hook
        was extracted from `Sheet` for exactly this, and nothing outside
        `Sheet` had adopted it yet.
      */}
      {selectedTerritory && (
        <div
          ref={dossier}
          role="dialog"
          aria-modal="true"
          aria-labelledby="territory-dossier-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs"
        >
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-xl rounded-md shadow-2xl overflow-hidden bevel-container">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-theme-primary" />
                <h3 id="territory-dossier-title" className="font-gothic font-bold text-lg text-theme-text">STRATEGIC THEATER DOSSIER</h3>
              </div>
              <button
                onClick={() => selectTerritory(null)}
                className="tap text-theme-muted hover:text-theme-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-[10px] text-theme-primary uppercase font-bold px-2 py-0.5 rounded bg-theme-elevated border border-theme-primary/30">
                    {selectedTerritory.region || 'Frontline Sector'}
                  </span>
                  <span className="text-xs text-theme-muted">{selectedTerritory.type}</span>
                </div>
                <h2 className="font-gothic font-bold text-2xl text-theme-text mt-1.5">{selectedTerritory.name}</h2>
                <p className="text-xs text-theme-text mt-2 leading-relaxed bg-theme-base p-3 rounded border border-theme-border">
                  {selectedTerritory.description}
                </p>
              </div>

              <div className="p-3.5 bg-theme-elevated rounded border border-theme-border space-y-2 text-xs">
                {/*
                  Says which it is, rather than showing a made-up effect. No
                  published rule attaches anything to holding one of these
                  theatres — they are the app's own map of the setting. The
                  ones the game does publish are the Carcass Front Special Zone
                  Outpost Bonuses, and those are in the Codex.
                */}
                {selectedTerritory.perkSource === 'published' ? (
                  <div className="space-y-1">
                    <span className="text-theme-muted">Outpost Bonus (published):</span>
                    <p className="text-theme-primary font-bold leading-relaxed">
                      {selectedTerritory.perk}
                    </p>
                  </div>
                ) : editingPerk ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="territory-perk"
                      className="text-theme-muted block"
                    >
                      Your campaign&rsquo;s house rule for holding {selectedTerritory.name}:
                    </label>
                    <textarea
                      id="territory-perk"
                      value={perkDraft}
                      onChange={(e) => setPerkDraft(e.target.value)}
                      rows={3}
                      maxLength={280}
                      placeholder="e.g. The holder may re-roll one Exploration dice after each battle."
                      className="w-full bg-theme-surface border border-theme-border rounded p-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePerk}
                        className="flex-1 min-h-[44px] lg:min-h-0 lg:py-2 px-3 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs"
                      >
                        Save house rule
                      </button>
                      <button
                        onClick={() => setEditingPerk(false)}
                        className="min-h-[44px] lg:min-h-0 lg:py-2 px-3 bg-theme-surface border border-theme-border text-theme-text font-bold uppercase rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : selectedTerritory.perk ? (
                  <div className="space-y-1">
                    {/*
                      Says WHOSE rule it is. Sixteen invented perks used to
                      render under "Strategic Territory Perk", the same heading
                      a published one would get, which is what made them look
                      like the book.
                    */}
                    <span className="text-theme-muted">House rule (set by this campaign):</span>
                    <p className="text-theme-text leading-relaxed">{selectedTerritory.perk}</p>
                    <button
                      onClick={handleEditPerk}
                      className="text-theme-primary underline min-h-[44px] lg:min-h-0 inline-flex items-center"
                    >
                      Edit or clear
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/*
                      Which kind of "no perk" this is. A Carcass Front zone is
                      PUBLISHED — parsed from the fold-out map's own Zones
                      table — and an empty perk there only means the book gives
                      it no Outpost Bonus, not that the app invented the place.
                      Saying otherwise about 22 of the 32 published zones is
                      the same class of error as the sixteen invented perks:
                      the app describing its own provenance wrongly.
                      Reported by Codex review on #27.
                    */}
                    {onCarcassFront ? (
                      <p className="text-theme-muted leading-relaxed">
                        A published zone, but not one of the ten{' '}
                        <strong className="text-theme-text">Special Zones</strong> — the book gives
                        it no Outpost Bonus, so any bonus for holding it is one your campaign
                        agrees.
                      </p>
                    ) : (
                      <p className="text-theme-muted leading-relaxed">
                        No published rule attaches an effect to holding this theatre — it is part of
                        this app&rsquo;s own map of the setting, so any bonus is one your campaign
                        agrees. The published ones are the Carcass Front{' '}
                        <strong className="text-theme-text">Special Zone Outpost Bonuses</strong>, in
                        the Codex under Campaigns.
                      </p>
                    )}
                    <button
                      onClick={handleEditPerk}
                      className="text-theme-primary underline min-h-[44px] lg:min-h-0 inline-flex items-center"
                    >
                      Add your campaign&rsquo;s own house rule
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-theme-border pt-2">
                  <span className="text-theme-muted">Current Controller:</span>
                  <span className="text-theme-text font-bold">
                    {selectedTerritory.controlledByPlayerName || 'Neutral (Unclaimed Frontier)'}
                  </span>
                </div>
              </div>

              {/* Assign to Any Warband in Roster Directory */}
              <div className="p-4 bg-theme-base rounded border border-theme-border space-y-2">
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign Theater Control to Warband from Directory:</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedAssignWarbandId}
                    onChange={(e) => setSelectedAssignWarbandId(e.target.value)}
                    className="flex-1 bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
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
                    className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-1"
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
                    className="py-2.5 px-4 bg-status-legal hover:bg-status-legal text-white text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Claim for Active Warband</span>
                  </button>
                )}

                <button
                  onClick={() => handleChallenge(selectedTerritory)}
                  className="py-2.5 px-4 bg-theme-accent hover:bg-status-error text-white text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
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
