'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlayingCard, 
  CardSuit, 
  CardRank, 
  PlayerCardState 
} from '../../types/allOutWar';
import { 
  generateStandard52Deck, 
  shuffleDeck, 
  compareInitiativeCards,
  BETRAYAL_TABLE
} from '../../data/allOutWarData';
import { Warband } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  Layers, 
  Sparkles, 
  Crown, 
  Flame, 
  Clock, 
  Users, 
  Play, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Gift, 
  ShieldAlert, 
  Swords, 
  ChevronRight,
  Send,
  Zap,
  DollarSign,
  ArrowRight
} from 'lucide-react';

interface AllOutWarCardConsoleProps {
  warbands: Warband[];
  activeWarbandId: string;
  round: number;
  warbandScores: Record<string, { vp: number; completedDeeds: Record<string, string> }>;
  onAdjustVp: (warbandId: string, delta: number) => void;
  onClose: () => void;
}

export const AllOutWarCardConsole: React.FC<AllOutWarCardConsoleProps> = ({
  warbands,
  activeWarbandId,
  round,
  warbandScores,
  onAdjustVp,
  onClose
}) => {
  // 52-Card Deck State
  const [deck, setDeck] = useState<PlayingCard[]>(() => generateStandard52Deck());
  const [discardPile, setDiscardPile] = useState<PlayingCard[]>([]);

  // Player Cards & Hands
  const [players, setPlayers] = useState<PlayerCardState[]>(() => {
    const aces: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    return warbands.map((wb, idx) => ({
      warbandId: wb.id,
      warbandName: wb.name,
      playerName: `Commander ${idx + 1}`,
      assignedAceSuit: aces[idx % 4],
      initiativeCard: null,
      betrayalHand: [],
      secretAllyWarbandId: null,
      revealedAllyWarbandId: null,
      isJointAllianceWith: null,
      vpBribesSent: 0,
      vpBribesReceived: 0
    }));
  });

  const [activeTab, setActiveTab] = useState<'initiative' | 'betrayal' | 'alliance' | 'bribes'>('initiative');
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(0);
  const [isHandRevealed, setIsHandRevealed] = useState<boolean>(false);

  // 3-Minute Alliance Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(180);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [alliancesRevealed, setAlliancesRevealed] = useState<boolean>(false);

  // Resolution Alert Banner
  const [cardPlayBanner, setCardPlayBanner] = useState<{ title: string; desc: string; type: 'coup' | 'ruse' } | null>(null);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      soundEffects.playTrenchWhistle();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Deal 1 Initiative Card to each player
  const handleDealInitiative = () => {
    soundEffects.playDiceRoll();

    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];

    if (currentDeck.length < players.length) {
      currentDeck = shuffleDeck([...currentDeck, ...currentDiscard]);
      currentDiscard = [];
    }

    const updatedPlayers = players.map((p) => {
      const drawnCard = currentDeck.pop() || null;
      if (p.initiativeCard) {
        currentDiscard.push(p.initiativeCard);
      }
      return {
        ...p,
        initiativeCard: drawnCard
      };
    });

    setDeck(currentDeck);
    setDiscardPile(currentDiscard);
    setPlayers(updatedPlayers);
  };

  // Deal Betrayal Cards (1 to each unallied player per round)
  const handleDealBetrayalCards = () => {
    soundEffects.playDiceRoll();

    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];

    const updatedPlayers = players.map((p) => {
      if (currentDeck.length < 1) {
        currentDeck = shuffleDeck([...currentDeck, ...currentDiscard]);
        currentDiscard = [];
      }
      const drawnCard = currentDeck.pop();
      return {
        ...p,
        betrayalHand: drawnCard ? [...p.betrayalHand, drawnCard] : p.betrayalHand
      };
    });

    setDeck(currentDeck);
    setDiscardPile(currentDiscard);
    setPlayers(updatedPlayers);
  };

  // Play a Betrayal Card (Coup if matches Ace suit, Ruse otherwise)
  const handlePlayCard = (playerIdx: number, cardId: string) => {
    const player = players[playerIdx];
    const card = player.betrayalHand.find((c) => c.id === cardId);
    if (!card) return;

    const effectObj = BETRAYAL_TABLE.find((e) => e.rank === card.rank);
    const isCoup = card.suit === player.assignedAceSuit;

    const title = isCoup ? (effectObj?.coupTitle || 'Coup') : (effectObj?.ruseTitle || 'Ruse');
    const desc = isCoup ? (effectObj?.coupEffect || '') : (effectObj?.ruseEffect || '');

    setCardPlayBanner({
      title: `${player.warbandName} played ${isCoup ? 'COUP' : 'RUSE'}: ${title} (${card.label})`,
      desc,
      type: isCoup ? 'coup' : 'ruse'
    });

    soundEffects.playDiceRoll();

    // Remove from player hand
    setPlayers((prev) =>
      prev.map((p, idx) => {
        if (idx !== playerIdx) return p;
        return {
          ...p,
          betrayalHand: p.betrayalHand.filter((c) => c.id !== cardId)
        };
      })
    );
  };

  // Reveal Alliances and calculate Joint Alliances (+1 VP)
  const handleRevealAlliances = () => {
    soundEffects.playDiceRoll();
    setAlliancesRevealed(true);

    // Calculate Joint Alliances
    const updated = players.map((p) => {
      const chosenId = p.secretAllyWarbandId;
      if (!chosenId) return { ...p, revealedAllyWarbandId: null, isJointAllianceWith: null };

      const chosenPlayer = players.find((other) => other.warbandId === chosenId);
      const isJoint = chosenPlayer?.secretAllyWarbandId === p.warbandId;

      if (isJoint) {
        onAdjustVp(p.warbandId, 1); // +1 VP for joint alliance
      }

      return {
        ...p,
        revealedAllyWarbandId: chosenId,
        isJointAllianceWith: isJoint ? chosenId : null
      };
    });

    setPlayers(updated);
  };

  // Sorted players by Initiative for the round
  const sortedByInitiative = [...players].sort((a, b) => {
    if (!a.initiativeCard && !b.initiativeCard) return 0;
    if (!a.initiativeCard) return 1;
    if (!b.initiativeCard) return -1;
    return compareInitiativeCards(a.initiativeCard, b.initiativeCard);
  });

  const selectedPlayer = players[selectedPlayerIdx] || players[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono text-xs">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-5xl max-h-[92dvh] rounded-md shadow-2xl flex flex-col overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-border bg-theme-base">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-theme-primary/20 border border-theme-primary flex items-center justify-center">
              <Layers className="w-4 h-4 text-theme-primary" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-gothic font-bold text-base sm:text-lg text-theme-text tracking-wide">
                  ALL OUT WAR: MULTIPLAYER CARD & ALLIANCE ENGINE
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-theme-accent text-white font-bold uppercase">
                  52-Card System
                </span>
              </div>
              <p className="text-[11px] text-theme-muted">
                Initiative card draws, secret betrayal hands, 3-minute alliance negotiations, and VP bribes.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-theme-muted hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Clean 4-Item Grid, No Horizontal Scroll */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2.5 border-b border-theme-border bg-theme-elevated text-xs">
          {[
            { id: 'initiative', label: '1. Initiative', icon: Swords },
            { id: 'betrayal', label: '2. Betrayal Cards', icon: Sparkles },
            { id: 'alliance', label: '3. Alliances (3m)', icon: Users },
            { id: 'bribes', label: '4. VP Bribes', icon: DollarSign }
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 px-2 rounded font-bold uppercase flex items-center justify-center space-x-1.5 transition-all text-center ${
                  isSel
                    ? 'bg-theme-primary text-black shadow'
                    : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Resolution Banner */}
        {cardPlayBanner && (
          <div className={`p-3.5 border-b flex items-start justify-between animate-fade-in ${
            cardPlayBanner.type === 'coup' 
              ? 'bg-theme-accent/30 border-theme-accent text-theme-text' 
              : 'bg-theme-primary/20 border-theme-primary text-theme-text'
          }`}>
            <div className="space-y-0.5">
              <span className="font-gothic font-bold text-sm text-theme-primary block">
                ⚡ {cardPlayBanner.title}
              </span>
              <p className="text-xs text-theme-text leading-relaxed">{cardPlayBanner.desc}</p>
            </div>
            <button onClick={() => setCardPlayBanner(null)} className="text-xs text-theme-muted hover:text-white ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* TAB 1: INITIATIVE CARDS */}
          {activeTab === 'initiative' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-base p-4 rounded border border-theme-border">
                <div>
                  <h3 className="font-gothic font-bold text-base text-theme-primary">
                    ROUND {round} MULTIPLAYER INITIATIVE ORDER
                  </h3>
                  <p className="text-xs text-theme-muted">
                    Compare card ranks (A &gt; K &gt; Q &gt; J &gt; 10...2) and suits (♠ &gt; ♥ &gt; ♦ &gt; ♣) to determine activation sequence.
                  </p>
                </div>

                <button
                  onClick={handleDealInitiative}
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded flex items-center space-x-1.5 shadow flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Deal Round {round} Cards</span>
                </button>
              </div>

              {/* Sorted Initiative Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {sortedByInitiative.map((p, idx) => {
                  const card = p.initiativeCard;
                  return (
                    <div
                      key={p.warbandId}
                      className="p-4 bg-theme-base border-2 border-theme-primary rounded-md space-y-3 relative bevel-container"
                    >
                      <div className="flex items-center justify-between border-b border-theme-border pb-2">
                        <span className="text-[10px] font-bold text-theme-primary uppercase">
                          ACTIVATION #{idx + 1}
                        </span>
                        <span className="text-[10px] text-theme-muted">
                          {warbandScores[p.warbandId]?.vp || 0} VP
                        </span>
                      </div>

                      <div>
                        <strong className="font-gothic text-sm text-theme-text block">{p.warbandName}</strong>
                        <span className="text-[10px] text-theme-muted block">
                          House Suit: <strong className="text-theme-primary uppercase">{p.assignedAceSuit}</strong>
                        </span>
                      </div>

                      {card ? (
                        <div className="p-3 bg-theme-surface rounded border border-theme-border flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-theme-muted block">DRAWN CARD:</span>
                            <span className={`font-bold text-base ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-status-error' : 'text-theme-text'}`}>
                              {card.symbol} {card.label}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-theme-elevated text-theme-primary font-bold">
                            Rank {card.value}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-theme-surface rounded border border-dashed border-theme-border text-center text-theme-muted italic text-[11px]">
                          No card dealt. Click &quot;Deal Round Cards&quot; above.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Progression Bar */}
              <div className="pt-3 border-t border-theme-border flex justify-end">
                <button
                  onClick={() => setActiveTab('betrayal')}
                  className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded flex items-center space-x-2 shadow-lg"
                >
                  <span>Proceed to Step 2: Betrayal Cards</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BETRAYAL CARDS */}
          {activeTab === 'betrayal' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-base p-4 rounded border border-theme-border">
                <div>
                  <h3 className="font-gothic font-bold text-base text-theme-primary">
                    SECRET BETRAYAL HANDS (COUPS & RUSES)
                  </h3>
                  <p className="text-xs text-theme-muted">
                    Play as Coup if the card matches your assigned House Ace Suit. Play as Ruse if it matches any other suit.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsHandRevealed(!isHandRevealed)}
                    className="px-3 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-bold uppercase flex items-center space-x-1.5"
                  >
                    {isHandRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isHandRevealed ? 'Hide Hand' : 'View Hand'}</span>
                  </button>

                  <button
                    onClick={handleDealBetrayalCards}
                    className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded flex items-center space-x-1.5 shadow"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Draw Turn Cards</span>
                  </button>
                </div>
              </div>

              {/* Player Selector Bar */}
              <div className="flex space-x-2 border-b border-theme-border pb-3 overflow-x-auto">
                {players.map((p, idx) => (
                  <button
                    key={p.warbandId}
                    onClick={() => {
                      setSelectedPlayerIdx(idx);
                      setIsHandRevealed(false);
                    }}
                    className={`px-3 py-1.5 rounded font-bold uppercase flex items-center space-x-2 ${
                      selectedPlayerIdx === idx
                        ? 'bg-theme-primary text-black'
                        : 'bg-theme-base text-theme-muted border border-theme-border'
                    }`}
                  >
                    <span>{p.warbandName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-white">
                      {p.betrayalHand.length} cards
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected Player Hand */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-theme-elevated p-3 rounded border border-theme-border">
                  <div>
                    <span className="text-theme-muted block text-[10px] uppercase">SELECTED COMMANDER</span>
                    <strong className="text-theme-text font-gothic text-sm">{selectedPlayer.warbandName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-theme-muted block text-[10px] uppercase">ASSIGNED HOUSE SUIT</span>
                    <strong className="text-theme-primary text-sm uppercase">
                      {selectedPlayer.assignedAceSuit} Ace
                    </strong>
                  </div>
                </div>

                {isHandRevealed ? (
                  selectedPlayer.betrayalHand.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedPlayer.betrayalHand.map((card) => {
                        const effect = BETRAYAL_TABLE.find((e) => e.rank === card.rank);
                        const isCoup = card.suit === selectedPlayer.assignedAceSuit;

                        return (
                          <div
                            key={card.id}
                            className={`p-4 rounded border-2 space-y-3 flex flex-col justify-between ${
                              isCoup
                                ? 'bg-theme-accent/20 border-theme-accent ring-1 ring-theme-accent/50'
                                : 'bg-theme-base border-theme-border'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between border-b border-theme-border pb-2">
                                <span className={`font-bold text-sm ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-status-error' : 'text-theme-text'}`}>
                                  {card.symbol} {card.label}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                  isCoup ? 'bg-theme-accent text-white' : 'bg-theme-elevated text-theme-primary'
                                }`}>
                                  {isCoup ? 'COUP ACTION' : 'RUSE ACTION'}
                                </span>
                              </div>

                              <div>
                                <strong className="text-theme-primary block font-gothic text-sm">
                                  {isCoup ? effect?.coupTitle : effect?.ruseTitle}
                                </strong>
                                <span className="text-[10px] text-theme-muted italic block pt-0.5">
                                  {isCoup ? effect?.coupTiming : effect?.ruseTiming}
                                </span>
                                <p className="text-theme-text text-[11px] leading-relaxed pt-1">
                                  {isCoup ? effect?.coupEffect : effect?.ruseEffect}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handlePlayCard(selectedPlayerIdx, card.id)}
                              className={`w-full py-1.5 font-bold uppercase rounded text-xs transition-colors flex items-center justify-center space-x-1 ${
                                isCoup
                                  ? 'bg-theme-accent hover:bg-[#A30000] text-white'
                                  : 'bg-theme-primary hover:bg-theme-primary-hover text-black'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Play {isCoup ? 'Coup' : 'Ruse'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-theme-muted bg-theme-base rounded border border-theme-border">
                      No Betrayal Cards currently held. Click &quot;Draw Turn Cards&quot; to draw.
                    </div>
                  )
                ) : (
                  <div className="p-8 text-center bg-theme-base rounded border border-dashed border-theme-border space-y-2">
                    <EyeOff className="w-8 h-8 text-theme-muted mx-auto" />
                    <span className="text-xs text-theme-text font-bold block">Hand Hidden for Privacy</span>
                    <button
                      onClick={() => setIsHandRevealed(true)}
                      className="px-4 py-1.5 bg-theme-primary text-black font-bold uppercase rounded text-xs"
                    >
                      Reveal Hand ({selectedPlayer.betrayalHand.length} Cards)
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Progression Bar */}
              <div className="pt-3 border-t border-theme-border flex justify-end">
                <button
                  onClick={() => setActiveTab('alliance')}
                  className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded flex items-center space-x-2 shadow-lg"
                >
                  <span>Proceed to Step 3: Alliance Period</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ALLIANCE PERIOD */}
          {activeTab === 'alliance' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-base p-4 rounded border border-theme-border">
                <div>
                  <h3 className="font-gothic font-bold text-base text-theme-primary">
                    THE 3-MINUTE ALLIANCE PERIOD
                  </h3>
                  <p className="text-xs text-theme-muted">
                    Negotiate secretly. Joint Alliances award +1 VP per turn and prevent friendly attacks. Double-dealing is allowed!
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-theme-elevated px-3 py-1.5 rounded border border-theme-border">
                    <Clock className="w-4 h-4 text-theme-primary" />
                    <span className="font-bold text-sm text-theme-text">
                      {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-3 py-1.5 bg-theme-primary text-black font-bold uppercase rounded"
                  >
                    {isTimerRunning ? 'Pause Timer' : 'Start 3-Min Timer'}
                  </button>

                  <button
                    onClick={() => setTimerSeconds(180)}
                    className="p-1.5 bg-theme-elevated text-theme-muted hover:text-white rounded border border-theme-border"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Secret Choice Selector per Player */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {players.map((p, idx) => (
                  <div key={p.warbandId} className="p-4 bg-theme-base border border-theme-border rounded space-y-3">
                    <strong className="font-gothic text-sm text-theme-text block">{p.warbandName}</strong>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-theme-muted block">Secret Chosen Ally:</label>
                      <select
                        value={p.secretAllyWarbandId || ''}
                        onChange={(e) => {
                          const targetId = e.target.value || null;
                          setPlayers((prev) =>
                            prev.map((pl, i) => (i === idx ? { ...pl, secretAllyWarbandId: targetId } : pl))
                          );
                        }}
                        className="w-full bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-primary focus:outline-none"
                      >
                        <option value="">-- No Alliance / Stand Alone --</option>
                        {players
                          .filter((other) => other.warbandId !== p.warbandId)
                          .map((other) => (
                            <option key={other.warbandId} value={other.warbandId}>
                              {other.warbandName}
                            </option>
                          ))}
                      </select>
                    </div>

                    {alliancesRevealed && (
                      <div className="pt-2 border-t border-theme-border text-[10px]">
                        <span className="text-theme-muted block">Alliance Status:</span>
                        {p.isJointAllianceWith ? (
                          <span className="text-status-legal font-bold block">
                            ✅ Joint Alliance (+1 VP)
                          </span>
                        ) : p.revealedAllyWarbandId ? (
                          <span className="text-status-warning font-bold block">
                            ⚠️ One-Way Alliance (Vulnerable)
                          </span>
                        ) : (
                          <span className="text-theme-muted italic block">Unallied (+1 Betrayal Card)</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleRevealAlliances}
                  className="px-5 py-2.5 bg-theme-accent hover:bg-[#A30000] text-white font-bold uppercase rounded shadow-lg flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Reveal Alliances & Calculate Joint VPs</span>
                </button>

                <button
                  onClick={() => setActiveTab('bribes')}
                  className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded flex items-center space-x-2 shadow-lg"
                >
                  <span>Proceed to Step 4: VP Bribes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: VP BRIBES & TRANSFERS */}
          {activeTab === 'bribes' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-theme-base p-4 rounded border border-theme-border space-y-2">
                <h3 className="font-gothic font-bold text-base text-theme-primary">
                  VICTORY POINT BRIBES & TRANSFERS
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  In All Out War, Victory Points can be traded freely as bribes to secure temporary ceasefires, buy attacks, or forge alliances. Transferred points are non-refundable!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((fromPlayer) => {
                  const fromScore = warbandScores[fromPlayer.warbandId]?.vp || 0;
                  return (
                    <div key={fromPlayer.warbandId} className="p-4 bg-theme-base border border-theme-border rounded space-y-3">
                      <div className="flex items-center justify-between border-b border-theme-border pb-2">
                        <strong className="font-gothic text-sm text-theme-text">{fromPlayer.warbandName}</strong>
                        <span className="text-xs font-bold text-theme-primary">{fromScore} VP Available</span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-theme-muted block uppercase">Send 1 VP Bribe to:</span>
                        <div className="flex flex-wrap gap-2">
                          {players
                            .filter((toPlayer) => toPlayer.warbandId !== fromPlayer.warbandId)
                            .map((toPlayer) => (
                              <button
                                key={toPlayer.warbandId}
                                disabled={fromScore < 1}
                                onClick={() => {
                                  onAdjustVp(fromPlayer.warbandId, -1);
                                  onAdjustVp(toPlayer.warbandId, 1);
                                  soundEffects.playDiceRoll();
                                }}
                                className="px-3 py-1.5 bg-theme-elevated hover:bg-theme-border disabled:opacity-40 text-theme-text rounded border border-theme-border text-xs font-bold"
                              >
                                💸 Give 1 VP to {toPlayer.warbandName}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final Proceed to Turn Action */}
              <div className="pt-4 border-t border-theme-border flex items-center justify-between">
                <span className="text-[11px] text-theme-muted">
                  Pre-round negotiations complete.
                </span>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded text-sm shadow-xl shadow-theme-primary/30 flex items-center space-x-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>⚔️ Enter Round Turn Combat</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
