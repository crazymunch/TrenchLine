'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { buildArsenal, groupOf, offersDiffer, type ArsenalItem } from '../../rules/arsenal';
import { Sheet } from '../ui/Sheet';
import { useDataset } from '../../rules/useDataset';
import { useScenarios } from '../../rules/useScenarios';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { AVAILABLE_RULESETS } from '../../data/rulesets';
import { soundEffects } from '../../services/soundEffects';
import { MissionGenerator } from './MissionGenerator';
import { DiceProbabilityModal } from './DiceProbabilityModal';
import { RulesProse } from './RulesProse';
import { rollLabel } from '../../rules/campaign';
import { CampaignsView } from './CampaignsView';
import { ViewMasthead } from '../ui/ViewMasthead';
import { 
  BookOpen, 
  Search, 
  Swords, 
  Tag, 
  Skull, 
  Dices,
  Compass, 
  Shield, 
  Sparkles, 
  Dice6, 
  BarChart3, 
  Scroll, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Crown,
  Flag,
  ExternalLink,
  Layers,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useOverlay } from '../ui/useOverlay';

/**
 * Which book a scenario is from, for the ones that are not the core rulebook.
 *
 * Both supplements number their scenarios from I, as the rulebook numbers its
 * twelve, so "I." in a single list says nothing about which game a player is
 * agreeing to play.
 */
const SOURCE_LABEL: Record<string, string> = {
  'carcass-front': 'Carcass Front',
  'all-out-war': 'All Out War',
};

export const CodexView: React.FC = () => {
  const { rulesetVersion, setRulesetVersion } = useStore();
  const [activeTab, setActiveTab] = useState<'rules' | 'keywords' | 'scenarios' | 'skills' | 'charts' | 'weapons' | 'armour' | 'generator' | 'rulesets' | 'patrons' | 'campaigns' | 'faq'>('rules');

  /**
   * The reference tables, from the generated dataset.
   *
   * The Codex was the last thing reading the hand-written copies, and those
   * were fabricated: every Exploration Location and every Skill was invented,
   * and the Skills had no roll numbers at all (AUDIT §1.13). A reference view
   * showing invented rules is worse than most wrong data, because a player
   * consults it precisely when they are unsure.
   */
  const codexRulesetId = typeof window !== 'undefined'
    ? window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID
    : DEFAULT_RULESET_ID;
  const { dataset: codexDataset, error: codexDatasetError } = useDataset(codexRulesetId);

  /** Derived rows -> the shape this view renders. */
  const skillsFor = (cat: string) => {
    const key = (['melee', 'ranged', 'stealth', 'wildcard'] as const)
      .find((k) => k === cat) ?? 'wildcard';
    return (codexDataset?.campaign.skills[key] ?? [])
      .map((r) => ({ name: r.name, description: r.description, roll: String(r.roll) }));
  };
  const chartFor = (which: string) => {
    if (!codexDataset) return [];
    if (which === 'trauma') {
      return codexDataset.campaign.trauma.map((r) => ({
        roll: r.roll, title: r.name, description: r.description,
      }));
    }
    /*
      The four Carcass Front tables, which are a different set and not a fourth
      rarity: a Carcass Front campaign uses them INSTEAD of the rulebook's
      three. Undefined on a ruleset without the supplement, which is why this
      is a lookup rather than a branch on the name.
    */
    const cf = codexDataset.campaign.carcassFrontExploration?.[which];
    if (cf) {
      return cf.locations.map((r) => ({
        roll: rollLabel(r.roll), title: r.name, description: r.description,
      }));
    }
    const table = which === 'common' ? 'common' : which === 'rare' ? 'rare' : 'legendary';
    return codexDataset.campaign.exploration.locations[table].map((r) => ({
      roll: rollLabel(r.roll), title: r.name, description: r.description,
    }));
  };
  /** The Carcass Front Resource tables, or an empty list on a ruleset without them. */
  const cfExploration = codexDataset?.campaign.carcassFrontExploration ?? undefined;
  const patrons = codexDataset?.patrons ?? [];
  const campaigns = codexDataset?.campaigns ?? [];
  const visionCards = codexDataset?.visionCards ?? [];
  const carcassFrontMap = codexDataset?.carcassFrontMap;
  /**
   * The official Rules Commentaries — the game's own FAQ.
   *
   * Empty on a ruleset built without the extract, which is a real state; the
   * parser throws rather than return an empty list when the file is present
   * and unreadable, so an empty list here never means "we failed to read it".
   */
  const commentaries = codexDataset?.commentaries ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [isProbabilityOpen, setIsProbabilityOpen] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string>('claim-no-mans-land');
  const [expandedPatronId, setExpandedPatronId] = useState<string | null>(null);
  // A Resource id ('favour', 'relic', …) is as valid here as a rarity name:
  // `chartFor` looks the Carcass Front tables up by Resource.
  const [selectedChartTable, setSelectedChartTable] = useState<string>('trauma');
  const [selectedSkillsCategory, setSelectedSkillsCategory] = useState<'melee' | 'ranged' | 'stealth' | 'wildcard'>('melee');
  const [skillsViewMode, setSkillsViewMode] = useState<'cards' | 'tables'>('cards');
  const [selectedSkillModal, setSelectedSkillModal] = useState<{
    name: string;
    description: string;
    category: string;
    d66Roll: string;
    howToObtain: string;
  } | null>(null);
  const [selectedWargearItem, setSelectedWargearItem] = useState<ArsenalItem | null>(null);
  const [lightboxMap, setLightboxMap] = useState<{ src: string; name: string; tableSize?: string } | null>(null);

  /*
    Scroll lock, Escape and a focus trap for the overlays below.

    `useOverlay` rather than a move to `Sheet`: the behaviour is what was
    missing and it does not have to wait for the JSX surgery (see the hook's
    own note). Without it the page behind scrolls under your finger, the
    overlay cannot be closed from the keyboard, and Tab walks out into the
    view underneath.
  */
  const skillRef = useOverlay(Boolean(selectedSkillModal), () => setSelectedSkillModal(null));
  const lightboxRef = useOverlay(Boolean(lightboxMap), () => setLightboxMap(null));

  const filterText = searchQuery.toLowerCase().trim();

  /**
   * The Core Rules and Comprehensive Rules chapters, derived.
   *
   * The eight hand-written chapters this replaced were wrong about the three
   * things a player is most likely to look up mid-game: Initiative went to
   * whoever rolled highest on a D6 (the book gives it to the player with the
   * FEWEST models, and only rolls on a tie), the Success table's failure band
   * read 1-6 (1 is not a result on 2D6), and Morale triggered on "50% of
   * starting models" rather than the book's "half the models in your Warband,
   * rounded up". The Codex gets consulted precisely when the book is not to
   * hand, so it has to be the book.
   */
  const coreRules = codexDataset?.coreRules ?? [];

  const filteredRules = coreRules.filter(
    (r) => r.title.toLowerCase().includes(filterText) || r.content.toLowerCase().includes(filterText)
  );

  /**
   * The Keyword Glossary, derived.
   *
   * The hand-written copy this replaced had 46 entries against the book's 59.
   * Two of the 46 — HEAVY COVER and LIGHT COVER — do not appear anywhere in the
   * rulebook, and the rest split the book's parameterised rules into instances:
   * three NEGATE entries for the one NEGATE [KEYWORD] rule. Both failures point
   * the same way, and a glossary is consulted precisely when a player cannot
   * check it.
   */
  const keywords = codexDataset?.keywords ?? [];

  const filteredKeywords = keywords.filter(
    (k) => k.name.toLowerCase().includes(filterText) || (k.description || '').toLowerCase().includes(filterText) || (k.type || '').toLowerCase().includes(filterText)
  );

  /*
    Question, answer AND label, so `RULES Q1` finds its own entry: that label
    is what a player quotes to an opponent across a table, and searching for
    the thing you were shown should find it.
  */
  const filteredCommentaries = commentaries.filter(
    (c) => c.question.toLowerCase().includes(filterText)
      || c.answer.toLowerCase().includes(filterText)
      || c.label.toLowerCase().includes(filterText)
      || c.section.toLowerCase().includes(filterText)
  );
  /** The document's own order, kept: sections run Core Rules first, Misc last. */
  const commentarySections = [...new Set(filteredCommentaries.map((c) => c.section))];

  /**
   * The arsenal: the Armoury Tables joined to the rulebook's Battlekit chapter.
   *
   * What this replaced carried one Ducat cost and one `faction` string per
   * item, and wargear is priced *per faction* — an Automatic Rifle is 40
   * Ducats in two armouries and 2 Glory in a third. One number was right for
   * two factions out of six and quietly wrong for the rest, which is why the
   * card now lists every armoury that stocks the item rather than a badge
   * claiming it is "Universal / Standard Issue".
   */
  const arsenal = useMemo(() => buildArsenal(codexDataset), [codexDataset]);

  const matchesArsenal = (i: ArsenalItem) =>
    i.name.toLowerCase().includes(filterText)
    || i.keywords.some((kw) => kw.toLowerCase().includes(filterText))
    || (i.description || '').toLowerCase().includes(filterText)
    || i.rules.some((r) => r.toLowerCase().includes(filterText))
    || i.offers.some((o) => o.faction.toLowerCase().includes(filterText));

  const filteredWeapons = arsenal.filter((i) => groupOf(i) === 'weapons' && matchesArsenal(i));
  const filteredArmour = arsenal.filter((i) => groupOf(i) !== 'weapons' && matchesArsenal(i));

  /**
   * Every scenario the app can offer, through the one list that knows about
   * all of them.
   *
   * This read `codexDataset.scenarios` directly, which is the DERIVED set —
   * the rulebook's twelve and Carcass Front's five — so the three All Out War
   * scenarios were in the app and absent from the Codex. Play Mode, the quick
   * search, Log Match, the post-battle wizard and the mission generator all
   * call `useScenarios()`; the Codex was the one screen that did not, and it
   * is the screen a player opens to look a scenario up.
   *
   * The derived twelve had the wrong game length for **all twelve**, inverted
   * Claim No Man's Land's Infiltrator rule (the book says they must deploy
   * normally; the app said they need not), and invented 32 of its 46 Glorious
   * Deeds before they were derived — which is why `useScenarios()` marks what
   * came from the pipeline and what did not, and why the card below says so
   * on the ones that did not.
   */
  const { scenarios: scenarioChoices } = useScenarios(codexRulesetId);
  const scenarios = useMemo(
    () => scenarioChoices.flatMap((s) => (s.entry ? [s.entry] : [])),
    [scenarioChoices],
  );

  /**
   * Terrain pieces with rules of their own — the Levant Hedgehog and the
   * Naval Mine, whose 2D6 detonation table and blast profile a player cannot
   * resolve from memory. Shown with the scenarios because that is the chapter
   * they are printed in, but the book is explicit that they are for use in any
   * game rather than only its own five.
   */
  const terrain = codexDataset?.terrain ?? [];

  const filteredScenarios = scenarios.filter(
    (s) => s.name.toLowerCase().includes(filterText)
      || s.tagline.toLowerCase().includes(filterText)
      || s.sections.some((sec) => sec.body.toLowerCase().includes(filterText))
  );

  /** `40 D`, `2 G`, or both where an offer costs Ducats *and* Glory. */
  const priceLabel = (cost: { ducats: number; glory: number }) =>
    [cost.ducats ? `${cost.ducats} D` : '', cost.glory ? `${cost.glory} G` : '']
      .filter(Boolean).join(' + ') || 'Free';

  /**
   * How many armouries stock an item, in one line.
   *
   * Replaces a badge that read "Universal / Standard Issue" for anything it
   * had no faction for. That is not a category the game has: what exists is six
   * Armoury Tables, and an item is stocked by however many of them list it.
   */
  const stockedLabel = (item: ArsenalItem) => {
    if (!item.offers.length) return 'Not stocked by any Armoury Table';
    if (item.offers.length === 1) return `${item.offers[0].faction} only`;
    return `${item.offers.length} armouries`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Header Banner */}
      <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 shadow-xl space-y-4 bevel-container">
        <ViewMasthead
          eyebrow="Reference"
          icon={<BookOpen className="w-4 h-4" />}
          title="Official Rules Codex"
          strapline="The published Trench Crusade ruleset: every scenario with its deployment map, the keyword glossary, and the arsenal."
          actions={<>
          <button
            onClick={() => setIsProbabilityOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-theme-elevated hover:bg-theme-border border border-theme-primary/50 text-theme-primary rounded font-mono text-xs font-bold uppercase transition-all shadow flex-shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Success Roll Odds</span>
          </button>
          </>}
        />

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search core rules, keywords, weapons, scenarios, terrain, skills, injury tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-4 py-2 text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
          />
        </div>

        {/* 2-ROW NAVIGATION BUTTON GRID (NO HORIZONTAL SCROLLBAR) */}
        <div className="space-y-2 pt-1">
          {/* Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'rules', label: 'Core Rules', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'rulesets', label: `Ruleset Errata (${rulesetVersion})`, icon: <Layers className="w-4 h-4" /> },
              { id: 'keywords', label: `Keywords (${keywords.length})`, icon: <Tag className="w-4 h-4" /> },
              { id: 'scenarios', label: `Scenarios (${scenarios.length}) & Maps`, icon: <Compass className="w-4 h-4" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded text-xs font-mono font-bold uppercase transition-all ${
                  activeTab === t.id
                    ? 'bg-theme-primary text-theme-base shadow font-extrabold'
                    : 'bg-theme-elevated text-theme-muted hover:text-theme-text hover:bg-theme-elevated border border-theme-border'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          {/*
            Row 2. `generator` sits here because it had NO BUTTON AT ALL: the
            tab has been rendered by `activeTab === 'generator'` since the
            Codex was built and nothing in the app ever set that state, so the
            Mission Designer and every generator in it were unreachable. Six
            buttons on two rows of three at phone width, four across from `sm`.
          */}
          {/*
            `lg:grid-cols-4`, not 7, since the FAQ made this eight buttons.
            Eight across at 1440px truncates `Weapons Codex (108)` to nothing
            useful; two rows of four gives every label its full width. Phone
            and tablet are unchanged — 8 items over 2 columns is the same four
            rows 7 items took, and over 3 columns the same three.

            Literal class names, both of them. A templated `lg:grid-cols-${n}`
            does not compile (docs/MOBILE.md).
          */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { id: 'skills', label: 'Skills Compendium', icon: <Zap className="w-4 h-4" /> },
              { id: 'charts', label: 'Campaign D66 Tables', icon: <Skull className="w-4 h-4" /> },
              { id: 'generator', label: 'Scenario Generator', icon: <Dices className="w-4 h-4" /> },
              { id: 'weapons', label: `Weapons Codex (${arsenal.filter((i) => groupOf(i) === 'weapons').length})`, icon: <Swords className="w-4 h-4" /> },
              { id: 'armour', label: `Armour & Gear (${arsenal.filter((i) => groupOf(i) !== 'weapons').length})`, icon: <Shield className="w-4 h-4" /> },
              { id: 'patrons', label: `Patrons (${patrons.length})`, icon: <Crown className="w-4 h-4" /> },
              // No count in the label: two campaigns is not a useful number, and
              // `Campaigns (2)` truncates to `CAMPAIGNS (…` at 375px, which
              // shows the parenthesis and hides the count.
              { id: 'campaigns', label: 'Campaigns', icon: <Flag className="w-4 h-4" /> },
              { id: 'faq', label: `Rules FAQ (${commentaries.length})`, icon: <HelpCircle className="w-4 h-4" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded text-xs font-mono font-bold uppercase transition-all ${
                  activeTab === t.id
                    ? 'bg-theme-primary text-theme-base shadow font-extrabold'
                    : 'bg-theme-elevated text-theme-muted hover:text-theme-text hover:bg-theme-elevated border border-theme-border'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* TAB 1: CORE & COMPREHENSIVE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((chapter) => (
              <div
                /*
                  Keyed on the CATEGORY too, because seven rules are printed in
                  both chapters: `Actions` is Core Rules p14 and Comprehensive
                  Rules p34, and the slug is the same for both. Keyed on the
                  slug alone React saw seven duplicate keys, which it resolves
                  by reusing one element for two different rules — so the
                  second copy could render the first one's text.

                  The PAGE as well, because the same chapter can print a slug
                  twice: `Terrain` is Comprehensive Rules p23, a note in "what
                  you need to play", and again at p38, where the actual terrain
                  rules are. Different sections, same heading.

                  All of them are real and all are shown; it is the KEY that
                  had to be unique, not the rule. Deduplicating would drop a
                  section the book prints — and the page is what tells them
                  apart in the book, which is why the badge beside each heading
                  already shows it.
                */
                key={`${chapter.category}/${chapter.page}/${chapter.id}`}
                className="bg-theme-surface border border-theme-border rounded-md p-5 space-y-3 bevel-container hover:border-theme-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-theme-border pb-2">
                  <h3 className="font-gothic font-bold text-base text-theme-text">
                    {chapter.title}
                  </h3>
                  <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated text-theme-primary border border-theme-primary/30 font-bold uppercase whitespace-nowrap">
                    {chapter.category} p{chapter.page}
                  </span>
                </div>
                <RulesProse source={chapter.content} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: RULESETS & CHANGELOG ERRATA (1.0 vs 1.0.2 vs 1.0.2TD) */}
      {activeTab === 'rulesets' && (
        <div className="space-y-6">
          <div className="bg-theme-surface border-2 border-theme-primary rounded-md p-6 space-y-4 bevel-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-theme-border pb-4">
              <div>
                <h2 className="font-gothic font-bold text-xl text-theme-primary">
                  RULESET ENGINE & OFFICIAL ERRATA COMPARATOR
                </h2>
                <p className="text-xs font-mono text-theme-muted">
                  Select the active game ruleset version. All army builder validations, keywords, and combat calculations adhere to the active version.
                </p>
              </div>
              <span className="text-xs font-mono font-bold uppercase px-3 py-1.5 rounded bg-theme-elevated text-theme-primary border border-theme-primary">
                Active Ruleset: v{rulesetVersion}
              </span>
            </div>

            {/* Ruleset Cards Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {(Object.keys(AVAILABLE_RULESETS) as (keyof typeof AVAILABLE_RULESETS)[]).map((vKey) => {
                const meta = AVAILABLE_RULESETS[vKey];
                const isActive = rulesetVersion === vKey;

                return (
                  <div
                    key={vKey}
                    onClick={() => setRulesetVersion(vKey)}
                    className={`p-5 rounded-md border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                      isActive
                        ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary shadow-xl'
                        : 'bg-theme-base border-theme-border hover:border-theme-muted/60 opacity-80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-gothic font-bold text-base text-theme-text">{meta.name}</span>
                        {isActive && (
                          <CheckCircle2 className="w-5 h-5 text-status-legal" />
                        )}
                      </div>
                      <span className="text-xs sm:text-[10px] font-mono text-theme-primary block font-bold uppercase">
                        {meta.releaseDate}
                      </span>
                      <p className="text-xs font-mono text-theme-muted leading-relaxed">
                        {meta.summary}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-theme-border">
                      <span className="text-xs sm:text-[10px] font-mono font-bold uppercase text-theme-text block">Key Mechanics:</span>
                      <ul className="space-y-1 text-xs sm:text-[11px] font-mono text-theme-muted">
                        {meta.keyChanges.map((change, idx) => (
                          <li key={idx} className="flex items-start space-x-1.5">
                            <span className="text-theme-primary">•</span>
                            <span className="leading-snug">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRulesetVersion(vKey);
                      }}
                      className={`w-full py-2 font-mono text-xs font-bold uppercase rounded transition-colors ${
                        isActive
                          ? 'bg-theme-primary text-theme-base font-extrabold'
                          : 'bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-elevated'
                      }`}
                    >
                      {isActive ? '✓ Active Ruleset' : `Activate v${vKey}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed 1.0.2 Changelog Breakdown Table */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-6 space-y-4">
            <h3 className="font-gothic font-bold text-lg text-theme-text flex items-center space-x-2">
              <Scroll className="w-5 h-5 text-theme-primary" />
              <span>OFFICIAL 1.0.2 CHANGELOG & ERRATA INDEX</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-base text-theme-primary">
                    <th className="py-2.5 px-3 font-bold">Location</th>
                    <th className="py-2.5 px-3 font-bold">Rule / Keyword</th>
                    <th className="py-2.5 px-3 font-bold">Official 1.0.2 Errata Ruling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/60 text-theme-text">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Actions</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">Move</td>
                    <td className="py-2.5 px-3 text-theme-muted">A Move ACTION cannot be used to move a model within 1” of an enemy model (must use Charge ACTION instead).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Actions</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">Retreat</td>
                    <td className="py-2.5 px-3 text-theme-muted">Before retreat, opponent makes 1 melee attack with 1 weapon (no multiple attacks, but CLEAVE X applies). Model must end retreat &gt;1” away.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Combat</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">Bloodbath Rolls</td>
                    <td className="py-2.5 px-3 text-theme-muted">Spend 6 BLOOD MARKERS (or 3 if target is Down) to roll 3D6 and add all 3 together, picking 3 highest/lowest (4D6 if DEADLY).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">ARMOUR PIERCING</td>
                    <td className="py-2.5 px-3 text-theme-muted">Reduces the target’s total -INJURY MODIFIER from Armour and Shields by 1, to a minimum of 0.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">CLEAVE (X)</td>
                    <td className="py-2.5 px-3 text-theme-muted">Make X separate Melee Attacks one after another against models within 1”. Blood markers spent only modify that specific attack.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">STRONG</td>
                    <td className="py-2.5 px-3 text-theme-muted">Can equip and use one 2-Handed Melee Weapon as if it were a 1-Handed Melee Weapon.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">REGENERATE (X)</td>
                    <td className="py-2.5 px-3 text-theme-muted">When Activated, before carrying out any ACTIONS, remove up to X BLOOD MARKERS from the model.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Warbands</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">Combat Engineer & Sapper</td>
                    <td className="py-2.5 px-3 text-theme-muted">Gains NEGATE MINED, Set Mine ACTION (8”x8” terrain with +2 DICE), and Defuse Mine Risky Roll.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Warbands</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">Sultanate Assassin</td>
                    <td className="py-2.5 px-3 text-theme-muted">Temporal Assassin: split charge & 2 Fight actions against 2 enemies; Time Slip: redeploy 6" when enemy fails attack.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-theme-muted">Spells</td>
                    <td className="py-2.5 px-3 font-bold text-theme-primary">Goetic Spells</td>
                    <td className="py-2.5 px-3 text-theme-muted">Pay spell cost by removing BLOOD MARKERS anywhere on the battlefield from non-Black Grail / non-Demonic models.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKeywords.map((kw) => (
            <div
              key={kw.name}
              className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2 bevel-container hover:border-theme-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-theme-border pb-2">
                <span className="font-gothic font-bold text-base text-theme-primary">{kw.name}</span>
                {kw.type && (
                  <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated text-theme-muted uppercase">
                    {kw.type}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-theme-text leading-relaxed">
                {kw.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SCENARIOS, TERRAIN & CRISP VECTOR MAPS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {/*
            Terrain first, and above the scenarios rather than inside one.

            The Carcass Front book prints these in its Scenarios & Terrain
            chapter but says plainly they are "rules for two different terrain
            pieces that you can use in any of your Trench Crusade games". Filed
            under a scenario they would be invisible in every other game — and
            a naval mine's 2D6 detonation table is the thing a player reaches
            for mid-turn, after someone has shot at one.
          */}
          {terrain.length > 0 && (
            <div className="space-y-3">
              <h3 className="eyebrow accent">Terrain with rules of its own</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {terrain.map((piece) => {
                  const isOpen = expandedScenarioId === piece.slug;
                  return (
                    <div
                      key={piece.slug}
                      className="bg-theme-surface border border-theme-border rounded-md overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedScenarioId(isOpen ? '' : piece.slug)}
                        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left hover:bg-theme-elevated transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="min-w-0">
                          <span className="block font-gothic font-bold text-sm text-theme-text truncate">
                            {piece.title}
                          </span>
                          <span className="eyebrow text-theme-muted">Usable in any game</span>
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-5 h-5 text-theme-primary flex-shrink-0" />
                          : <ChevronDown className="w-5 h-5 text-theme-muted flex-shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-theme-border pt-3">
                          <RulesProse source={piece.body} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredScenarios.map((scen) => {
              const isExpanded = expandedScenarioId === scen.slug;
              return (
                <div
                  key={scen.slug}
                  className="bg-theme-surface border-2 border-theme-border rounded-md overflow-hidden shadow-xl bevel-container hover:border-theme-primary/40 transition-colors"
                >
                  <button
                    onClick={() => setExpandedScenarioId(isExpanded ? '' : scen.slug)}
                    className="w-full p-5 flex items-center justify-between text-left bg-theme-surface hover:bg-theme-elevated transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="min-w-[40px] px-2.5 h-8 rounded bg-theme-primary/20 border border-theme-primary flex items-center justify-center font-gothic font-bold text-xs text-theme-primary flex-shrink-0">
                        {scen.roman || scen.number}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-gothic font-bold text-base sm:text-lg text-theme-text truncate">
                          {scen.name}
                        </h3>
                        <p className="text-xs font-mono text-theme-muted italic">
                          {scen.tagline}
                        </p>
                        {/*
                          Which book. Both number their scenarios from I, so
                          "I. The Ruins of Nineveh Novus" sits in the same list
                          as "I. Claim No Man's Land" and the numeral alone
                          says nothing about which one a player is agreeing to.
                        */}
                        {scen.source && (
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="eyebrow accent inline-block">
                              {SOURCE_LABEL[scen.source] ?? scen.source}
                            </span>
                            {/*
                              Said on the card, not only in a comment. These
                              three are transcribed by hand rather than read
                              out of the catalogue, and a reference screen that
                              does not distinguish the two is how a player ends
                              up trusting the wrong line.
                            */}
                            {scen.source === 'all-out-war' && (
                              <span className="eyebrow inline-block text-theme-muted">
                                Transcribed, not derived
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-theme-primary" /> : <ChevronDown className="w-5 h-5 text-theme-muted" />}
                  </button>

                  {isExpanded && (
                    <div className="p-6 border-t border-theme-border bg-theme-base space-y-6">
                      
                      {/* Scenario Tactical Map Graphic with Lightbox Trigger */}
                      {scen.mapImage && (
                        <div 
                          onClick={() => setLightboxMap({ src: scen.mapImage!, name: scen.name })}
                          className="bg-theme-surface border-2 border-theme-primary/60 hover:border-theme-primary rounded-md p-4 space-y-2 max-w-2xl mx-auto shadow-2xl cursor-pointer group transition-all"
                        >
                          <div className="flex items-center justify-between text-xs font-mono text-theme-primary border-b border-theme-border pb-2 font-bold uppercase">
                            <span className="flex items-center space-x-1.5">
                              <Compass className="w-4 h-4" />
                              <span>Official Deployment Diagram: {scen.name}</span>
                            </span>
                            <span className="text-xs sm:text-[10px] text-theme-muted flex items-center space-x-1">
                              <Search className="w-3 h-3 text-theme-primary" />
                              <span>Click to Enlarge</span>
                            </span>
                          </div>
                          <div className="relative overflow-hidden rounded">
                            <img
                              src={scen.mapImage}
                              alt={`${scen.name} Tactical Map`}
                              className="w-full max-h-[500px] object-contain rounded block mx-auto transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-4 py-2 bg-theme-primary text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-2">
                                <Search className="w-4 h-4" />
                                <span>Inspect Full Resolution Diagram</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/*
                        The book's own sections, in the book's own order.

                        This replaced five fixed fields — forces, battlefield,
                        deployment, victoryConditions, gloriousDeeds — which
                        could not hold what half the scenarios actually have:
                        Dragon Hunt's THE DRAGON, Armoured Train's TRAIN WAGONS,
                        Don't Breathe's ICHOR PIT MARKERS. A fixed shape drops
                        exactly the rules that make a scenario itself.
                      */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                        {scen.sections.map((sec) => (
                          <div
                            key={sec.heading}
                            className={`p-4 bg-theme-surface border border-theme-border rounded-md space-y-1.5 ${
                              sec.body.length > 400 ? 'md:col-span-2' : ''
                            }`}
                          >
                            <span className="font-bold text-theme-primary uppercase flex items-center gap-1.5 text-xs">
                              <Scroll className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{sec.heading}</span>
                            </span>
                            <RulesProse source={sec.body} />
                          </div>
                        ))}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SKILLS COMPENDIUM */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-theme-surface border-2 border-theme-primary rounded-md shadow-xl bevel-container">
            <div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-theme-primary" />
                <h3 className="font-gothic font-bold text-lg text-theme-text">
                  OFFICIAL HERO SKILLS COMPENDIUM & PROMOTIONS (Pages 107-111)
                </h3>
              </div>
              <p className="text-xs font-mono text-theme-muted">
                Learnable skills for Elite warriors and Promoted heroes. Click any skill to inspect how to obtain it, or roll D66 directly.
              </p>
            </div>

            {/* View Mode & Roller CTAs */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const list = skillsFor(selectedSkillsCategory);
                  if (!list.length) return;
                  const roll = Math.floor(Math.random() * list.length);
                  const chosen = list[roll];
                  const d1 = Math.floor(Math.random() * 6) + 1;
                  const d2 = Math.floor(Math.random() * 6) + 1;
                  setSelectedSkillModal({
                    name: chosen.name,
                    description: chosen.description,
                    category: `${selectedSkillsCategory.toUpperCase()} SKILLS TABLE`,
                    d66Roll: `${d1}${d2}`,
                    howToObtain: `Rolled on the ${selectedSkillsCategory.toUpperCase()} Skills Table (Roll ${d1}${d2}). Awarded during Campaign Promotions when spending 5 XP or when a Troop model is Promoted to Elite.`
                  });
                  soundEffects.playDiceRoll();
                }}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded flex items-center space-x-1.5 shadow"
              >
                <Dice6 className="w-4 h-4" />
                <span>Roll D66 for Skill</span>
              </button>

              <div className="flex bg-theme-base p-1 rounded border border-theme-border text-xs font-mono">
                <button
                  onClick={() => setSkillsViewMode('cards')}
                  className={`px-3 py-1 rounded font-bold uppercase ${
                    skillsViewMode === 'cards' ? 'bg-theme-elevated text-theme-primary' : 'text-theme-muted'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setSkillsViewMode('tables')}
                  className={`px-3 py-1 rounded font-bold uppercase ${
                    skillsViewMode === 'tables' ? 'bg-theme-elevated text-theme-primary' : 'text-theme-muted'
                  }`}
                >
                  D66 Tables
                </button>
              </div>
            </div>
          </div>

          {/* Category Bar */}
          <div className="flex flex-wrap gap-2 font-mono text-xs border-b border-theme-border pb-3">
            {[
              { id: 'melee', label: '1. Melee & Strength Skills' },
              { id: 'ranged', label: '2. Ranged & Marksmanship' },
              { id: 'stealth', label: '3. Stealth & Infiltration' },
              { id: 'wildcard', label: '4. Wildcard & Leadership' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedSkillsCategory(cat.id as any)}
                className={`px-4 py-2 rounded font-bold uppercase transition-all whitespace-nowrap ${
                  selectedSkillsCategory === cat.id
                    ? 'bg-theme-primary text-theme-base shadow'
                    : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Skills Display (Cards or Tables) */}
          {skillsViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillsFor(selectedSkillsCategory).map((skill, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const d6Roll = `${idx + 1} (or D66 ${idx + 1}${idx + 1})`;
                    setSelectedSkillModal({
                      name: skill.name,
                      description: skill.description,
                      category: `${selectedSkillsCategory.toUpperCase()} SKILLS TABLE`,
                      d66Roll: d6Roll,
                      howToObtain: `Rolled on the ${selectedSkillsCategory.toUpperCase()} Skills Table (Roll ${idx + 1}). Available to ELITE models spending 5 XP in the Campaign Phase or when a Troop model gains a Promotion.`
                    });
                    soundEffects.playCathedralBell();
                  }}
                  className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2.5 bevel-container hover:border-theme-primary cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between border-b border-theme-border pb-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-theme-primary" />
                      <span className="font-gothic font-bold text-sm text-theme-text">
                        {skill.name}
                      </span>
                    </div>
                    <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-base text-theme-primary border border-theme-border font-bold">
                      Roll {idx + 1}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-theme-text leading-relaxed">
                    {skill.description}
                  </p>
                  <span className="text-xs sm:text-[10px] font-mono text-theme-muted italic block pt-1">
                    Click to view acquisition & promotion rules ➔
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Tables View */
            <div className="bg-theme-surface border border-theme-border overflow-x-auto font-mono text-xs">
              <table className="w-full min-w-[34rem] text-left border-collapse">
                <thead>
                  <tr className="bg-theme-base border-b border-theme-border text-theme-primary">
                    <th className="p-3 font-bold w-20">Roll</th>
                    <th className="p-3 font-bold w-48">Skill Name</th>
                    <th className="p-3 font-bold">Official Effect & Keywords</th>
                    <th className="p-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/60 text-theme-text">
                  {skillsFor(selectedSkillsCategory).map((skill, idx) => (
                    <tr key={idx} className="hover:bg-theme-elevated transition-colors">
                      <td className="p-3 font-bold text-theme-primary">
                        {idx + 1} / {idx + 1}{idx + 1}
                      </td>
                      <td className="p-3 font-bold text-theme-text font-gothic text-sm">
                        {skill.name}
                      </td>
                      <td className="p-3 text-theme-muted leading-relaxed">
                        {skill.description}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedSkillModal({
                              name: skill.name,
                              description: skill.description,
                              category: `${selectedSkillsCategory.toUpperCase()} SKILLS TABLE`,
                              d66Roll: `${idx + 1}`,
                              howToObtain: `Rolled on the ${selectedSkillsCategory.toUpperCase()} Skills Table (Roll ${idx + 1}). Awarded when an Elite warrior spends 5 XP or when a Troop model is Promoted.`
                            });
                          }}
                          className="px-2.5 py-1 bg-theme-elevated hover:bg-theme-border text-theme-primary rounded border border-theme-border text-xs sm:text-[10px] font-bold uppercase"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Skill Detail Popover Modal */}
          {selectedSkillModal && (
            <div ref={skillRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
              <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-theme-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-theme-primary" />
                    <div>
                      <h3 className="font-gothic font-bold text-lg text-theme-text">
                        {selectedSkillModal.name}
                      </h3>
                      <span className="text-xs sm:text-[10px] text-theme-primary uppercase font-bold">
                        {selectedSkillModal.category} • Roll {selectedSkillModal.d66Roll}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSkillModal(null)}
                    className="p-1 text-theme-muted hover:text-theme-text"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-theme-base rounded border border-theme-border space-y-1">
                    <span className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Rules & Effects:</span>
                    <p className="text-theme-text leading-relaxed">{selectedSkillModal.description}</p>
                  </div>

                  <div className="p-3.5 bg-theme-elevated rounded border border-theme-primary/40 space-y-1">
                    <span className="text-xs sm:text-[10px] text-theme-primary uppercase font-bold block flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>How to Obtain in Campaign:</span>
                    </span>
                    <p className="text-theme-text text-xs leading-relaxed">{selectedSkillModal.howToObtain}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-theme-border">
                  <button
                    onClick={() => setSelectedSkillModal(null)}
                    className="px-4 py-1.5 bg-theme-primary text-theme-base font-bold uppercase rounded text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CAMPAIGN D66 TABLES WITH EXPLANATORY GUIDES */}
      {activeTab === 'charts' && (
        <div className="space-y-6 font-mono text-xs">
          
          {/* Header & Table Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-theme-surface border-2 border-theme-primary rounded-md shadow-xl bevel-container">
            <div>
              <span className="font-gothic font-bold text-base text-theme-text block">
                OFFICIAL CAMPAIGN TABLES
              </span>
              {/*
                Not "(D66)". The Trauma Table is D66; an Exploration Roll is a
                pool of D6 summed, and the Carcass Front tables are rolled on
                3D6 and up. Labelling all of them D66 told a player to roll the
                wrong dice on six of the eight tables here.
              */}
              <p className="text-xs text-theme-muted">
                Trauma is D66. Exploration is your Exploration Dice, summed.
              </p>
            </div>
          </div>

          {/*
            Two groups, because they are two sets of tables and not one list.

            A Carcass Front campaign uses its four Resource tables INSTEAD of
            the rulebook's three — "you must use the Carcass Front Exploration
            Tables at the end of this book, instead of the ones in the Trench
            Crusade Rulebook" — so a player is on one set or the other. Shown
            as one flat row of eight they would read as eight tables to choose
            between, which is the one thing they are not.
          */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'trauma', label: 'Trauma (D66)' },
                { id: 'common', label: 'Common Exploration' },
                { id: 'rare', label: 'Rare Exploration' },
                { id: 'legendary', label: 'Legendary Exploration' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedChartTable(cat.id)}
                  className={`px-3 py-2 rounded font-bold uppercase transition-all text-xs ${
                    selectedChartTable === cat.id
                      ? 'bg-theme-primary text-theme-base shadow'
                      : 'bg-theme-elevated text-theme-muted hover:text-theme-text border border-theme-border'
                  }`}
                >
                  <span className="truncate block">{cat.label}</span>
                </button>
              ))}
            </div>

            {cfExploration && (
              <>
                <p className="text-[11px] font-mono uppercase tracking-wide text-theme-muted pt-1">
                  Carcass Front — used instead of the three above
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(cfExploration).map((t) => (
                    <button
                      key={t.resource}
                      onClick={() => setSelectedChartTable(t.resource)}
                      className={`px-3 py-2 rounded font-bold uppercase transition-all text-xs ${
                        selectedChartTable === t.resource
                          ? 'bg-theme-primary text-theme-base shadow'
                          : 'bg-theme-elevated text-theme-muted hover:text-theme-text border border-theme-border'
                      }`}
                    >
                      <span className="truncate block">{t.glyph} {t.resource}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Comprehensive Explanation Banner per Table */}
          {selectedChartTable === 'trauma' ? (
            <div className="p-4 bg-theme-base rounded border border-theme-accent space-y-2">
              <div className="flex items-center space-x-2 text-status-error">
                <Skull className="w-4 h-4" />
                <strong className="font-gothic uppercase text-sm">HOW THE TRAUMA STEP & INJURY ROLLS WORK:</strong>
              </div>
              <p className="text-theme-text leading-relaxed">
                After any match, every model that was taken <strong>Out of Action</strong> must roll on this D66 Trauma Table:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs sm:text-[11px]">
                <div className="p-2 bg-theme-surface rounded border border-status-error/40 text-status-error">
                  <strong>Rolls 11–16: Dead / Slain</strong>
                  <p className="text-theme-muted pt-0.5">Model is permanently removed from the warband roster. Battlekit returns to Arsenal stash.</p>
                </div>
                <div className="p-2 bg-theme-surface rounded border border-status-warning/40 text-status-warning">
                  <strong>Rolls 21–36: Battle Scars</strong>
                  <p className="text-theme-muted pt-0.5">Warrior survives but receives a lasting battle scar or attribute penalty. Can be healed via Field Hospital.</p>
                </div>
                <div className="p-2 bg-theme-surface rounded border border-status-legal/40 text-status-legal">
                  <strong>Rolls 41–66: Full Recovery</strong>
                  <p className="text-theme-muted pt-0.5">Warrior recovers fully with no negative effects, gaining toughness from experience.</p>
                </div>
              </div>
            </div>
          ) : cfExploration?.[selectedChartTable] ? (
            /*
              The Carcass Front Exploration Step, which is a different step.

              Every line here is a rule the book states and this app or its
              player would otherwise get wrong by carrying a habit over from a
              standard campaign — and each is worth Ducats every single game.
            */
            <div className="p-4 bg-theme-base rounded border border-theme-primary/50 space-y-2">
              <div className="flex items-center space-x-2 text-theme-primary">
                <Sparkles className="w-4 h-4" />
                <strong className="font-gothic uppercase text-sm">
                  THE CARCASS FRONT EXPLORATION STEP:
                </strong>
              </div>
              <p className="text-theme-text leading-relaxed">
                In a Carcass Front campaign you use these four tables{' '}
                <strong>instead of</strong> the rulebook&apos;s three. You roll on the one
                matching a Resource available in the zone the game was played in.
              </p>
              <ul className="list-disc list-inside text-theme-muted space-y-0.5 text-xs sm:text-[11px]">
                <li>
                  <strong>The pool is 3D6</strong>, and it does not grow with games played —
                  it grows with Campaign Tracker rewards and Camp Buildings.
                </li>
                <li>
                  <strong>Loot is your Exploration Roll × 5 👑</strong>, not × 10.
                </li>
                <li>
                  <strong>Rows are ranges.</strong> A Location is discovered if your roll
                  falls anywhere in its band, so every roll finds something.
                </li>
                <li>
                  <strong>Only the Aggressor consults a table.</strong> If you were not, you
                  still roll and still take the loot — and if three or more of your dice
                  match, you come across agents for Rudolf&apos;s Folly.
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-4 bg-theme-base rounded border border-theme-primary/50 space-y-2">
              <div className="flex items-center space-x-2 text-theme-primary">
                <Sparkles className="w-4 h-4" />
                <strong className="font-gothic uppercase text-sm">HOW THE EXPLORATION STEP WORKS:</strong>
              </div>
              {/*
                The book's own five numbered steps, derived.

                What stood here was written by hand and said "the winner of the
                match rolls on the … Exploration Table". Every player who
                played explores, unless they Called for Reinforcements — so it
                told the loser of every campaign game to skip their income. The
                three bullets under it named a "Trench Merchant" offer, a
                "Warband Treasury" and an "Armory Stash", none of which appears
                in any source.
              */}
              {/*
                The Exploration Step is the FOURTH of six, and where it sits
                carries a rule: Reinforcements comes before it, and taking that
                step costs you both this one and the Quartermaster. A player
                looking at Exploration alone cannot see the choice they have
                already made, so the whole sequence is shown above it.
              */}
              {(codexDataset?.campaign.phaseSteps ?? []).length > 0 && (
                <div className="space-y-1.5 border-b border-theme-border pb-3">
                  <span className="font-mono text-xs sm:text-[10px] font-bold uppercase tracking-wider text-theme-primary">
                    The Campaign Phase, in order
                  </span>
                  <ol className="list-decimal list-inside text-theme-muted space-y-1 text-xs sm:text-[11px]">
                    {(codexDataset?.campaign.phaseSteps ?? []).map((s) => (
                      <li key={s.name}>
                        <strong className="text-theme-text">{s.name}</strong>
                        {s.description ? ` — ${s.description}` : ''}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="text-theme-text leading-relaxed">
                In the Exploration Step, <strong>each player</strong> explores the territory the
                campaign is fought over. You are looking at the{' '}
                <strong>{selectedChartTable === 'common' ? 'Common' : selectedChartTable === 'rare' ? 'Rare' : 'Legendary'} Exploration Table</strong>;
                which one you use depends on how many games you have played.
              </p>
              <ol className="list-decimal list-inside text-theme-muted space-y-0.5 text-xs sm:text-[11px]">
                {(codexDataset?.campaign.exploration.sequence ?? []).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="text-theme-muted text-xs sm:text-[11px] leading-relaxed">
                The tables are <strong>sparse</strong>: a roll that is not listed discovers
                nothing, and you still collect the loot. A Location can be discovered only
                once per campaign.
              </p>
            </div>
          )}

          {/* Table Display */}
          <div className="space-y-2">
            {chartFor(selectedChartTable).length === 0 && (
              <p className="text-xs font-mono text-status-error leading-relaxed">
                {codexDatasetError
                  ? `The reference tables could not be loaded: ${codexDatasetError}.`
                  : 'Loading the reference tables…'}
              </p>
            )}
            {chartFor(selectedChartTable).map((entry, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-theme-surface border border-theme-border rounded-md space-y-1 font-mono text-xs hover:border-theme-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-theme-primary font-gothic text-sm">{entry.title}</span>
                    {/* No separate reward badge: the derived rows keep the
                        reward inside the rules text, because that is where the
                        book puts it — "Sell (Any Warband): Add 30 👑 to your
                        Strongbox" is a number in a sentence. */}
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-theme-base text-theme-primary font-bold text-xs sm:text-[11px] border border-theme-border">
                    Roll {entry.roll}
                  </span>
                </div>
                <p className="text-theme-text text-xs sm:text-[11px] leading-relaxed pt-1">
                  {entry.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: WEAPONS CODEX (CLICKABLE FOR OFFICIAL LORE) */}
      {activeTab === 'weapons' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-theme-muted">
            Click any weapon card to inspect its complete official profile, faction exclusivity, and rulebook lore excerpt:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWeapons.map((wep) => (
              <div
                key={wep.key}
                onClick={() => setSelectedWargearItem(wep)}
                className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2.5 bevel-container hover:border-theme-primary cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
              >
                <div>
                  <div className="border-b border-theme-border pb-2">
                    <span className="font-gothic font-bold text-base text-theme-text block">{wep.name}</span>
                    <span className="text-xs sm:text-[11px] font-mono text-theme-muted">
                      {stockedLabel(wep)}
                      {offersDiffer(wep) && <span className="text-status-warning"> · prices differ</span>}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs sm:text-[11px] font-mono text-theme-muted pt-2">
                    <div>Type: <strong className="text-theme-text">{wep.type ?? '—'}</strong></div>
                    <div>Range: <strong className="text-theme-text">{wep.range ?? '—'}</strong></div>
                  </div>

                  {wep.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {wep.keywords.map((k) => (
                        <span key={k} className="text-xs sm:text-[9px] font-mono px-1.5 py-0.2 rounded bg-theme-elevated text-theme-primary border border-theme-primary/20 font-bold">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {wep.description && (
                    <p className="text-xs sm:text-[11px] font-mono text-theme-muted line-clamp-2 pt-2 italic">
                      &quot;{wep.description}&quot;
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between text-xs sm:text-[10px] font-mono text-theme-primary">
                  <span>Click to inspect full dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ARMOUR & GEAR CODEX (CLICKABLE FOR OFFICIAL LORE) */}
      {activeTab === 'armour' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-theme-muted">
            Click any armour or gear card to inspect full official protection mechanics, faction exclusivity, and lore:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArmour.map((arm) => (
              <div
                key={arm.key}
                onClick={() => setSelectedWargearItem(arm)}
                className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2.5 bevel-container hover:border-theme-primary cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
              >
                <div>
                  <div className="border-b border-theme-border pb-2">
                    <span className="font-gothic font-bold text-base text-theme-text block">{arm.name}</span>
                    <span className="text-xs sm:text-[11px] font-mono text-theme-muted">
                      {arm.section} · {stockedLabel(arm)}
                      {offersDiffer(arm) && <span className="text-status-warning"> · prices differ</span>}
                    </span>
                  </div>

                  {arm.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {arm.keywords.map((k) => (
                        <span key={k} className="text-xs sm:text-[9px] font-mono px-1.5 py-0.2 rounded bg-theme-elevated text-theme-primary border border-theme-primary/20 font-bold">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {arm.description && (
                    <p className="text-xs sm:text-[11px] font-mono text-theme-muted line-clamp-2 pt-2 italic">
                      &quot;{arm.description}&quot;
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between text-xs sm:text-[10px] font-mono text-theme-primary">
                  <span>Click to inspect full dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: MISSION GENERATOR */}
      {/*
        TAB: PATRONS.

        A Patron decides exactly one thing and decides it often — both ends of
        every 2D6 Skill Table are a `Patron Skill` result — and until now the
        app had no Patron data at all: `warband.patron` was free text, so a
        player who rolled one had nothing to look up.
      */}
      {activeTab === 'patrons' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-theme-muted leading-relaxed">
            Pick a Patron for your Warband at the start of a campaign. When a Skill Table
            rolls a <strong className="text-theme-text">Patron Skill</strong>, you take one of
            its six.
          </p>

          {patrons.length === 0 && (
            <p className="text-xs font-mono text-status-error leading-relaxed">
              {codexDatasetError
                ? `The Patron list could not be loaded: ${codexDatasetError}.`
                : 'Loading the Patron list…'}
            </p>
          )}

          {patrons.map((p) => {
            const open = expandedPatronId === p.id;
            return (
              <div
                key={p.id}
                className="bg-theme-surface border border-theme-border rounded-md overflow-hidden"
              >
                <button
                  onClick={() => setExpandedPatronId(open ? null : p.id)}
                  className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-theme-elevated transition-colors"
                >
                  <div className="min-w-0">
                    <span className="font-gothic font-bold text-sm text-theme-primary block truncate">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-mono text-theme-muted block truncate">
                      {p.restriction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Which book prints it. Both books number their Patrons
                        from nothing, and a player at a table needs to know
                        which one to open. */}
                    {p.source === 'carcass-front' && (
                      <span className="px-2 py-0.5 rounded bg-theme-base text-theme-primary font-mono text-[10px] font-bold border border-theme-border">
                        CF
                      </span>
                    )}
                    {open
                      ? <ChevronUp className="w-4 h-4 text-theme-muted" />
                      : <ChevronDown className="w-4 h-4 text-theme-muted" />}
                  </div>
                </button>

                {open && (
                  <div className="px-3.5 pb-3.5 space-y-3 border-t border-theme-border pt-3">
                    <p className="text-xs text-theme-text leading-relaxed">{p.lore}</p>

                    <div className="space-y-2">
                      {p.skills.map((sk) => (
                        <div
                          key={sk.name}
                          className="p-3 bg-theme-base rounded border border-theme-border space-y-1"
                        >
                          <span className="font-gothic font-bold text-xs text-theme-primary block">
                            {sk.name}
                          </span>
                          <p className="text-[11px] font-mono text-theme-text leading-relaxed">
                            {sk.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/*
                      Game data a Skill introduces that is not itself a Skill.
                      One entry in eleven Patrons: the House of Wisdom's
                      `Whispering Zīj` unlocks a Zīj Seal Alchemical Formulae,
                      whose rules the book prints among the Skills. Shown apart
                      so the entry has the six Skills it actually has, and
                      shown at all because it is a thing a player can buy.
                    */}
                    {p.introduces.map((item) => (
                      <div
                        key={item.name}
                        className="p-3 bg-theme-base rounded border border-theme-accent/50 space-y-1"
                      >
                        <span className="font-gothic font-bold text-xs text-theme-accent block">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wide text-theme-muted block">
                          {item.kind} — unlocked by {item.unlockedBy}
                        </span>
                        <p className="text-[11px] font-mono text-theme-text leading-relaxed pt-0.5">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/*
        TAB: CAMPAIGNS. The Carcass Front map campaign and the Path to
        Leviathan, with the Camp buildings, the Tracker rewards and the sixteen
        Vision cards that go with them.
      */}
      {activeTab === 'campaigns' && (
        <CampaignsView
          campaigns={campaigns}
          visionCards={visionCards}
          map={carcassFrontMap}
          error={codexDatasetError}
        />
      )}

      {/* TAB: THE OFFICIAL RULES COMMENTARIES */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="bg-theme-surface border border-theme-border rounded-md p-4 bevel-container">
            <h2 className="font-gothic font-bold text-lg text-theme-primary">Rules Commentaries 1.0.2</h2>
            <p className="text-xs font-mono text-theme-muted mt-1.5 leading-relaxed">
              The game’s official answers to questions players actually asked, carried
              verbatim. Each entry keeps its own reference — <span className="text-theme-text">RULES Q1</span>,
              {' '}<span className="text-theme-text">MISC. Q7</span> — so you can quote it across a table.
            </p>
          </div>

          {commentaries.length === 0 && (
            /* Says which, rather than rendering an empty page. This ruleset has
               no commentaries; that is not the same as failing to read them. */
            <p className="text-xs font-mono text-theme-muted">
              This ruleset carries no Rules Commentaries.
            </p>
          )}

          {commentaries.length > 0 && filteredCommentaries.length === 0 && (
            <p className="text-xs font-mono text-theme-muted">
              No commentary matches “{searchQuery}”.
            </p>
          )}

          {commentarySections.map((section) => (
            <div key={section} className="space-y-3">
              <h3 className="font-gothic font-bold text-base text-theme-text border-b border-theme-border pb-1.5">
                {section}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredCommentaries.filter((c) => c.section === section).map((c) => (
                  <div
                    key={c.id}
                    className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2 bevel-container"
                  >
                    <span className="inline-block text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated text-theme-muted uppercase">
                      {c.label}
                    </span>
                    <p className="text-xs font-mono font-bold text-theme-text leading-relaxed">
                      {c.question}
                    </p>
                    {/* The answer is what the reader came for, so it is the one
                        thing here in the body colour rather than the muted one. */}
                    <p className="text-xs font-mono text-theme-text leading-relaxed border-l-2 border-theme-primary/60 pl-3">
                      {c.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'generator' && <MissionGenerator />}

      {/* WARGEAR INSPECTOR */}
      <Sheet
        open={Boolean(selectedWargearItem)}
        onClose={() => setSelectedWargearItem(null)}
        size="lg"
        title={selectedWargearItem?.name}
        subtitle={selectedWargearItem
          ? `${selectedWargearItem.section} · ${stockedLabel(selectedWargearItem)}`
          : undefined}
      >
        {selectedWargearItem && (
          <div className="space-y-4 font-mono text-sm">

            <div className="grid grid-cols-2 gap-3 p-3 bg-theme-base border border-theme-border rounded-md text-center">
              <div>
                <span className="text-xs text-theme-muted uppercase block">Type</span>
                <strong className="text-theme-text">{selectedWargearItem.type ?? '—'}</strong>
              </div>
              <div>
                <span className="text-xs text-theme-muted uppercase block">Range</span>
                <strong className="text-theme-text">{selectedWargearItem.range ?? '—'}</strong>
              </div>
            </div>

            {/*
              Price per faction, not one number.

              This is the whole reason the hand-written arsenal had to go: it
              carried `cost: 40` for the Automatic Rifle, which is what New
              Antioch and the Trench Pilgrims pay. The Heretic Legions pay 2
              Glory for it, with a different limit. There is no single price to
              show, so the Codex shows the table.
            */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-bold text-theme-muted block">
                Armoury Tables
              </span>
              {selectedWargearItem.offers.length === 0 ? (
                <p className="text-theme-muted">
                  No faction Armoury Table stocks this. It is printed in the
                  rulebook&apos;s Battlekit chapter, so the rules are here, but no
                  warband can buy it from a faction list.
                </p>
              ) : (
                <ul className="divide-y divide-theme-border border border-theme-border rounded">
                  {selectedWargearItem.offers.map((o) => (
                    <li key={o.factionId} className="flex items-baseline justify-between gap-3 px-3 py-2">
                      <span className="text-theme-text min-w-0">
                        {o.faction}
                        {o.restrictions.length > 0 && (
                          <span className="block text-xs text-theme-muted">
                            {o.restrictions.join(' · ')}
                          </span>
                        )}
                      </span>
                      <strong className="text-theme-primary flex-shrink-0">{priceLabel(o.cost)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedWargearItem.keywords.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-theme-muted block">Keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWargearItem.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-1 bg-theme-elevated text-theme-primary border border-theme-primary/30 rounded text-xs font-bold"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedWargearItem.note && (
              <p className="p-3 bg-theme-base border border-theme-border rounded text-theme-text leading-relaxed">
                {selectedWargearItem.note}
              </p>
            )}

            {selectedWargearItem.rules.map((rule) => (
              <div key={rule} className="p-3 bg-theme-base border border-theme-border rounded">
                <p className="text-theme-text leading-relaxed">{rule}</p>
              </div>
            ))}

            {selectedWargearItem.description ? (
              <div className="p-4 bg-theme-base border border-theme-primary/40 rounded-md space-y-1.5">
                <span className="text-xs uppercase font-bold text-theme-primary flex items-center gap-1.5">
                  <Scroll className="w-3.5 h-3.5" />
                  <span>From the rulebook</span>
                </span>
                <p className="text-theme-text leading-relaxed italic">
                  &quot;{selectedWargearItem.description}&quot;
                </p>
              </div>
            ) : (
              <p className="text-xs text-theme-muted">
                Described in Warbands of Trench Crusade rather than the Battlekit
                chapter, which is what this view reads. Its price and
                restrictions above are from the Armoury Table and are complete.
              </p>
            )}

          </div>
        )}
      </Sheet>

      {/* Success Roll odds — what +/- DICE does to the distribution. */}
      {isProbabilityOpen && (
        <DiceProbabilityModal onClose={() => setIsProbabilityOpen(false)} />
      )}

      {/* Fullscreen Scenario Map Lightbox Modal */}
      {lightboxMap && (
        <div ref={lightboxRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-4xl max-h-[95dvh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
            {/* Header */}
            <div className="p-4 bg-theme-base border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-theme-primary" />
                <div>
                  <h3 className="font-gothic font-bold text-lg text-theme-text">
                    OFFICIAL DEPLOYMENT DIAGRAM: {lightboxMap.name}
                  </h3>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">
                    Table Size: {lightboxMap.tableSize || '48" x 48"'} • Official Rulebook Diagram
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLightboxMap(null)}
                className="px-3 py-1 bg-theme-elevated hover:bg-theme-border text-theme-text rounded font-bold uppercase text-xs border border-theme-border"
              >
                ✕ Close
              </button>
            </div>

            {/* Body: High-Res Map */}
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-theme-base/80">
              <img
                src={lightboxMap.src}
                alt={`${lightboxMap.name} Official Tactical Map`}
                className="max-w-full max-h-[75dvh] object-contain rounded shadow-2xl border border-theme-border"
              />
            </div>

            {/* Footer */}
            <div className="p-3 bg-theme-surface border-t border-theme-border flex items-center justify-between text-xs text-theme-muted">
              <span>Official Rulebook Scenario Diagram</span>
              <button
                onClick={() => setLightboxMap(null)}
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
