'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useScenarios, sectionOf } from '../../rules/useScenarios';
import { useDataset } from '../../rules/useDataset';
import { DiceRoller } from './DiceRoller';
import { PostBattleWizardModal } from '../campaign/PostBattleWizardModal';
import { AttackCalculatorModal } from './AttackCalculatorModal';
import { QuickSearchModal } from './QuickSearchModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AllOutWarCardConsole } from './AllOutWarCardConsole';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { RulesProse } from '../codex/RulesProse';
import { ViewMasthead } from '../ui/ViewMasthead';
import { parseDeeds } from './deeds';
import { parseUnforeseenEvents } from '../../rules/unforeseen';
import { rollWeatherForAll, type WeatherRoll } from '../../rules/weather';
import type { WeatherEvent } from '../../types/catalogue';
import { WarbandCombobox } from '../ui/WarbandCombobox';
import { warbandCode } from '../../rules/warbandCode';
import { 
  Heart, 
  Droplet, 
  RotateCcw, 
  Skull, 
  ArrowRight,
  Crosshair,
  UserCheck,
  Search,
  Compass,
  Award,
  Sparkles,
  Users,
  XCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Swords,
  Check,
  Sliders,
  Play,
  CloudRain,
  Lock,
  History,
  TrendingUp,
  Crown
} from 'lucide-react';

export const PlayModeView: React.FC = () => {
  const { 
    warbands,
    getActiveWarband, 
    playTurn, 
    incrementTurn, 
    resetMatchState,
    updateUnitWounds, 
    updateUnitBloodMarkers, 
    setUnitStatus, 
    toggleUnitActed,
    isPostBattleOpen,
    setIsPostBattleOpen,
  } = useStore();

  const primaryWarband = getActiveWarband();

  // Match Lifecycle State: false = Setup/Lobby, true = Combat Active
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [matchMode, setMatchMode] = useState<'single-device' | 'multiplayer-live'>('single-device');

  // Multi-Player / Multi-Warband State (1 to 4 Players)
  const [matchWarbandIds, setMatchWarbandIds] = useState<string[]>(
    primaryWarband ? [primaryWarband.id] : []
  );
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);

  // Active viewing warband
  const currentViewingWarbandId = matchWarbandIds[activePlayerIndex] || primaryWarband?.id || '';
  const viewingWarband = warbands.find((w) => w.id === currentViewingWarbandId) || primaryWarband;

  // Scenario & Scoring State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('claim-no-mans-land');
  
  // Multi-player progressive scoring: { [warbandId]: { vp: number; completedDeeds: Record<string, string>; turnScores: Record<number, number> } }
  const [warbandScores, setWarbandScores] = useState<Record<string, { 
    vp: number; 
    completedDeeds: Record<string, string>; 
    turnScores: Record<number, number>;
  }>>({});
  
  // Squad / Sub-list Deployment Filter
  const [deployedUnitIds, setDeployedUnitIds] = useState<Record<string, string[]>>({});
  const [isSquadSelectOpen, setIsSquadSelectOpen] = useState(false);
  const [isObjectivesPanelOpen, setIsObjectivesPanelOpen] = useState(true);
  const [isScoringHistoryOpen, setIsScoringHistoryOpen] = useState(false);

  // The Unforeseen Event currently in effect, if the scenario has a table.
  const [environmentalHazard, setEnvironmentalHazard] = useState<string>('');

  /*
    Hell on Earth. `weatherRolls` is every player's 2D6; `activeWeather` is the
    one the deciding player picked, which applies for the rest of the battle.
  */
  const [weatherRolls, setWeatherRolls] = useState<WeatherRoll[]>([]);
  const [activeWeather, setActiveWeather] = useState<WeatherEvent | null>(null);

  // Modals & Tools
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [attackingUnit, setAttackingUnit] = useState<ActiveUnit | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  /**
   * Whether the phone HUD is showing its secondary controls.
   *
   * Sticky, the full HUD is 391px of a 667px screen — 59% of the viewport
   * permanently spent on chrome while you are trying to read a model's card.
   * Collapsed it is the four things you touch every turn; the rest is one tap
   * away. Above `sm:` there is no collapse: the whole HUD fits.
   */
  const [isHudExpanded, setIsHudExpanded] = useState(false);
  const [isAbortConfirmOpen, setIsAbortConfirmOpen] = useState(false);
  const [isCardConsoleOpen, setIsCardConsoleOpen] = useState(false);
  const [isMapLightboxOpen, setIsMapLightboxOpen] = useState(false);

  /*
    Above the early return, and it has to be.

    The derived twelve plus the All Out War pack, in place of the hand-written
    set whose game lengths and Glorious Deeds were invented.

    This used to sit 30 lines further down, after `if (!viewingWarband)
    return`. React identifies a hook by its call order, so the component ran
    one fewer hook when no warband was selected than when one was — and the
    render where a player picks their first warband is exactly the transition
    that breaks. Every hook in this component now runs before any return.
  */
  const { scenarios } = useScenarios();

  /*
    The Weather Events table, from the ruleset rather than from a constant.

    No fallback if the dataset has not loaded: the roll button is simply absent,
    the same rule the rest of the app follows. A hard-coded copy of the table
    here would be the fourth place in this codebase where game data got written
    by hand, and the first three were all wrong.
  */
  const { dataset: playDataset } = useDataset();
  const weatherTable = playDataset?.weather ?? null;

  if (!viewingWarband) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Skull className="w-12 h-12 text-theme-primary mx-auto opacity-75" />
        <h3 className="font-gothic font-bold text-lg text-theme-text">NO WARBAND SELECTED</h3>
        <p className="text-xs font-mono text-theme-muted">Select or build a warband in the roster builder to enter Play Mode.</p>
      </div>
    );
  }

  // Deployed units for current warband
  const currentDeployedIds = deployedUnitIds[viewingWarband.id] || viewingWarband.units.map((u) => u.id);
  const deployedUnits = viewingWarband.units.filter((u) => currentDeployedIds.includes(u.id));
  const deployedCost = deployedUnits.reduce((sum, u) => sum + u.totalCost, 0);

  // Statistics

  const filteredUnits = deployedUnits.filter((u) => {
    if (filterStatus === 'All') return true;
    return u.status === filterStatus;
  });

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // Check if scenario is All Out War (Multiplayer card deck applies only here)
  const isAllOutWarScenario = Boolean(
    selectedScenario && (
      /all out war/i.test(selectedScenario.name) ||
      /all-out-war/i.test(selectedScenario.id) ||
      selectedScenario.tagline?.toLowerCase().includes('all out war') ||
      (selectedScenario.number && selectedScenario.number > 12)
    )
  );

  // Score for current warband
  const currentScoreObj = warbandScores[viewingWarband.id] || { vp: 0, completedDeeds: {}, turnScores: {} };

  const handleStartCombat = () => {
    soundEffects.playDiceRoll();
    setIsMatchActive(true);
  };

  const handleAbortMatch = () => {
    soundEffects.playDiceRoll();
    resetMatchState();
    setIsMatchActive(false);
    setIsAbortConfirmOpen(false);
  };

  const handleAdjustVpForWarband = (wbId: string, delta: number) => {
    setWarbandScores((prev) => {
      const cur = prev[wbId] || { vp: 0, completedDeeds: {}, turnScores: {} };
      const nextVp = Math.max(0, cur.vp + delta);
      const currentTurnScores = { ...(cur.turnScores || {}) };
      currentTurnScores[playTurn] = Math.max(0, (currentTurnScores[playTurn] || 0) + delta);

      return {
        ...prev,
        [wbId]: {
          ...cur,
          vp: nextVp,
          turnScores: currentTurnScores
        }
      };
    });
  };

  /*
    Who has claimed each Deed, across the whole match.

    "Unless stated otherwise, each Glorious Deed can only be completed once,
    and whichever player completes a Deed first gets the glory! If both players
    complete the same Glorious Deed at the same time, roll-off to determine who
    completed the Glorious Deed first."
      — Comprehensive Rulebook, Glorious Deeds

    The checklist was keyed per warband and nothing looked across them, so in a
    two-player match both sides could tick Bloodletting and both scored the VP.
    In a campaign that is Glory and a Promotion die each as well.
  */
  const deedClaimedBy = (deedTitle: string): string | undefined =>
    matchWarbandIds.find((id) => warbandScores[id]?.completedDeeds[deedTitle] !== undefined);

  // Toggle Glorious Deed checkbox
  const handleToggleDeed = (deedTitle: string, defaultPerformer: string = 'Squad') => {
    // Someone else got there first. The roll-off the book calls for is a
    // conversation at the table, not something the app can adjudicate — so it
    // holds the first claim and leaves them to un-tick it if the roll went the
    // other way.
    const holder = deedClaimedBy(deedTitle);
    if (holder && holder !== viewingWarband.id) return;

    setWarbandScores((prev) => {
      const cur = prev[viewingWarband.id] || { vp: 0, completedDeeds: {}, turnScores: {} };
      const nextDeeds = { ...cur.completedDeeds };
      if (nextDeeds[deedTitle]) {
        delete nextDeeds[deedTitle];
      } else {
        nextDeeds[deedTitle] = defaultPerformer;
      }
      return {
        ...prev,
        [viewingWarband.id]: {
          ...cur,
          completedDeeds: nextDeeds
        }
      };
    });
  };

  // Set performer for a deed WITHOUT toggling or unselecting
  const handleSetDeedPerformer = (deedTitle: string, performerName: string) => {
    setWarbandScores((prev) => {
      const cur = prev[viewingWarband.id] || { vp: 0, completedDeeds: {}, turnScores: {} };
      return {
        ...prev,
        [viewingWarband.id]: {
          ...cur,
          completedDeeds: {
            ...cur.completedDeeds,
            [deedTitle]: performerName
          }
        }
      };
    });
  };

  const handleToggleDeployUnit = (unitId: string) => {
    setDeployedUnitIds((prev) => {
      const currentList = prev[viewingWarband.id] || viewingWarband.units.map((u) => u.id);
      const nextList = currentList.includes(unitId)
        ? currentList.filter((id) => id !== unitId)
        : [...currentList, unitId];
      return {
        ...prev,
        [viewingWarband.id]: nextList
      };
    });
  };

  const handleSelectAllSquad = () => {
    setDeployedUnitIds((prev) => ({
      ...prev,
      [viewingWarband.id]: viewingWarband.units.map((u) => u.id)
    }));
  };

  const handleAddPlayerWarband = (wbId: string) => {
    if (matchWarbandIds.length >= 4 || matchWarbandIds.includes(wbId)) return;
    setMatchWarbandIds((prev) => [...prev, wbId]);
  };

  const handleRemovePlayerWarband = (wbId: string) => {
    if (matchWarbandIds.length <= 1) return;
    setMatchWarbandIds((prev) => prev.filter((id) => id !== wbId));
    setActivePlayerIndex(0);
  };

  const handleRollWeather = () => {
    soundEffects.playDiceRoll();
    if (!weatherTable) return;
    setWeatherRolls(rollWeatherForAll(weatherTable.events, matchWarbandIds.length));
    setActiveWeather(null);
  };

  const handleNextTurnWithWhistle = () => {
    soundEffects.playDiceRoll();
    incrementTurn();
  };

  const scenarioDeeds = parseDeeds(sectionOf(selectedScenario, 'GLORIOUS DEEDS'));
  const unforeseenEvents = parseUnforeseenEvents(sectionOf(selectedScenario, 'UNFORESEEN EVENTS'));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-24 font-mono text-xs">
      
      {/* ----------------------------------------------------------------------------
          VIEW A: MATCH DESIGNER & BATTLE LOBBY (BEFORE COMMENCING COMBAT)
          ---------------------------------------------------------------------------- */}
      {!isMatchActive ? (
        <div className="space-y-6">
          
          {/* Lobby Header */}
          <div className="bg-theme-surface border-2 border-theme-primary rounded-md p-5 sm:p-6 shadow-2xl space-y-4 bevel-container">
            <ViewMasthead
              eyebrow="Tabletop"
              icon={<Swords className="w-4 h-4" />}
              title="Match Designer & Lobby"
              strapline="Set the scenario, the field strength, the participants (two to four players) and the battle conditions before taking to the field."
            />
            {/*
              No Commence button here, deliberately.

              It sat at the top of the lobby, above the warband list, so the
              quickest path into a match was to start one without ever looking
              at who was in it or what they were bringing. The only way in is
              now the button at the foot of the page, which means scrolling
              past the participants, their deployed strength and the scenario
              on the way.
            */}

            {/* Mode Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-theme-border">
              <button
                onClick={() => setMatchMode('single-device')}
                className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center space-x-2 ${
                  matchMode === 'single-device'
                    ? 'bg-theme-primary text-theme-base shadow'
                    : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                }`}
              >
                <span>📱 Single Device Mode (Pass & Play)</span>
              </button>

              <button
                onClick={() => setMatchMode('multiplayer-live')}
                className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center space-x-2 ${
                  matchMode === 'multiplayer-live'
                    ? 'bg-theme-accent text-white shadow ring-1 ring-theme-primary'
                    : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                }`}
              >
                <span>🌐 Live Multi-Device Match Link</span>
                <span className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-theme-primary text-theme-base font-bold uppercase tracking-wide">
                  Coming Soon
                </span>
              </button>
            </div>
          </div>

          {/* MULTIPLAYER LIVE MODE: COMING SOON / ARCHITECTURE ROADMAP VIEW */}
          {matchMode === 'multiplayer-live' ? (
            <div className="bg-theme-surface border-2 border-theme-accent rounded-md p-6 sm:p-8 space-y-6 shadow-2xl bevel-container animate-fade-in">
              <div className="flex items-center space-x-3 border-b border-theme-border pb-4">
                <div className="w-10 h-10 rounded bg-theme-accent/20 border border-theme-accent flex items-center justify-center">
                  <Users className="w-5 h-5 text-status-error" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-gothic font-bold text-lg sm:text-xl text-theme-text">
                      LIVE MULTI-DEVICE MATCH LINK (HOST & JOIN)
                    </h2>
                    <span className="text-xs sm:text-[10px] px-2 py-0.5 rounded bg-theme-primary text-theme-base font-bold uppercase">
                      In Development
                    </span>
                  </div>
                  <p className="text-xs text-theme-muted">
                    Play across multiple phones and tablets with central cloud synchronization.
                  </p>
                </div>
              </div>

              {/* Architecture & Role Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Host Role */}
                <div className="bg-theme-base border-2 border-theme-primary rounded-md p-5 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-theme-primary" />
                    <strong className="font-gothic font-bold text-sm text-theme-text uppercase">
                      1. Match Host (Tabletop Director)
                    </strong>
                  </div>
                  <ul className="space-y-2 text-xs text-theme-muted">
                    <li className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-theme-primary flex-shrink-0 mt-0.5" />
                      <span>Initiates match lobby & generates shareable 4-digit Match PIN (e.g. <code>TL-4091</code>) or QR Code.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-theme-primary flex-shrink-0 mt-0.5" />
                      <span>Selects scenario, deployment rules, and environmental hazards.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-theme-primary flex-shrink-0 mt-0.5" />
                      <span>Controls global actions: advances round turns, deals 52-card All Out War decks, and starts alliance timers.</span>
                    </li>
                  </ul>
                </div>

                {/* Player Role */}
                <div className="bg-theme-base border-2 border-theme-border rounded-md p-5 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-status-legal" />
                    <strong className="font-gothic font-bold text-sm text-theme-text uppercase">
                      2. Connected Players (Commanders)
                    </strong>
                  </div>
                  <ul className="space-y-2 text-xs text-theme-muted">
                    <li className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-status-legal flex-shrink-0 mt-0.5" />
                      <span>Join via phone or tablet from anywhere at the table using the Match PIN.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-status-legal flex-shrink-0 mt-0.5" />
                      <span>Controls only their own warband: tracks wounds, activations, and rolls attacks from their own screen.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-status-legal flex-shrink-0 mt-0.5" />
                      <span>Real-time WebSocket sync: changes appear immediately on the Host and all opponents' devices without refreshing.</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Status Banner */}
              <div className="p-4 bg-theme-elevated rounded border border-theme-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <strong className="text-xs uppercase text-theme-primary block font-bold">
                    🚀 Currently in Alpha Architecture Staging
                  </strong>
                  <p className="text-xs sm:text-[11px] text-theme-muted">
                    Use the fully-featured <strong>Single Device Mode (Pass & Play)</strong> below to run local matches and multiplayer games on your iPad, phone, or laptop.
                  </p>
                </div>

                <button
                  onClick={() => setMatchMode('single-device')}
                  className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow-lg flex-shrink-0"
                >
                  Return to Single Device Mode
                </button>
              </div>

            </div>
          ) : (
            <>
              {/* 1. Scenario Selection & Map Preview */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-5 sm:p-6 space-y-4 bevel-container">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-theme-primary" />
                <h2 className="font-gothic font-bold text-lg text-theme-text">
                  1. OFFICIAL SCENARIO & DEPLOYMENT DIAGRAM
                </h2>
              </div>
              <span className="text-xs text-theme-primary font-bold">
                Scenario {selectedScenario?.number || 'I'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Scenario Picker & Map Card */}
              <div className="space-y-3">
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Select Mission / Scenario:
                </label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full bg-theme-base border-2 border-theme-primary rounded p-2.5 text-xs text-theme-text focus:outline-none"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {/* Map Preview with Lightbox Trigger */}
                {selectedScenario?.mapImage && (
                  <div 
                    onClick={() => setIsMapLightboxOpen(true)}
                    className="bg-theme-base border-2 border-theme-primary/50 hover:border-theme-primary rounded p-2.5 space-y-1.5 text-center cursor-pointer group transition-all relative overflow-hidden shadow-lg"
                  >
                    <div className="relative overflow-hidden rounded">
                      <img
                        src={selectedScenario.mapImage}
                        alt={selectedScenario.name}
                        className="w-full h-56 object-contain rounded transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-theme-primary text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-1.5">
                          <Search className="w-3.5 h-3.5" />
                          <span>Enlarge Official Map</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-[10px] text-theme-muted pt-0.5 px-1 font-mono">
                      <span className="text-theme-primary font-bold">🔍 Click to Expand Diagram</span>
                      <span>{selectedScenario.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Scenario Details & Rules */}
              <div className="lg:col-span-2 space-y-4 bg-theme-base p-4 rounded border border-theme-border">
                <div>
                  <h3 className="font-gothic font-bold text-base text-theme-primary">{selectedScenario?.name}</h3>
                  <p className="text-xs text-theme-muted italic pt-0.5">{selectedScenario?.tagline}</p>

                  {/* Published, or absent. The defaults these replaced —
                      '48" x 48"', '4-5 Turns', 'Standard' — were what the app
                      actually displayed, because the hand-written fields behind
                      them were wrong for every scenario. */}
                  {selectedScenario?.gameLength && (
                    <p className="text-xs text-theme-text pt-2 border-b border-theme-border pb-2">
                      {selectedScenario.gameLength}
                    </p>
                  )}
                </div>

                {/* Victory Conditions */}
                <div className="space-y-1 text-xs">
                  <span className="text-xs sm:text-[10px] uppercase font-bold text-status-legal block flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Victory Conditions:</span>
                  </span>
                  {sectionOf(selectedScenario, 'VICTORY CONDITIONS') ? (
                    <div className="bg-theme-surface p-2.5 border border-theme-border">
                      <RulesProse source={sectionOf(selectedScenario, 'VICTORY CONDITIONS')} className="text-xs" />
                    </div>
                  ) : (
                    /* Said, not hidden. The scenario is derived from the book;
                       if it has no victory conditions that is a gap in the
                       source, and a player should see that rather than an
                       empty box. */
                    <p className="text-xs font-mono text-theme-muted">
                      Not present in this scenario&rsquo;s entry.
                    </p>
                  )}
                </div>

                {/* Glorious Deeds Preview */}
                {scenarioDeeds.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary block flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Glorious Deeds Available ({scenarioDeeds.length}):</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scenarioDeeds.map((deed, dIdx) => (
                        <div key={dIdx} className="p-2 bg-theme-surface rounded border border-theme-border text-xs sm:text-[10px]">
                          <strong className="text-theme-primary block">{deed.title}</strong>
                          <span className="text-theme-muted">{deed.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Multiplayer Match Integration (2 to 4 Players) */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-5 sm:p-6 space-y-4 bevel-container">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-theme-primary" />
                <h2 className="font-gothic font-bold text-lg text-theme-text">
                  2. WARBAND INTEGRATION & SQUAD MUSTER (1 TO 4 PLAYERS)
                </h2>
              </div>
              <span className="text-xs text-theme-muted">
                {matchWarbandIds.length} Warband{matchWarbandIds.length > 1 ? 's' : ''} Linked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {matchWarbandIds.map((wbId, idx) => {
                const wb = warbands.find((w) => w.id === wbId);
                const depIds = deployedUnitIds[wbId] || wb?.units.map((u) => u.id) || [];
                const depCost = wb?.units.filter((u) => depIds.includes(u.id)).reduce((s, u) => s + u.totalCost, 0) || 0;

                return (
                  <div key={wbId} className="p-4 bg-theme-base border-2 border-theme-primary rounded-md space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary">
                        PLAYER {idx + 1} {idx === 0 ? '(YOU)' : ''}
                      </span>
                      {idx > 0 && (
                        <button
                          onClick={() => handleRemovePlayerWarband(wbId)}
                          className="text-theme-muted hover:text-status-error text-xs"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-gothic font-bold text-base text-theme-text truncate">{wb?.name}</h3>
                        {/* The code, so it can be read out to whoever is adding you. */}
                        <span className="text-xs sm:text-[10px] font-mono text-theme-primary tracking-widest flex-shrink-0">
                          {wb && warbandCode(wb.id)}
                        </span>
                      </div>
                      <span className="text-xs sm:text-[10px] text-theme-muted block">
                        Faction: {wb?.factionId}
                      </span>
                    </div>

                    <div className="p-2.5 bg-theme-surface rounded border border-theme-border text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-theme-muted">Deployed Models:</span>
                        <strong className="text-theme-text">{depIds.length} / {wb?.units.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-muted">Deployed Rating:</span>
                        <strong className="text-theme-primary">{depCost} D</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActivePlayerIndex(idx);
                        setIsSquadSelectOpen(true);
                      }}
                      className="w-full py-1.5 bg-theme-elevated hover:bg-theme-border border border-theme-border text-theme-text text-xs font-bold uppercase rounded flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-theme-primary" />
                      <span>Select Squad ({depIds.length})</span>
                    </button>
                  </div>
                );
              })}

              {/* Add Player Slot Button (up to 4) */}
              {matchWarbandIds.length < 4 && (
                <div className="p-4 bg-theme-base/50 border-2 border-dashed border-theme-border rounded-md flex flex-col items-center justify-center space-y-2 text-center">
                  <Users className="w-6 h-6 text-theme-muted" />
                  <span className="text-xs text-theme-muted font-bold uppercase">
                    Add Opponent / Ally ({matchWarbandIds.length + 1} of 4)
                  </span>
                  
                  {/*
                    A select sizes itself to its widest option, so one long
                    warband name pushed this straight out of the dashed box it
                    sits in. And an alphabetical list is the wrong way to find a
                    roster you can already name — so: type the name, the
                    faction, or the five-character code.
                  */}
                  <div className="w-full min-w-0">
                    <WarbandCombobox
                      label="Add a warband to the match"
                      placeholder="+ Add warband — name or code"
                      warbands={warbands.filter((w) => !matchWarbandIds.includes(w.id))}
                      onSelect={(w) => handleAddPlayerWarband(w.id)}
                      secondary={(w) => `${w.factionId} · ${w.units.length} models`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Match Parameters & Environmental Conditions */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-5 sm:p-6 space-y-4 bevel-container">
            <div className="flex items-center space-x-2 border-b border-theme-border pb-3">
              <Sliders className="w-5 h-5 text-theme-primary" />
              <h2 className="font-gothic font-bold text-lg text-theme-text">
                3. TACTICAL RULES & ENVIRONMENTAL HAZARDS
              </h2>
            </div>

            {/*
              Hell on Earth: the Weather Event for this battle.

              "After the battlefield has been set up but before players have
              Deployed any models, each player rolls 2D6 on the Weather Event
              Table" — so it belongs here, in the lobby, and every player rolls.
              Optional by the module's own words, which is why nothing is rolled
              until someone asks for it.
            */}
            {weatherTable && (
            <div className="space-y-2 pb-4 border-b border-theme-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted">
                  Weather Event (Hell on Earth) — optional
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRollWeather}
                    className="flex items-center gap-1.5 px-3 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow min-h-[44px] sm:min-h-0"
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Roll 2D6 each ({matchWarbandIds.length})</span>
                  </button>
                  {weatherRolls.length > 0 && (
                    <button
                      onClick={() => { setWeatherRolls([]); setActiveWeather(null); }}
                      className="px-3 py-2 bg-theme-base text-theme-muted border border-theme-border rounded text-xs font-bold uppercase min-h-[44px] sm:min-h-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {weatherRolls.length === 0 ? (
                <p className="text-theme-muted text-xs sm:text-[11px] leading-relaxed">
                  {weatherTable.procedure}
                </p>
              ) : (
                <div className="space-y-2">
                  {/*
                    Whose call it is, stated rather than decided: the app cannot
                    know the table's Campaign VP standings, and guessing would
                    be worse than asking.
                  */}
                  <p className="text-theme-muted text-xs sm:text-[11px] leading-relaxed">
                    The player with the fewest Campaign Victory Points picks which of these
                    applies for the rest of the battle. Level, or a one-off game? Roll off.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {weatherRolls.map((r) => {
                      const wb = warbands.find((w) => w.id === matchWarbandIds[r.player]);
                      const chosen = activeWeather?.name === r.event.name;
                      return (
                        <button
                          key={r.player}
                          onClick={() => setActiveWeather(chosen ? null : r.event)}
                          className={`p-3 rounded border text-left transition-all ${
                            chosen
                              ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary/40'
                              : 'bg-theme-base border-theme-border hover:border-theme-primary/50'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs sm:text-[10px] uppercase text-theme-muted truncate">
                              {wb?.name ?? `Player ${r.player + 1}`}
                            </span>
                            <span className="font-mono text-theme-primary flex-shrink-0">
                              {r.dice[0]} + {r.dice[1]} = {r.total}
                            </span>
                          </div>
                          <strong className="font-gothic font-bold text-base text-theme-text block">
                            {r.event.name}
                          </strong>
                          <p className="text-theme-muted text-xs sm:text-[11px] leading-relaxed pt-0.5">
                            {r.event.effect}
                          </p>
                          {chosen && (
                            <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary block pt-1">
                              In effect for this battle
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Environmental Condition / Battlefield Hazard:
                </label>
                {/*
                  The scenario's own Unforeseen Events, or nothing.

                  This was a list of five invented conditions — Heavy Trench Fog
                  at "Max 18\" Ranged Sight", Chlorine Gas Pockets, Volcanic
                  Brimstone Ashfall — none of which is in the game. The one
                  published table belongs to Hunt for Heroes and is rolled
                  during play rather than chosen at muster, so for every other
                  scenario there is nothing to pick and the app says so.
                */}
                {unforeseenEvents.length > 0 ? (
                  <select
                    value={environmentalHazard}
                    onChange={(e) => setEnvironmentalHazard(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  >
                    <option value="">No event in effect</option>
                    {unforeseenEvents.map((ev) => (
                      <option key={ev.roll} value={ev.name}>
                        {ev.roll}. {ev.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-theme-base border border-theme-border rounded text-theme-muted text-xs sm:text-[11px] leading-relaxed">
                    This scenario has no Unforeseen Events table. Only Hunt for Heroes prints one,
                    and it is rolled at the start of each Turn after the first.
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Deployment Rules:
                </label>
                <div className="p-2.5 bg-theme-base border border-theme-border rounded text-theme-muted text-xs sm:text-[11px]">
                  Infiltrators & Forward Positions deploy per official scenario diagram.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Bar */}
          <div className="bg-theme-base border-2 border-theme-primary rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-gothic font-bold text-lg text-theme-text">
                READY TO ENTER THE TRENCHES?
              </h3>
              <p className="text-xs text-theme-muted">
                Scenario: <strong>{selectedScenario?.name}</strong> • {deployedUnits.length} Models ({deployedCost} D)
              </p>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Only show Card Engine button if All Out War */}
              {isAllOutWarScenario && (
                <button
                  onClick={() => setIsCardConsoleOpen(true)}
                  className="flex items-center space-x-2 px-5 py-3.5 bg-theme-accent hover:bg-status-error text-white font-bold uppercase rounded text-sm shadow-xl transition-all"
                >
                  <Layers className="w-4 h-4 text-theme-primary" />
                  <span>🃏 CARD & BETRAYAL ENGINE</span>
                </button>
              )}

              <button
                onClick={handleStartCombat}
                className="flex items-center space-x-2 px-8 py-3.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-sm shadow-xl shadow-theme-primary/30 transition-all"
              >
                <Play className="w-4 h-4" />
                <span>⚔️ ENTER TABLETOP COMBAT</span>
              </button>
            </div>
          </div>
            </>
          )}

        </div>
      ) : (
        /* ----------------------------------------------------------------------------
            VIEW B: ACTIVE TABLETOP COMBAT INTERFACE
            ---------------------------------------------------------------------------- */
        <div className="space-y-5">
          
          {/*
            Phone combat strip — the four controls you touch every turn (3.6).

            The combat screen is about 6,300px tall with nine models deployed:
            nine and a half phone screens. Turn, Next Turn and End Match all
            lived at the very top of it, so after the second model a player was
            scrolling the length of the match to touch any of them, one-handed,
            at a table.

            Making the whole HUD sticky was the obvious fix and the wrong one:
            it is 323px even collapsed, and a bar that permanently owns half a
            667px screen is not a fix for a scrolling problem. This carries the
            turn number and the three actions in 56px, and the full HUD below
            keeps everything else and scrolls with the page.

            `top-14` clears the app header, which is itself sticky. Phone only:
            above `sm:` the HUD is on screen anyway.
          */}
          <div className="sm:hidden sticky top-14 z-30 -mx-3 px-3 py-1.5 bg-theme-base/95 backdrop-blur border-y border-theme-primary/60 flex items-center gap-2">
            <span className="font-gothic font-bold text-base text-theme-primary flex-shrink-0">
              T{playTurn}
            </span>
            <button
              onClick={() => setIsQuickSearchOpen(true)}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 bg-theme-elevated text-theme-primary border border-theme-primary/50 rounded font-mono text-xs font-bold uppercase"
              title="Lookup rules and keywords"
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Rules</span>
            </button>
            <button
              onClick={handleNextTurnWithWhistle}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 bg-theme-elevated text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase"
            >
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Turn</span>
            </button>
            <button
              onClick={() => setIsPostBattleOpen(true)}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 bg-theme-accent text-white rounded font-mono text-xs font-bold uppercase"
            >
              <Skull className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">End</span>
            </button>
          </div>

          {/* Active Combat HUD — the full set, scrolling with the page. */}
          <div className="bg-theme-surface border-2 border-theme-primary rounded-md p-3 sm:p-4 shadow-2xl space-y-3 bevel-container">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Left: Warband & Turn Info */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-theme-base border border-theme-primary px-3 py-1.5 rounded flex items-center space-x-2">
                  <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted">TURN</span>
                  <span className="font-gothic font-bold text-lg text-theme-primary">{playTurn}</span>
                </div>

                {/* Player Selector Tabs (if multiplayer) */}
                {matchWarbandIds.length > 1 && (
                  <div className="flex items-center space-x-1 bg-theme-base p-1 rounded border border-theme-border">
                    {matchWarbandIds.map((wbId, pIdx) => {
                      const wb = warbands.find((w) => w.id === wbId);
                      const isSel = pIdx === activePlayerIndex;
                      const pScore = warbandScores[wbId]?.vp || 0;
                      return (
                        <button
                          key={wbId}
                          onClick={() => setActivePlayerIndex(pIdx)}
                          className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 ${
                            isSel
                              ? 'bg-theme-primary text-theme-base shadow'
                              : 'text-theme-muted hover:text-theme-text'
                          }`}
                        >
                          <span>P{pIdx + 1}: {wb?.name.slice(0, 10)}</span>
                          <span className="text-xs sm:text-[10px] px-1 rounded bg-black/30 font-bold">{pScore} VP</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className={isHudExpanded ? 'block' : 'hidden sm:block'}>
                  <h2 className="font-gothic font-bold text-base text-theme-text">{viewingWarband.name}</h2>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">
                    Scenario: <strong className="text-theme-primary">{selectedScenario?.name}</strong>
                    {environmentalHazard && <> • {environmentalHazard}</>}
                  </span>
                </div>
              </div>

              {/* Middle: Live Multi-Player VP Meters */}
              <div className="flex flex-wrap items-center gap-2">
                {matchWarbandIds.map((wbId, pIdx) => {
                  const pScore = warbandScores[wbId]?.vp || 0;
                  const isCurrent = wbId === viewingWarband.id;

                  return (
                    <div 
                      key={wbId}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded border ${
                        isCurrent 
                          ? 'bg-theme-base border-theme-primary ring-1 ring-theme-primary/30' 
                          : 'bg-theme-base/60 border-theme-border'
                      }`}
                    >
                      <span className={`text-xs sm:text-[10px] uppercase font-bold ${isCurrent ? 'text-theme-primary' : 'text-theme-muted'}`}>
                        {pIdx === 0 ? 'YOU' : `P${pIdx + 1}`}:
                      </span>
                      <button
                        onClick={() => handleAdjustVpForWarband(wbId, -1)}
                        className="w-5 h-5 rounded bg-theme-elevated hover:bg-theme-border text-theme-text flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-bold text-xs text-theme-text px-0.5">{pScore} VP</span>
                      <button
                        onClick={() => handleAdjustVpForWarband(wbId, 1)}
                        className="w-5 h-5 rounded bg-theme-elevated hover:bg-theme-border text-theme-text flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Right: Actions Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsSquadSelectOpen(true)}
                  className={`${isHudExpanded ? 'flex' : 'hidden sm:flex'} items-center space-x-1.5 px-3 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors`}
                  title="Select which warriors are deployed in this match"
                >
                  <Users className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Squad ({deployedUnits.length})</span>
                </button>

                {/* Only show Cards & Alliances button if All Out War */}
                {isAllOutWarScenario && (
                  <button
                    onClick={() => setIsCardConsoleOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-theme-accent hover:bg-status-error text-white border border-theme-primary/50 rounded font-mono text-xs font-bold uppercase transition-colors"
                    title="All Out War 52-card deck, Betrayal hands, and 3-minute alliance console"
                  >
                    <Layers className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Cards & Alliances</span>
                  </button>
                )}

                <button
                  onClick={() => setIsMapLightboxOpen(true)}
                  className={`${isHudExpanded ? 'flex' : 'hidden sm:flex'} items-center space-x-1.5 px-3 py-2 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/50 rounded font-mono text-xs font-bold uppercase transition-colors`}
                  title="Inspect official scenario deployment diagram"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Map</span>
                </button>

                <button
                  onClick={() => setIsQuickSearchOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/50 rounded font-mono text-xs font-bold uppercase transition-colors"
                  title="Lookup rules and keywords"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Rules</span>
                </button>

                <button
                  onClick={handleNextTurnWithWhistle}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors"
                  title="Advance to next turn (Sounds Trench Command Whistle)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Next Turn</span>
                </button>

                <button
                  onClick={() => setIsPostBattleOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-theme-accent hover:bg-status-error text-white rounded font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-theme-accent/40"
                >
                  <Skull className="w-4 h-4" />
                  <span>End Match</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsAbortConfirmOpen(true)}
                  className={`${isHudExpanded ? 'flex' : 'hidden sm:flex'} items-center justify-center p-2 text-theme-muted hover:text-status-error bg-theme-base hover:bg-theme-elevated border border-theme-border rounded transition-colors`}
                  title="Cancel / Abort Match"
                >
                  <XCircle className="w-4 h-4" />
                </button>

                {/* Phone only: the rest of the HUD, one tap away. */}
                <button
                  onClick={() => setIsHudExpanded((v) => !v)}
                  className="sm:hidden flex items-center justify-center px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-muted border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors"
                  aria-expanded={isHudExpanded}
                >
                  {isHudExpanded ? 'Less' : 'More'}
                </button>
              </div>

            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-2 border-t border-theme-border pt-3 overflow-x-auto">
              {['All', 'Active', 'Downed', 'Out of Action'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded text-xs font-mono uppercase font-bold transition-all whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-theme-primary text-theme-base shadow'
                      : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

          </div>

          {/* INTERACTIVE MISSION SCORING & GLORIOUS DEEDS CHECKLIST PANEL */}
          <div className="bg-theme-surface border-2 border-theme-border rounded-md overflow-hidden shadow-xl bevel-container">
            
            {/* Panel Header */}
            <div 
              className="p-4 bg-theme-elevated border-b border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
              onClick={() => setIsObjectivesPanelOpen(!isObjectivesPanelOpen)}
            >
              <div className="flex items-center space-x-3">
                <Compass className="w-5 h-5 text-theme-primary" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-gothic font-bold text-base text-theme-text">
                      SCENARIO OBJECTIVES & GLORIOUS DEEDS TRACKER
                    </h3>
                    <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-base text-theme-primary border border-theme-border font-bold">
                      {selectedScenario?.name}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-theme-muted">
                    Progressive victory points tally and warrior glorious feat checklist
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 font-mono text-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScoringHistoryOpen(!isScoringHistoryOpen);
                  }}
                  className="px-2.5 py-1 bg-theme-base hover:bg-theme-surface text-theme-primary border border-theme-border rounded flex items-center space-x-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Turn Score Breakdown</span>
                </button>

                <button className="tap text-theme-muted hover:text-theme-text p-1">
                  {isObjectivesPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Turn by Turn Progressive Breakdown Card */}
            {isScoringHistoryOpen && (
              <div className="p-4 bg-theme-base border-b border-theme-border space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-theme-primary flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>Progressive Turn-by-Turn VP Breakdown:</span>
                  </span>
                  <span className="text-xs sm:text-[10px] text-theme-muted">Current Turn: {playTurn}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {matchWarbandIds.map((wbId, _pIdx) => {
                    const wb = warbands.find((w) => w.id === wbId);
                    const scores = warbandScores[wbId] || { vp: 0, completedDeeds: {}, turnScores: {} };
                    const turns = [1, 2, 3, 4, 5];

                    return (
                      <div key={wbId} className="p-3 bg-theme-base rounded border border-theme-border space-y-2">
                        <div className="flex items-center justify-between border-b border-theme-border pb-1">
                          <strong className="text-xs text-theme-text">{wb?.name}</strong>
                          <span className="text-xs font-bold text-theme-primary">{scores.vp} Total VP</span>
                        </div>

                        <div className="grid grid-cols-5 gap-1 text-center text-xs sm:text-[10px]">
                          {turns.map((tNum) => (
                            <div key={tNum} className={`p-1 rounded ${playTurn === tNum ? 'bg-theme-primary/20 border border-theme-primary' : 'bg-theme-surface'}`}>
                              <span className="text-xs sm:text-[9px] text-theme-muted block">T{tNum}</span>
                              <strong className="text-theme-text">{scores.turnScores[tNum] || 0}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panel Body */}
            {isObjectivesPanelOpen && (
              <div className="p-5 bg-theme-base space-y-4 font-mono text-xs animate-fade-in">
                
                {/* Scenario Selector & Victory Rules */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Scenario Status: Locked during active match */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-theme-primary" />
                      <span>Active Scenario (Locked for Match):</span>
                    </label>
                    <div className="p-2.5 bg-theme-surface border border-theme-border rounded text-theme-primary font-bold">
                      {selectedScenario?.name}
                    </div>
                    {selectedScenario?.tagline && (
                      <p className="text-xs sm:text-[11px] text-theme-muted italic pt-1">{selectedScenario.tagline}</p>
                    )}
                  </div>

                  {/* Victory Conditions Rules */}
                  <div className="md:col-span-2 p-3 bg-theme-surface border border-theme-border rounded space-y-1">
                    <span className="text-xs sm:text-[10px] uppercase font-bold text-status-legal flex items-center space-x-1.5">
                      <Award className="w-3.5 h-3.5" />
                      <span>Victory Conditions & Scoring Rules:</span>
                    </span>
                    <RulesProse source={sectionOf(selectedScenario, 'VICTORY CONDITIONS')} className="text-xs" />
                  </div>

                </div>

                {/* Glorious Deeds Checklist */}
                <div className="space-y-2 pt-2 border-t border-theme-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Glorious Deeds Checklist ({viewingWarband.name}):</span>
                    </span>
                    <span className="text-xs sm:text-[10px] text-theme-muted">
                      {Object.keys(currentScoreObj.completedDeeds).length} of {scenarioDeeds.length} claimed
                      {matchWarbandIds.length > 1 && (() => {
                        const taken = scenarioDeeds.filter(
                          (d) => { const h = deedClaimedBy(d.title); return h && h !== viewingWarband.id; }).length;
                        return taken > 0 ? ` · ${taken} taken by others` : '';
                      })()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scenarioDeeds.map((deed, idx) => {
                      const isChecked = !!currentScoreObj.completedDeeds[deed.title];
                      const performer = currentScoreObj.completedDeeds[deed.title] || '';
                      // Claimed by somebody else: the glory is gone, and this
                      // side cannot score it. See handleToggleDeed.
                      const holderId = deedClaimedBy(deed.title);
                      const takenBy = holderId && holderId !== viewingWarband.id
                        ? warbands.find((w) => w.id === holderId)
                        : undefined;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded border transition-all space-y-2 ${
                            isChecked
                              ? 'bg-theme-surface border-theme-primary ring-1 ring-theme-primary/30'
                              : takenBy
                                ? 'bg-theme-base/60 border-theme-border/60 opacity-60'
                                : 'bg-theme-surface/60 border-theme-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className={`flex items-start space-x-2.5 flex-1 ${takenBy ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={Boolean(takenBy)}
                                onChange={() => handleToggleDeed(deed.title, deployedUnits[0]?.customName || 'Squad')}
                                className="mt-0.5 rounded border-theme-border text-theme-primary focus:ring-0 disabled:opacity-50"
                              />
                              <div>
                                <strong className={`block text-xs ${isChecked ? 'text-theme-primary' : 'text-theme-text'}`}>
                                  {deed.title}
                                </strong>
                                <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed pt-0.5">
                                  {deed.desc}
                                </p>
                                {takenBy && (
                                  <p className="text-xs sm:text-[10px] text-status-warning uppercase font-bold pt-1">
                                    Claimed by {takenBy.name}
                                  </p>
                                )}
                              </div>
                            </label>
                          </div>

                          {/* Attaching warrior performer */}
                          {isChecked && (
                            <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between gap-2 text-xs sm:text-[11px]">
                              <span className="text-theme-muted">Achieved by:</span>
                              <select
                                value={performer}
                                onChange={(e) => handleSetDeedPerformer(deed.title, e.target.value)}
                                className="bg-theme-base border border-theme-border rounded px-2 py-1 text-xs text-theme-primary focus:outline-none focus:border-theme-primary"
                              >
                                <option value="Entire Warband">Entire Warband</option>
                                {deployedUnits.map((u) => (
                                  <option key={u.id} value={u.customName}>
                                    {u.customName} ({u.profileSnapshot.name})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Combat Dice Engine */}
          <DiceRoller />

          {/* Tactical Unit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUnits.map((unit) => {
              const isDowned = unit.status === 'Downed';
              const isOOA = unit.status === 'Out of Action';
              const isLeader = unit.profileSnapshot.category === 'Leader';

              return (
                <div 
                  key={unit.id}
                  className={`bg-theme-surface border-2 rounded-md overflow-hidden shadow-xl flex flex-col justify-between transition-all bevel-container ${
                    isOOA
                      ? 'border-theme-accent/60 opacity-60'
                      : isDowned
                      ? 'border-status-warning ring-1 ring-status-warning/40'
                      : unit.hasActedThisTurn
                      ? 'border-theme-border opacity-85'
                      : 'border-theme-primary'
                  }`}
                >
                  
                  {/* Card Header */}
                  <div className="p-3 bg-theme-base border-b border-theme-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        {isLeader && (
                          <span className="text-xs sm:text-[9px] font-mono px-1.5 py-0.2 rounded bg-theme-primary text-theme-base font-bold uppercase">
                            Leader
                          </span>
                        )}
                        <h4 className="font-gothic font-bold text-sm text-theme-text truncate">
                          {unit.customName}
                        </h4>
                      </div>
                      <span className="text-xs sm:text-[10px] text-theme-muted block">
                        Base: {unit.profileSnapshot.name}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleUnitActed(viewingWarband.id, unit.id)}
                      className={`px-2.5 py-1 rounded text-xs sm:text-[10px] font-bold uppercase transition-all flex items-center space-x-1 ${
                        unit.hasActedThisTurn
                          ? 'bg-theme-border text-theme-muted'
                          : 'bg-theme-primary text-theme-base shadow'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{unit.hasActedThisTurn ? 'Acted' : 'Activate'}</span>
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-3">
                    
                    {/* Stat Grid */}
                    <div className="grid grid-cols-4 gap-1 text-center bg-theme-base p-1.5 rounded border border-theme-border text-xs">
                      {/* Distance and movement type on two lines — see UnitCard. */}
                      <div className="min-w-0">
                        <span className="text-xs sm:text-[9px] text-theme-muted block">MOV</span>
                        <strong className="text-theme-text block truncate">
                          {unit.profileSnapshot.stats.movementInches
                            ? `${unit.profileSnapshot.stats.movementInches}"`
                            : unit.profileSnapshot.stats.movement}
                        </strong>
                        {unit.profileSnapshot.stats.movementType && (
                          <span className="text-xs sm:text-[9px] text-theme-muted block truncate uppercase">
                            {unit.profileSnapshot.stats.movementType}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">RNG</span>
                        <strong className="text-theme-text">{unit.profileSnapshot.stats.ranged}</strong>
                      </div>
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">MEL</span>
                        <strong className="text-theme-text">{unit.profileSnapshot.stats.melee}</strong>
                      </div>
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">ARM</span>
                        <strong className="text-theme-text">{unit.profileSnapshot.stats.armour}</strong>
                      </div>
                    </div>

                    {/* Interactive Wounds & Blood Marker Trackers */}
                    <div className="space-y-2.5 font-mono text-xs bg-theme-elevated/60 p-3 rounded border border-theme-border/60">
                      
                      {/* Wounds Counter */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-theme-text">
                          <Heart className="w-4 h-4 text-status-error" />
                          <span className="font-bold">WOUNDS:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateUnitWounds(viewingWarband.id, unit.id, -1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-theme-surface hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-sm select-none active:scale-95 transition-transform"
                          >
                            -
                          </button>
                          <span className="font-bold text-sm sm:text-base text-theme-text min-w-[24px] text-center">
                            {unit.currentWounds} / {unit.maxWounds}
                          </span>
                          <button
                            onClick={() => updateUnitWounds(viewingWarband.id, unit.id, 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-theme-surface hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-sm select-none active:scale-95 transition-transform"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Blood Markers (Capped at 6) */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-theme-text">
                          <Droplet className="w-4 h-4 text-status-error fill-status-error" />
                          <span className="font-bold">BLOOD MARKERS:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateUnitBloodMarkers(viewingWarband.id, unit.id, -1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-theme-surface hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-sm select-none active:scale-95 transition-transform"
                          >
                            -
                          </button>
                          <span className="font-bold text-sm sm:text-base text-status-error min-w-[24px] text-center">
                            {unit.bloodMarkers} / 6
                          </span>
                          <button
                            onClick={() => updateUnitBloodMarkers(viewingWarband.id, unit.id, 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-theme-surface hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-sm select-none active:scale-95 transition-transform"
                          >
                            +
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Status Quick Bar */}
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs sm:text-[10px] sm:text-xs">
                      {(['Active', 'Downed', 'Out of Action'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setUnitStatus(viewingWarband.id, unit.id, st)}
                          className={`py-1.5 rounded font-bold uppercase transition-all select-none active:scale-95 ${
                            unit.status === st
                              ? st === 'Active'
                                ? 'bg-status-legal text-white shadow'
                                : st === 'Downed'
                                ? 'bg-status-warning text-theme-base shadow'
                                : 'bg-status-error text-white shadow'
                              : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {/* Tactical Attack Trigger */}
                    <button
                      onClick={() => setAttackingUnit(unit)}
                      className="w-full py-2 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/50 rounded font-bold uppercase text-xs flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Tactical Attack & Injury Roll</span>
                    </button>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* SQUAD / ACTIVE DEPLOYMENT SELECTION MODAL */}
      {isSquadSelectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]">
            
            <div className="p-4 bg-theme-elevated border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-theme-primary" />
                <h3 className="font-gothic font-bold text-base text-theme-text">
                  SQUAD SELECTION & FIELD STRENGTH
                </h3>
              </div>
              <button
                onClick={() => setIsSquadSelectOpen(false)}
                className="text-theme-muted hover:text-theme-text"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between bg-theme-base p-3 rounded border border-theme-border">
                <div>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">DEPLOYED STRENGTH</span>
                  <strong className="text-sm text-theme-primary">{deployedUnits.length} Models ({deployedCost} D)</strong>
                </div>
                <button
                  onClick={handleSelectAllSquad}
                  className="px-3 py-1 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded text-xs sm:text-[10px] font-bold uppercase"
                >
                  Deploy All
                </button>
              </div>

              <div className="space-y-2">
                {viewingWarband.units.map((u) => {
                  const isDep = currentDeployedIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleDeployUnit(u.id)}
                      className={`p-3 rounded border flex items-center justify-between cursor-pointer transition-all ${
                        isDep
                          ? 'bg-theme-elevated border-theme-primary text-theme-text'
                          : 'bg-theme-base border-theme-border text-theme-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isDep}
                          onChange={() => {}}
                          className="rounded border-theme-border text-theme-primary focus:ring-0"
                        />
                        <div>
                          <strong className="block text-xs">{u.customName}</strong>
                          <span className="text-xs sm:text-[10px] text-theme-muted">{u.profileSnapshot.name}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-theme-primary">{u.totalCost} D</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-theme-base border-t border-theme-border flex justify-end">
              <button
                onClick={() => setIsSquadSelectOpen(false)}
                className="px-5 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs"
              >
                Confirm Squad
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TACTICAL ATTACK & INJURY CALCULATOR MODAL */}
      {attackingUnit && (
        <AttackCalculatorModal
          attacker={attackingUnit}
          weather={activeWeather}
          onClose={() => setAttackingUnit(null)}
        />
      )}

      {/* QUICK RULES SEARCH MODAL */}
      {isQuickSearchOpen && (
        <QuickSearchModal
          onClose={() => setIsQuickSearchOpen(false)}
        />
      )}

      {/* CONFIRM ABORT MODAL */}
      <ConfirmModal
        isOpen={isAbortConfirmOpen}
        title="ABORT MATCH?"
        message="Are you sure you want to cancel and exit this match? All live wound and blood marker adjustments will be reset."
        confirmLabel="Abort Match"
        onConfirm={handleAbortMatch}
        onCancel={() => setIsAbortConfirmOpen(false)}
      />

      {/* POST-BATTLE CAMPAIGN WIZARD */}
      {isPostBattleOpen && (
        <PostBattleWizardModal
          onClose={() => setIsPostBattleOpen(false)}
        />
      )}

      {/* ALL OUT WAR CARD & ALLIANCE CONSOLE */}
      {isCardConsoleOpen && isAllOutWarScenario && (
        <AllOutWarCardConsole
          warbands={warbands.filter((w) => matchWarbandIds.includes(w.id))}
          activeWarbandId={viewingWarband.id}
          round={playTurn}
          warbandScores={warbandScores}
          onAdjustVp={handleAdjustVpForWarband}
          onClose={() => setIsCardConsoleOpen(false)}
        />
      )}

      {/* FULLSCREEN SCENARIO MAP LIGHTBOX MODAL (WORKS IN BOTH LOBBY & COMBAT) */}
      {isMapLightboxOpen && selectedScenario?.mapImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-4xl max-h-[95dvh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
            {/* Modal Header */}
            <div className="p-4 bg-theme-base border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-theme-primary" />
                <div>
                  <h3 className="font-gothic font-bold text-base sm:text-lg text-theme-text">
                    OFFICIAL DEPLOYMENT DIAGRAM: {selectedScenario.name}
                  </h3>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">
                    {selectedScenario.tagline}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMapLightboxOpen(false)}
                className="px-3 py-1 bg-theme-elevated hover:bg-theme-border text-theme-text rounded font-bold uppercase text-xs border border-theme-border"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body: Large Map Image */}
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-theme-base/80">
              <img
                src={selectedScenario.mapImage}
                alt={`${selectedScenario.name} Official Tactical Map`}
                className="max-w-full max-h-[75dvh] object-contain rounded shadow-2xl border border-theme-border"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-theme-surface border-t border-theme-border flex items-center justify-between text-xs text-theme-muted">
              <span>Scenario {selectedScenario.number || ''}: {selectedScenario.tagline || ''}</span>
              <button
                onClick={() => setIsMapLightboxOpen(false)}
                className="px-4 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
