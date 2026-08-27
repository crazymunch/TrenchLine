import { RulesetVersion } from '../../types/rules';

export interface RulesetMetadata {
  version: RulesetVersion;
  name: string;
  releaseDate: string;
  tagline: string;
  summary: string;
  keyChanges: string[];
}

export const RULESET_1_0_META: RulesetMetadata = {
  version: '1.0',
  name: 'Trench Crusade 1.0 (Core Rulebook Baseline)',
  releaseDate: 'Initial Core Launch',
  tagline: 'The original foundational rulebook ruleset.',
  summary: 'Standard 1.0 rules as published in the original Trench Crusade rulebook before digital errata.',
  keyChanges: [
    'Original Bloodbath conversion mechanic.',
    'Original Movement & Retreat actions without 1.0.2 restrictions.',
    'Base wargear profiles and faction limits prior to 1.0.2 adjustments.'
  ]
};

export const RULESET_1_0_2_META: RulesetMetadata = {
  version: '1.0.2',
  name: 'Trench Crusade 1.0.2 (Official Digital Errata)',
  releaseDate: 'August 2026 Official Errata',
  tagline: 'Comprehensive balance updates, keyword standardization, and faction balancing.',
  summary: 'The official updated ruleset incorporating the 15-page Digital Rulebook Updates & Warbands Changelog.',
  keyChanges: [
    'Actions: Move cannot enter within 1" of enemy (Charge required). Retreat grants enemy 1 single attack with Cleave.',
    'Bloodbath: Costs 6 Blood Markers (3 if target is Down) to roll 3D6 take 3 highest (4D6 if Deadly).',
    'Armour Piercing: Reduces target\'s total -Injury Modifier from Armour and Shields by 1 (to minimum 0).',
    'Strong Keyword: Allows equipping & using one 2-Handed Melee Weapon as 1-Handed.',
    'New Keywords: CLEAVE (X), DEADLY, DEPLOYABLE, DANGEROUS TERRAIN, DIFFICULT TERRAIN, FLYING, IMPASSABLE TERRAIN, MINED, REGENERATE (X), SCATTER, SKIRMISHER.',
    'Ammunition Battlekit: Standardized AP Bullets, Dum-Dum, Incendiary, and Tracer rounds under AMMUNITION (KEYWORD).',
    'Warbands: Combat Engineer & Sapper get NEGATE MINED, Set Mine, and Defuse Mine; Sultanate Assassin gains Temporal Assassin & Time Slip; Papal States 500 D + 11 Glory; Tank-Splitter Sword turns 1 dice to 6 against armour.'
  ]
};

export const RULESET_1_0_2TD_META: RulesetMetadata = {
  version: '1.0.2TD',
  name: 'Trench Crusade 1.0.2TD (Trench Dispatch Preview)',
  releaseDate: 'Trench Dispatch Developer Updates',
  tagline: 'Latest preview rules, experimental wargear, and tournament trial adjustments.',
  summary: '1.0.2 core rules enhanced with the upcoming Trench Dispatch developer rules and tournament trials.',
  keyChanges: [
    'All official 1.0.2 errata and keyword definitions.',
    'Trench Dispatch experimental wargear and upcoming tournament tuning.',
    'Enhanced All Out War multiplayer scenario integration (3 to 8 players).'
  ]
};

export const AVAILABLE_RULESETS: Record<RulesetVersion, RulesetMetadata> = {
  '1.0': RULESET_1_0_META,
  '1.0.2': RULESET_1_0_2_META,
  '1.0.2TD': RULESET_1_0_2TD_META
};
