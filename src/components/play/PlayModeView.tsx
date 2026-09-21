'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { LiveMirrorPanel } from './LiveMirrorPanel';
import { useScenarios, sectionOf } from '../../rules/useScenarios';
import { useDataset } from '../../rules/useDataset';
import { DiceRoller } from './DiceRoller';
import { PostBattleWizardModal } from '../campaign/PostBattleWizardModal';
import { matchHandover, type MatchHandover } from '@/rules/matchHandover';
import { unresolvedSides, type BattleRecord, type BattleSide } from '@/types/battle';
import { AttackCalculatorModal } from './AttackCalculatorModal';
import { ModelReferenceSheet } from './ModelReferenceSheet';
import { QuickSearchModal } from './QuickSearchModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AllOutWarCardConsole } from './AllOutWarCardConsole';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { RulesProse } from '../codex/RulesProse';
import { ViewMasthead } from '../ui/ViewMasthead';

/**
 * The books a scenario can come from, in the order the picker groups them.
 *
 * `source` is empty for the core rulebook — its entries carry no source field
 * because they are the baseline. The order is publication order, so a player
 * scrolling the list meets the twelve they are most likely to want first.
 */
const SCENARIO_BOOKS: { source: string; label: string }[] = [
  { source: '', label: 'Trench Crusade Rulebook' },
  { source: 'carcass-front', label: 'Carcass Front' },
  { source: 'all-out-war', label: 'All Out War' },
];
import { parseDeeds, rosterDeeds } from './deeds';
import { parseUnforeseenEvents } from '../../rules/unforeseen';
import { rollWeatherForAll, whoChooses, type WeatherRoll } from '../../rules/weather';
import { campaignVictoryPoints } from '../../rules/campaign';
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
  Sliders,
  Play,
  CloudRain,
  Lock,
  History,
  X,
  TrendingUp, BookOpen } from 'lucide-react';
import { useOverlay } from '../ui/useOverlay';
import { unitGlory, formatUnitCost } from '@/rules/savedGlory';
import { matchSides, isControllable, firstControllableId } from '@/rules/matchSides';
import { isRestorable, savedAgo, MATCH_VERSION, type SavedMatch, type SideScore } from '@/rules/matchState';
import { battleFromMatch } from '@/rules/battleFromMatch';
import { fieldable } from '@/rules/recreation';
import {
  COALITIONS, COALITION_NAME, coalitionScore, hasCoalitions, leader,
  pruneCoalitions, suggestCoalitions, type CoalitionMap,
} from '@/rules/coalitions';
import { storage } from '@/services/storage';
import { pushBattle } from '@/services/battleSync';
import { OpponentPicker } from './OpponentPicker';

export const PlayModeView: React.FC = () => {
  const { 
    warbands,
    opponents,
    factions,
    getActiveWarband, setActiveWarbandId,
    playTurn, 
    incrementTurn, 
    setPlayTurn,
    resetMatchState,
    updateUnitWounds, 
    updateUnitBloodMarkers, 
    updateUnitBlessingMarkers, 
    markers, 
    setUnitStatus, 
    toggleUnitActed,
    isPostBattleOpen,
    setIsPostBattleOpen,
    campaign,
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

  /*
    Every side in the match, whether or not this app holds its roster.

    A match id may name one of the player's warbands or a placeholder opponent
    (`rules/matchSides.ts`). Resolved once here so the twenty-odd read sites
    below ask for a side rather than each learning about two lists.
  */
  const side = useMemo(
    () => matchSides(warbands, opponents, (id) => factions.find((f) => f.id === id)?.name),
    [warbands, opponents, factions],
  );

  /*
    The side being CONTROLLED, which is never a placeholder.

    The activation list, wounds and markers all read `units`, and a placeholder
    has none — so viewing one is a screen of nothing with no way back. The
    switcher skips them and the viewed side falls through to the first the
    player can actually play.
  */
  const rawViewingId = matchWarbandIds[activePlayerIndex] || primaryWarband?.id || '';
  const currentViewingWarbandId = isControllable(side(rawViewingId))
    ? rawViewingId
    : (firstControllableId(matchWarbandIds, side) ?? primaryWarband?.id ?? '');
  const viewingWarband = warbands.find((w) => w.id === currentViewingWarbandId) || primaryWarband;

  // Scenario & Scoring State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('claim-no-mans-land');
  
  /*
    Multi-player progressive scoring, keyed by warband or opponent id.

    `SideScore` is imported rather than restated. The shape was written out
    again here, and it drifted: `matchState` moved a Deed's claim from a bare
    string to `DeedMark` and this copy stayed a string, which typechecks on
    both sides of the save and loses the model in between. `matchState`'s own
    header says the same thing about the weather roll.
  */
  const [warbandScores, setWarbandScores] = useState<Record<string, SideScore>>({});
  
  // Squad / Sub-list Deployment Filter
  /* Which side fights for which coalition. Empty in a free-for-all, which is
     most matches — so nothing below assumes a match HAS teams. */
  const [coalitions, setCoalitions] = useState<CoalitionMap>({});
  const [deployedUnitIds, setDeployedUnitIds] = useState<Record<string, string[]>>({});
  /*
    The battle whose post-battles are being worked through.

    A game has as many post-battles as it has rosters, and only the active
    warband's was ever opened — so a second side got no Trauma, no Experience
    and no Exploration (FD-09b / RR-27). Held by id rather than by value
    because the record is re-read from storage between wizards: committing one
    writes that side's `campaignMatchId` onto it, and the next offer has to
    see that.
  */
  const [battleForPostBattle, setBattleForPostBattle] = useState<string | null>(null);
  /*
    What the wizard opens on.

    The battle record is built one line before the wizard opens and was then
    thrown away: the wizard defaulted its scenario to the first in the list and
    its result to Victory whatever the score (RR-22). Held here so the two are
    the same game.
  */
  const [handover, setHandover] = useState<MatchHandover | null>(null);
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
  /*
    The model whose full card is open.

    Reported after a live game: everything needed to play a model — its
    keywords, abilities and earned skills — was only on the roster page, so
    the player kept leaving the match to read it. Play Mode rendered no
    keywords at all, which is also why tapping one never opened the rule:
    `KeywordPopover` was mounted the whole time with nothing asking it.
  */
  const [referenceUnit, setReferenceUnit] = useState<ActiveUnit | null>(null);
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

  /*
    Who picks the Weather Event: "the player with the fewest Campaign Victory
    Points decides… If all players have the same number… simply roll-off."

    A seat with no campaign record — a placeholder, a guest, a one-off game —
    contributes `undefined`, which is what `whoChooses` reads as "not scored"
    rather than as nought. Two seats must be scored for the rule to apply at
    all; below that it reports a roll-off, which is the book's own fallback.
  */
  const weatherChooser = useMemo(() => {
    const seats = matchWarbandIds.map((wbId) => {
      const member = campaign?.members?.find((m) => m.warbandId === wbId);
      return campaignVictoryPoints(playDataset, member) ?? undefined;
    });
    const { seats: picked, rollOff } = whoChooses(seats);
    return {
      rollOff,
      names: picked
        .map((i) => side(matchWarbandIds[i])?.name)
        .filter((n): n is string => Boolean(n)),
    };
  }, [matchWarbandIds, campaign, playDataset, side]);

  const weatherTable = playDataset?.weather ?? null;

  /*
    Above the `!viewingWarband` early return, because hooks are.

    `selectedScenario` comes up here with them: it is read from `scenarios` and
    `selectedScenarioId` and does not depend on a warband being selected, so
    there is nothing to compute below the return that these need.
  */
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  /*
    Scroll lock, Escape and a focus trap for the squad picker and the map
    lightbox. `useOverlay` rather than a move to `Sheet`: the behaviour is what
    was missing and it does not have to wait for the JSX surgery.

    The lightbox condition repeats the render guard rather than reading
    `isMapLightboxOpen` alone. A scroll lock held for an overlay that is not on
    screen — a scenario with no map — is a page that cannot be scrolled and
    nothing visible to explain why.
  */
  const squadRef = useOverlay(isSquadSelectOpen, () => setIsSquadSelectOpen(false));
  const mapRef = useOverlay(
    Boolean(isMapLightboxOpen && selectedScenario?.mapImage),
    () => setIsMapLightboxOpen(false),
  );

  /*
    Restore a match in progress, then keep saving it.

    None of this state reached `localStorage` before, so a reload — or a phone
    evicting a backgrounded tab, which they do routinely — lost every Victory
    Point, every claimed Deed and the list of who was in the match. Over a
    three-hour game that is the whole scorecard.

    Two guards stop the save from destroying what the restore is about to
    read, and only one of them currently does the work.

    The save effect runs on mount too, when this state is still its empty
    initial value. What actually prevents the clobber today is the
    `matchWarbandIds.length === 0` check below: on that first pass the list IS
    empty, so nothing is written. Sabotaging `restored` alone does not break
    the test, and saying otherwise here would be a comment claiming a guard it
    does not earn.

    `restored` is kept as the second lock, because the first one holds only
    while the restore effect is declared ABOVE the seeding effect that fills
    that list. Reorder them and the empty check stops protecting anything;
    this one does not care about order.
  */
  const restored = useRef(false);
  const [resumedFrom, setResumedFrom] = useState<string | null>(null);

  useEffect(() => {
    const saved = storage.getMatch();
    if (isRestorable(saved)) {
      setIsMatchActive(saved.isMatchActive);
      setMatchMode(saved.matchMode);
      setMatchWarbandIds(saved.matchWarbandIds);
      setActivePlayerIndex(saved.activePlayerIndex);
      setSelectedScenarioId(saved.selectedScenarioId);
      setWarbandScores(saved.scores);
      setDeployedUnitIds(saved.deployedUnitIds);
      setEnvironmentalHazard(saved.environmentalHazard);
      setWeatherRolls(saved.weatherRolls);
      setActiveWeather(saved.activeWeather);
      setCoalitions(saved.coalitions);
      setPlayTurn(saved.playTurn);
      /* Said out loud rather than resumed silently: a match from last week
         coming back looking like tonight's is its own kind of wrong. */
      if (saved.isMatchActive) setResumedFrom(savedAgo(saved));
    }
    restored.current = true;
    // Once, on mount. Re-running would fight the player for their own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    /* An empty match is not worth a write, and writing one is how a saved
       match gets lost — see the guard above. */
    if (matchWarbandIds.length === 0) return;
    const match: SavedMatch = {
      version: MATCH_VERSION,
      savedAt: new Date().toISOString(),
      isMatchActive, matchMode, matchWarbandIds, activePlayerIndex,
      selectedScenarioId, playTurn,
      scores: warbandScores,
      deployedUnitIds,
      environmentalHazard,
      weatherRolls, activeWeather,
      coalitions,
    };
    storage.saveMatch(match);
  }, [
    isMatchActive, matchMode, matchWarbandIds, activePlayerIndex, selectedScenarioId,
    playTurn, warbandScores, deployedUnitIds, environmentalHazard, weatherRolls, activeWeather,
    coalitions,
  ]);

  /*
    Put the player's own warband in the match once the store has it.

    `matchWarbandIds` is seeded by `useState`, which runs on the FIRST render —
    and the store is deliberately empty then, because `hydrateStore()` reads
    `localStorage` from a mount effect to avoid a hydration mismatch (see
    `store/init.ts`). So the seed was always `[]`, and Play Mode opened saying
    "0 Warbands Linked" with a roster sitting in storage.

    Only ever fills an EMPTY match: removing a side cannot drop below one, so
    this can never fight the player for control of the list.
  */
  useEffect(() => {
    if (matchWarbandIds.length === 0 && primaryWarband) {
      setMatchWarbandIds([primaryWarband.id]);
    }
  }, [matchWarbandIds.length, primaryWarband]);

  if (!viewingWarband) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Skull className="w-12 h-12 text-theme-primary mx-auto opacity-75" />
        <h3 className="font-gothic font-bold text-lg text-theme-text">NO WARBAND SELECTED</h3>
        <p className="text-xs font-mono text-theme-muted">Select or build a warband in the roster builder to enter Play Mode.</p>
      </div>
    );
  }

  /*
    Deployed units for the current warband.

    The default is the Force, not the Roster: a model the player benched to
    stay under the Threshold Value or Field Strength (p.97) "will have to sit
    the game out", so putting it on the table by default undoes the choice
    they made in the builder. An explicit selection still wins over both.
  */
  /*
    A model killed in a post-battle sequence and held on the roster awaiting
    Re-creation cannot be put on the table at all — it is dead until it is paid
    for (`takesTheField`). It is taken out before the bench is read, and before
    a stored selection is resolved, so a Force recorded while it was alive does
    not field it afterwards.
  */
  const fieldableUnits = fieldable(viewingWarband.units);
  const currentDeployedIds = deployedUnitIds[viewingWarband.id]
    || fieldableUnits.filter((u) => !u.benched).map((u) => u.id);
  const deployedUnits = fieldableUnits.filter((u) => currentDeployedIds.includes(u.id));
  const deployedCost = deployedUnits.reduce((sum, u) => sum + u.totalCost, 0);

  // Statistics

  const filteredUnits = deployedUnits.filter((u) => {
    if (filterStatus === 'All') return true;
    return u.status === filterStatus;
  });


  /**
   * Whether the card, betrayal and alliance console applies.
   *
   * `useScenarios()` already labels every scenario with the book it came from,
   * so this asks it. It used to guess: four patterns over the name, the id, the
   * tagline and `number > 12`. Each is a near-miss waiting to happen — a
   * scenario whose tagline mentions all out war, or a third supplement whose
   * thirteenth entry has nothing to do with the pack — and the app has already
   * deleted one rules engine built out of name patterns.
   */
  const isAllOutWarScenario = selectedScenario?.source === 'all-out-war';

  // Score for current warband
  const currentScoreObj = warbandScores[viewingWarband.id] || { vp: 0, completedDeeds: {}, turnScores: {} };

  const handleStartCombat = () => {
    soundEffects.playDiceRoll();
    setIsMatchActive(true);
  };

  /*
    Keep the battle, then hand over to the post-battle wizard.

    Everything the tracker collected — every side's Victory Points, which turn
    each was scored on, who claimed each Glorious Deed, the weather, who was
    even on the table — was discarded here. The campaign's `MatchRecord` kept
    a date, a scenario, a narrative and exactly ONE participant: the player's
    own warband. Three of four sides in tonight's game would have left no
    trace.

    Written before the wizard opens rather than inside it, because the wizard
    is campaign-only: a one-off game recorded nothing at all before, and the
    battle happened either way.
  */
  /**
   * The handover for one side of a battle.
   *
   * `deployedUnitIds` comes off the RECORD where it has it, and only falls
   * back to the live tracker for the side this device was playing: a
   * post-battle for another warband cannot read who that player deployed out
   * of this device's match state.
   */
  const handoverFor = (battle: BattleRecord, sideId: string): MatchHandover | null => {
    const wb = warbands.find((w) => w.id === sideId);
    const recorded = battle.sides.find((sd) => sd.id === sideId)?.deployedUnitIds;
    return matchHandover(battle, {
      ownSideId: sideId,
      rosterUnitIds: wb?.units.map((u) => u.id) ?? [],
      deployedUnitIds: recorded
        ?? deployedUnitIds[sideId]
        ?? wb?.units.map((u) => u.id)
        ?? [],
    });
  };

  /**
   * The next side of this battle with a roster on this device and no
   * post-battle yet.
   *
   * Re-read from storage rather than from state, because the commit that just
   * closed the wizard wrote the last side's link onto the stored record.
   * Placeholder sides are not offered: they have no roster.
   */
  const nextUnresolvedSide = (): { battle: BattleRecord; side: BattleSide } | null => {
    if (!battleForPostBattle) return null;
    const battle = storage.getBattles().find((b) => b.id === battleForPostBattle);
    if (!battle) return null;
    const side = unresolvedSides(battle)
      .find((sd) => warbands.some((w) => w.id === sd.id && w.campaignId));
    return side ? { battle, side } : null;
  };

  const handleEndMatch = () => {
    const battle = battleFromMatch({
      matchWarbandIds,
      sideInfo: (id) => {
        const sd = side(id);
        return sd && {
          id: sd.id, name: sd.name, factionId: sd.factionId,
          isPlaceholder: sd.isPlaceholder,
        };
      },
      scores: warbandScores,
      coalitions,
      scenarioId: selectedScenarioId,
      scenarioName: selectedScenario?.name ?? 'Unrecorded scenario',
      scenarioDeeds: scenarioDeeds.map((d) => ({ title: d.title, description: d.desc })),
      playTurn,
      weather: activeWeather
        ? { name: activeWeather.name, effect: activeWeather.effect }
        : null,
      /*
        Who was on the table, per side, so a post-battle run later — the other
        side's, or one opened from the Chronicle — knows who sat the game out
        rather than assuming the whole roster played (FD-09b / RR-27).
      */
      deployedUnitIds,
    });
    if (battle) {
      /*
        Local first, and the local write is not conditional on the push.

        A phone at a club with no signal has to be able to end a match and keep
        what happened; the cloud copy is an extra, not the copy. The push is
        fire-and-forget here for the same reason — holding the post-battle
        wizard behind a network round trip would make a lost signal look like
        the app hanging at the one moment everyone is waiting on it.
      */
      storage.addBattle(battle);
      /*
        And hand it to the wizard rather than making the player retype it.
        `primaryWarband` is the side whose post-battle runs FIRST; the others
        are offered in turn once it commits — see `nextUnresolvedSide` below
        (FD-09b / RR-27).
      */
      setBattleForPostBattle(battle.id);
      setHandover(handoverFor(battle, primaryWarband?.id ?? ''));
      /*
        Nothing records whether this landed. The Chronicle works it out by
        comparing what it holds against what the cloud returns — a local
        battle the server does not know is one that has not been shared —
        which cannot go stale the way a stored flag can, and is right again
        the moment the push is retried from there.
      */
      void pushBattle(battle, campaign?.cloudId ? { campaignId: campaign.cloudId } : {});
    }
    setIsPostBattleOpen(true);
  };

  const handleAbortMatch = () => {
    soundEffects.playDiceRoll();
    resetMatchState();
    /* Abort is the one thing that ends a match, so it is the one thing that
       throws the saved scorecard away. A reload must not bring it back. */
    storage.clearMatch();
    setWarbandScores({});
    setCoalitions({});
    setResumedFrom(null);
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
  const handleToggleDeed = (deedTitle: string) => {
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
        /* Claimed, with nobody named yet. An empty mark is the side's claim:
           the book lets a Deed be the Warband's, and a model the player has
           not picked is not the first model on the list. Guessing one here
           would hand it the second Experience Point (p.105) it never earned. */
        nextDeeds[deedTitle] = {};
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

  /*
    Name the model that performed a Deed, without toggling the claim.

    The id is what is stored, and the name is copied beside it. This used to
    store the `customName` alone, which cost three things: a rename between
    the game and the post-battle step lost the attribution, the Chronicle
    printed the name as if it were a turn number, and the battles API — whose
    `turn` accepts eight characters — rejected the whole record for anyone
    called more than that, `Entire Warband` included.

    An empty `unitId` is *Entire Warband*: the side claimed it and no model
    takes the second Experience Point.
  */
  const handleSetDeedPerformer = (deedTitle: string, unitId: string) => {
    const named = deployedUnits.find((u) => u.id === unitId);
    setWarbandScores((prev) => {
      const cur = prev[viewingWarband.id] || { vp: 0, completedDeeds: {}, turnScores: {} };
      return {
        ...prev,
        [viewingWarband.id]: {
          ...cur,
          completedDeeds: {
            ...cur.completedDeeds,
            [deedTitle]: named
              ? { ...cur.completedDeeds[deedTitle], unitId: named.id, unitName: named.customName }
              : { turn: cur.completedDeeds[deedTitle]?.turn }
          }
        }
      };
    });
  };

  const handleToggleDeployUnit = (unitId: string) => {
    setDeployedUnitIds((prev) => {
      const currentList = prev[viewingWarband.id] || fieldableUnits.map((u) => u.id);
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
      [viewingWarband.id]: fieldableUnits.map((u) => u.id)
    }));
  };


  const handleAddPlayerWarband = (wbId: string) => {
    if (matchWarbandIds.length >= 4 || matchWarbandIds.includes(wbId)) return;
    setMatchWarbandIds((prev) => [...prev, wbId]);
  };

  const handleRemovePlayerWarband = (wbId: string) => {
    if (matchWarbandIds.length <= 1) return;
    setMatchWarbandIds((prev) => prev.filter((id) => id !== wbId));
    // Its tag goes with it, so a re-added side does not inherit an old team.
    setCoalitions((prev) => pruneCoalitions(matchWarbandIds.filter((id) => id !== wbId), prev));
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

  /*
    The scenario's Deeds, plus any a model on the field brings with it.

    "Whenever a Combat Biologist is part of your Warband, add the Gather
    Knowledge Glorious Deed to those normally available in each scenario you
    play" — so the list is not the scenario's alone. Every participating
    Warband is read, not just the one being viewed: the Deeds available in the
    game are what the game offers, and each side claims from the same list.
  */
  const printedDeeds = parseDeeds(sectionOf(selectedScenario, 'GLORIOUS DEEDS'));
  const scenarioDeeds = [
    ...printedDeeds,
    ...rosterDeeds(matchWarbandIds.map(side), playDataset?.units, printedDeeds),
  ];
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
                <span>🌐 Live Match Mirror</span>
                {/* No "Coming Soon": it is here. */}
              </button>
            </div>
          </div>

          {/* MULTIPLAYER LIVE MODE: COMING SOON / ARCHITECTURE ROADMAP VIEW */}
          {/*
            The live match mirror (LIVE-1).

            What stood here was a roadmap: a Match PIN, a QR code, alliance
            timers, a host who deals card decks — under an "In Development"
            badge, describing all of it in the present tense. None of it was
            built. A screen that describes a feature it does not have is the
            same defect as a checklist that lags the code, and worse, because
            a player reads it as an offer.

            What replaced it is narrower and real: one device is the table,
            and everyone else in the campaign can watch. See docs/LIVE-MODE.md
            for why that shape first.
          */}
          {matchMode === 'multiplayer-live' ? (
            <LiveMirrorPanel warband={viewingWarband ?? null} turn={playTurn} />
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
                {/*
                  Grouped by book. Three sources number their scenarios from I
                  — the rulebook's twelve, Carcass Front's five, All Out War's
                  three — so a flat list shows "I. Claim No Man's Land" and
                  "I. The Ruins of Nineveh Novus" as peers, and two players
                  agreeing on "scenario one" would set up different games.
                */}
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full bg-theme-base border-2 border-theme-primary rounded p-2.5 text-xs text-theme-text focus:outline-none"
                >
                  {SCENARIO_BOOKS.map(({ source, label }) => {
                    const inBook = scenarios.filter((s) => (s.source ?? '') === source);
                    if (!inBook.length) return null;
                    return (
                      <optgroup key={label} label={label}>
                        {inBook.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
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
                  <span className="eyebrow text-theme-muted">
                    {SCENARIO_BOOKS.find((b) => b.source === (selectedScenario?.source ?? ''))?.label}
                  </span>
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-theme-muted">
                  {matchWarbandIds.length} Warband{matchWarbandIds.length > 1 ? 's' : ''} Linked
                </span>
                {/* A starting pair-off for a four-way, since that is how
                    players sit down. Every tag stays editable. */}
                {matchWarbandIds.length > 2 && !hasCoalitions(matchWarbandIds, coalitions) && (
                  <button
                    onClick={() => setCoalitions(suggestCoalitions(matchWarbandIds))}
                    className="min-h-[44px] rounded border border-theme-border px-2.5 text-xs font-bold uppercase text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
                  >
                    Pair into coalitions
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {matchWarbandIds.map((wbId, idx) => {
                const wb = side(wbId);
                const depIds = deployedUnitIds[wbId]
                  || fieldable(wb?.units).map((u) => u.id);
                const depCost = wb?.units.filter((u) => depIds.includes(u.id)).reduce((s, u) => s + u.totalCost, 0) || 0;

                return (
                  <div key={wbId} className="p-4 bg-theme-base border-2 border-theme-primary rounded-md space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary">
                        {/* "(YOU)" is the side you are running, which is not
                            simply the first in the list: an opponent added to
                            an empty match would otherwise be labelled as you. */}
                        PLAYER {idx + 1} {wbId === currentViewingWarbandId ? '(YOU)' : ''}
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
                          {wb && !wb.isPlaceholder && warbandCode(wb.id)}
                        </span>
                      </div>
                      <span className="text-xs sm:text-[10px] text-theme-muted block">
                        Faction: {wb?.factionId}
                      </span>
                    </div>

                    {/*
                      Who this side fights for.

                      Only offered once there are enough sides for it to mean
                      anything — a coalition in a duel is a word for "you".
                    */}
                    {matchWarbandIds.length > 2 && (
                      <div className="flex gap-1.5">
                        {COALITIONS.map((c) => {
                          const on = coalitions[wbId] === c;
                          return (
                            <button
                              key={c}
                              onClick={() => setCoalitions((prev) => ({
                                ...prev, [wbId]: on ? undefined : c,
                              }))}
                              aria-pressed={on}
                              className={`min-h-[44px] flex-1 rounded border px-2 text-xs font-bold uppercase transition-colors ${
                                on
                                  ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
                                  : 'border-theme-border text-theme-muted hover:text-theme-text'
                              }`}
                            >
                              {COALITION_NAME[c]}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/*
                      A placeholder has no roster here, so a deployment panel
                      would read `0 / 0` and a Select Squad button would open
                      an empty list. Saying what it is beats showing zeroes
                      that look like a warband nobody mustered.
                    */}
                    {wb?.isPlaceholder ? (
                      <div className="p-2.5 bg-theme-surface rounded border border-dashed border-theme-border text-xs space-y-1">
                        <span className="block font-bold uppercase text-theme-muted">
                          No roster in the app
                        </span>
                        <span className="block text-theme-muted">
                          {wb.fieldStrength
                            ? `They field ${wb.fieldStrength} models.`
                            : 'Model count not given.'}
                          {' '}Scored and recorded like any other side.
                        </span>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
                  <div className="w-full min-w-0 space-y-2">
                    <WarbandCombobox
                      label="Add a warband to the match"
                      placeholder="+ Add warband — name or code"
                      warbands={warbands.filter((w) => !matchWarbandIds.includes(w.id))}
                      onSelect={(w) => handleAddPlayerWarband(w.id)}
                      secondary={(w) => `${w.factionId} · ${w.units.length} models`}
                    />
                    {/*
                      And the other case: somebody turned up with their list on
                      paper. A placeholder is scored and recorded like any
                      other side; it simply has no models to activate.
                    */}
                    <OpponentPicker
                      usedIds={matchWarbandIds}
                      onSelect={handleAddPlayerWarband}
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
                    className="flex items-center gap-1.5 px-3 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow min-h-[44px] lg:min-h-0"
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Roll 2D6 each ({matchWarbandIds.length})</span>
                  </button>
                  {weatherRolls.length > 0 && (
                    <button
                      onClick={() => { setWeatherRolls([]); setActiveWeather(null); }}
                      className="px-3 py-2 bg-theme-base text-theme-muted border border-theme-border rounded text-xs font-bold uppercase min-h-[44px] lg:min-h-0"
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
                    Whose call it is.

                    This used to say the app "cannot know the table's Campaign
                    VP standings", and that was true — nothing derived them, so
                    `whoChooses` sat in `rules/weather.ts` with tests and no
                    caller at all. Campaign Victory Points come off the
                    win/loss/draw record now, so for a campaign match the app
                    can name the player whose call it is instead of restating
                    the rule at them.

                    It still only names them: the decision is theirs, and a
                    level table or a one-off game goes to a roll-off, which is
                    what the book says and what `whoChooses` reports.
                  */}
                  <p className="text-theme-muted text-xs sm:text-[11px] leading-relaxed">
                    {weatherChooser.names.length && !weatherChooser.rollOff ? (
                      <>
                        <strong className="text-theme-text">{weatherChooser.names[0]}</strong>
                        {' '}has the fewest Campaign Victory Points, so they pick which of these
                        applies for the rest of the battle.
                      </>
                    ) : weatherChooser.names.length > 1 ? (
                      <>
                        <strong className="text-theme-text">{weatherChooser.names.join(' and ')}</strong>
                        {' '}are level on Campaign Victory Points — roll off, and the winner picks.
                      </>
                    ) : (
                      <>
                        The player with the fewest Campaign Victory Points picks which of these
                        applies for the rest of the battle. Level, or a one-off game? Roll off.
                      </>
                    )}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {weatherRolls.map((r) => {
                      const wb = side(matchWarbandIds[r.player]);
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
              onClick={handleEndMatch}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 bg-theme-accent text-white rounded font-mono text-xs font-bold uppercase"
            >
              <Skull className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">End</span>
            </button>
          </div>

          {/*
            A resumed match says so, and says how old it is.

            Restoring silently is its own kind of wrong: a match from last week
            comes back looking exactly like tonight's, and the first thing a
            player does is add points to the wrong game. Dismissible, because
            once you have read it you are resuming deliberately.
          */}
          {resumedFrom && (
            <div className="flex items-start gap-2 rounded border border-theme-primary/50 bg-theme-elevated p-3">
              <History className="mt-0.5 h-4 w-4 shrink-0 text-theme-primary" />
              <div className="min-w-0 flex-1 text-xs">
                <span className="block font-bold text-theme-text">
                  Resumed a match saved {resumedFrom}
                </span>
                <span className="block text-theme-muted">
                  Scores and claimed Deeds are as you left them. Abort Match starts over.
                </span>
              </div>
              <button
                onClick={() => setResumedFrom(null)}
                aria-label="Dismiss"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-theme-muted hover:text-theme-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Active Combat HUD — the full set, scrolling with the page. */}
          <div className="bg-theme-surface border-2 border-theme-primary rounded-md p-3 sm:p-4 shadow-2xl space-y-3 bevel-container">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Left: Warband & Turn Info */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-theme-base border border-theme-primary px-3 py-1.5 rounded flex items-center space-x-2">
                  <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted">TURN</span>
                  <span className="font-gothic font-bold text-lg text-theme-primary">{playTurn}</span>
                </div>

                {/*
                  Player selector tabs, which SCROLL rather than overflow.

                  Four sides at 375px does not fit on one line, and the fourth
                  was being clipped at the right edge — in a 2v2 that is a
                  whole player you cannot select. Horizontal scroll on this
                  strip only; the page itself still must never scroll sideways
                  (docs/MOBILE.md §6).
                */}
                {matchWarbandIds.length > 1 && (
                  <div className="flex max-w-full items-center space-x-1 overflow-x-auto rounded border border-theme-border bg-theme-base p-1">
                    {matchWarbandIds.map((wbId, pIdx) => {
                      const wb = side(wbId);
                      const isSel = pIdx === activePlayerIndex;
                      const pScore = warbandScores[wbId]?.vp || 0;
                      /* A placeholder is scored, never controlled: it has no
                         models, so switching to it shows an empty tracker. */
                      const selectable = isControllable(wb);
                      return (
                        <button
                          key={wbId}
                          disabled={!selectable}
                          title={selectable ? undefined
                            : `${wb?.name ?? 'This side'} has no roster in the app — score only`}
                          onClick={() => { if (selectable) setActivePlayerIndex(pIdx); }}
                          className={`flex shrink-0 items-center space-x-1.5 rounded px-3 py-1 text-xs font-mono font-bold uppercase transition-all ${
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
              {/*
                Coalition totals, above the per-side ones and never instead of
                them. Each warband still scores individually — that is the
                number a campaign record wants and the one a player asks about
                afterwards — so this is their sum, shown alongside.
              */}
              {hasCoalitions(matchWarbandIds, coalitions) && (
                <div className="mb-2 flex w-full flex-wrap gap-2">
                  {COALITIONS.map((c) => {
                    const total = coalitionScore(
                      matchWarbandIds, coalitions, c, (id) => warbandScores[id]?.vp || 0);
                    const ahead = leader(
                      matchWarbandIds, coalitions, (id) => warbandScores[id]?.vp || 0) === c;
                    return (
                      <div
                        key={c}
                        className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded border px-3 py-2 ${
                          ahead
                            ? 'border-theme-primary bg-theme-primary/10'
                            : 'border-theme-border bg-theme-base'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs sm:text-[10px] font-bold uppercase text-theme-muted">
                            {COALITION_NAME[c]}
                          </span>
                          {/* Wraps rather than truncating: "Bayt al-Nahas +
                              Iro…" hides which ally it is, which is the one
                              thing this line exists to say. */}
                          <span className="block text-xs sm:text-[10px] leading-tight text-theme-muted">
                            {matchWarbandIds
                              .filter((id) => coalitions[id] === c)
                              .map((id) => side(id)?.name ?? '—')
                              .join(' + ')}
                          </span>
                        </span>
                        <span className="font-gothic text-lg font-bold text-theme-primary">
                          {total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

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
                  onClick={handleEndMatch}
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
            <div className="flex flex-wrap items-center gap-2 border-t border-theme-border pt-3">
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
                    const wb = side(wbId);
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
                      const isChecked = deed.title in currentScoreObj.completedDeeds;
                      const performer = currentScoreObj.completedDeeds[deed.title]?.unitId ?? '';
                      // Claimed by somebody else: the glory is gone, and this
                      // side cannot score it. See handleToggleDeed.
                      const holderId = deedClaimedBy(deed.title);
                      const takenBy = holderId && holderId !== viewingWarband.id
                        ? side(holderId)
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
                            {/* `min-h-[44px]`: the label is the hit area, and a
                                one-line Deed made it 20px tall. */}
                            <label className={`flex min-h-[44px] items-start space-x-2.5 flex-1 py-1 ${takenBy ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={Boolean(takenBy)}
                                onChange={() => handleToggleDeed(deed.title)}
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
                                {/* The empty value is the side's own claim, and
                                    it is the default: the book lets a Deed
                                    belong to the Warband, and a model nobody
                                    named must not collect the Experience. */}
                                <option value="">Entire Warband</option>
                                {deployedUnits.map((u) => (
                                  <option key={u.id} value={u.id}>
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
                        <span className="text-xs sm:text-[9px] text-theme-muted block">ARMOUR</span>
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

                      {/*
                        The two marker pools.

                        The count reads `n / cap` only where the book prints a
                        cap. It used to read `{unit.bloodMarkers} / 6` with the
                        6 typed in; Blessing Markers have no printed limit, so
                        showing them as "/ 6" would state a rule the book does
                        not, and showing them at all is new — the app had no
                        way to record a blessing.
                      */}
                      {([
                        { id: 'blood-markers', label: 'BLOOD MARKERS', value: unit.bloodMarkers,
                          tone: 'text-status-error',
                          icon: <Droplet className="w-4 h-4 text-status-error fill-status-error" />,
                          step: updateUnitBloodMarkers },
                        { id: 'blessing-markers', label: 'BLESSING MARKERS', value: unit.blessingMarkers ?? 0,
                          tone: 'text-theme-primary',
                          icon: <Sparkles className="w-4 h-4 text-theme-primary" />,
                          step: updateUnitBlessingMarkers },
                      ] as const).map((pool) => {
                        const cap = markers.find((m) => m.id === pool.id)?.cap ?? null;
                        return (
                          <div key={pool.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-theme-text">
                              {pool.icon}
                              <span className="font-bold">{pool.label}:</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                aria-label={`Remove one ${pool.label.toLowerCase()} from ${unit.customName}`}
                                onClick={() => pool.step(viewingWarband.id, unit.id, -1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-theme-surface hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-sm select-none active:scale-95 transition-transform"
                              >
                                -
                              </button>
                              <span className={`font-bold text-sm sm:text-base ${pool.tone} min-w-[24px] text-center`}>
                                {pool.value}{cap === null ? '' : ` / ${cap}`}
                              </span>
                              <button
                                aria-label={`Add one ${pool.label.toLowerCase()} to ${unit.customName}`}
                                onClick={() => pool.step(viewingWarband.id, unit.id, 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-theme-surface hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-sm select-none active:scale-95 transition-transform"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}

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

                    {/* The model's own card: stats with injuries applied,
                        keywords as tappable chips, abilities and skills. */}
                    <button
                      onClick={() => setReferenceUnit(unit)}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-theme-border bg-theme-base py-2 text-xs font-bold uppercase text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Rules, Keywords &amp; Skills</span>
                    </button>

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
        <div ref={squadRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
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
                {fieldableUnits.map((u) => {
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
                        {/*
                          An indicator, not a control: the card is the control,
                          and this box has an empty `onChange` because the
                          click handler is on the row. Marked as decoration
                          rather than grown to 44px — a checkbox that big beside
                          a model's name would be absurd, and the touch target
                          the player actually needs is the whole row, which is
                          what it already is.
                        */}
                        <input
                          type="checkbox"
                          checked={isDep}
                          readOnly
                          tabIndex={-1}
                          aria-hidden="true"
                          className="pointer-events-none rounded border-theme-border text-theme-primary focus:ring-0"
                        />
                        <div>
                          <strong className="block text-xs">{u.customName}</strong>
                          <span className="text-xs sm:text-[10px] text-theme-muted">{u.profileSnapshot.name}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-theme-primary whitespace-nowrap">
                        {formatUnitCost(u.totalCost, unitGlory(u))}
                      </span>
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

      {/* THE MODEL'S OWN CARD */}
      {referenceUnit && (
        <ModelReferenceSheet
          unit={referenceUnit}
          keywords={playDataset?.keywords}
          /* The Trauma table, so a Leg Wound's -2" comes from the catalogue
             rather than being written into the component. */
          traumaTable={playDataset?.campaign?.trauma}
          onClose={() => setReferenceUnit(null)}
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
          handover={handover}
          onClose={() => setIsPostBattleOpen(false)}
        />
      )}

      {/*
        The other sides' post-battles (FD-09b / RR-27).

        A game has as many post-battles as it has rosters, and only the active
        warband's was ever run — so a second warband of the player's own, or
        another user's in a hosted match, got no Trauma, no Experience and no
        Exploration at all: the Chronicle had the game and the campaign did
        not.

        Offered rather than forced, one at a time, and it keeps offering until
        every side with a roster on this device is linked or the player
        declines. Declining is not a loss: the Campaign Hub lists the same
        battle as unresolved, so it can be finished later or on the device
        that holds the other roster.
      */}
      {!isPostBattleOpen && nextUnresolvedSide() && (() => {
        const next = nextUnresolvedSide()!;
        return (
          <ConfirmModal
            isOpen
            title="ANOTHER SIDE FOUGHT THIS GAME"
            message={`${next.side.name} has no post-battle for this match yet — `
              + 'no Trauma, no Experience and no Exploration. Run it now?'}
            confirmLabel={`Post-battle for ${next.side.name}`}
            cancelLabel="Later"
            onConfirm={() => {
              setActiveWarbandId(next.side.id);
              setHandover(handoverFor(next.battle, next.side.id));
              setIsPostBattleOpen(true);
            }}
            onCancel={() => setBattleForPostBattle(null)}
          />
        );
      })()}

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
        <div ref={mapRef} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in font-mono">
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
