/**
 * Seed data: the default campaign map, a fresh campaign, and the example
 * warband a first-run install starts with.
 *
 * Presentation and demo content, not game data — the theatres are the app's own
 * map of the setting and the example warband is there so a new install is not
 * an empty screen. Nothing here is a statline, a cost or a rule; those come
 * from the pipeline.
 */
import { create } from 'zustand';
import { Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment, StashedItem, WarbandSnapshot, UnitTitleRecord } from '../types/warband';
import { Campaign, MatchRecord, CasualtyRecord, CampaignMember, TerritoryNode } from '../types/campaign';
import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, Faction, RuleKeyword, Scenario, UnitCategory, RulesetVersion } from '../types/rules';
import { RuleDiffItem } from '../types/diff';
import { FACTIONS } from '../data/defaultRules';
import type { Dataset } from '../types/catalogue';
import { recruitable, type DroppedDetail } from '../rules/recruitable';
import { enrichUnitWithLore, SULTANATE_WARBAND_LORE, SULTANATE_MATCH_HISTORY, SULTANATE_WARBAND_SNAPSHOTS } from '../data/warbandLore';
import { storage } from '../services/storage';

export const DEFAULT_WORLD_THEATERS: TerritoryNode[] = [
  {
    id: 'th-iron-wall',
    name: 'The Great Iron Wall & New Antioch',
    type: 'Strategic Bastion',
    region: 'Levant Front',
    x: 82.5,
    y: 77.0,
    perk: '+15 Ducats & +1 Alchemical Formula discount per match',
    description: 'The monumental 800-year-old alchemically reinforced wall holding back the demonic incursions of the Jerusalem Hell Breach.'
  },
  {
    id: 'th-jerusalem-gates',
    name: 'The Gates of Hell & Jerusalem',
    type: 'Infernal Breach',
    region: 'The Holy Land',
    x: 79.5,
    y: 83.5,
    perk: '+2 Glory on Victory; -1 Morale check penalty for opposing forces',
    description: 'Epicenter of the Ultimate Heresy where mortal earth and Hell collide in volcanic brimstone and madness.'
  },
  {
    id: 'th-baghdad-alamut',
    name: 'Baghdad & Alamut (House of Wisdom)',
    type: 'Alchemical Citadel',
    region: 'Iron Sultanate',
    x: 89.0,
    y: 74.0,
    perk: 'Free Alchemical Reagents & +10 Ducats exploration bonus',
    description: 'Seat of golden alchemical science, where master alchemists forge living brass golems and naphtha flamethrowers.'
  },
  {
    id: 'th-kyiv-steppes',
    name: 'Principality of Kyiv & Cossack Steppes',
    type: 'Frontier Steppes',
    region: 'Rus Frontier',
    x: 69.0,
    y: 46.0,
    perk: 'Reroll 1 failed Initiative roll per battle',
    description: 'Snow-dusted trenches and rolling steppes defended by fierce Cossacks against barbarian and demon hordes.'
  },
  {
    id: 'th-novgorod-finland',
    name: 'Tzardom of Novgorod & Finland',
    type: 'Boreal Bastion',
    region: 'Northern Frontier',
    x: 71.0,
    y: 22.0,
    perk: '+1 Armour Characteristic on Turn 1 from hardened winter fortifications',
    description: 'Frozen tundras and iron cathedral-citadels standing vigil against abominations from the Arctic deeps.'
  },
  {
    id: 'th-holy-roman-empire',
    name: 'Holy Roman Empire & Aachen',
    type: 'Cathedral City',
    region: 'Central Europe',
    x: 46.0,
    y: 46.0,
    perk: 'Free Reinforced Armour upgrade in Warband Stash after battle',
    description: 'Heartland of Church industry and knightly orders, churning out heavy machine plate and blessed ammunition.'
  },
  {
    id: 'th-britannia',
    name: 'Insulae Britannorum & England',
    type: 'Fortress Island',
    region: 'Britannic Sector',
    x: 32.0,
    y: 36.0,
    perk: '+10 Ducats supply income & +1 Ranged DICE on defensive turns',
    description: 'Moated island redoubt guarded by massive dreadnought fleets and razor-wire shoreline trenches.'
  },
  {
    id: 'th-hungary-danube',
    name: 'Kingdom of Hungary & Balkans Breach',
    type: 'Contested Trench Line',
    region: 'Danubian Sector',
    x: 57.0,
    y: 55.0,
    perk: 'Ignore first casualty in post-battle Trauma phase (Full Recovery)',
    description: 'Grisly mountain passes and fortified river crossings resisting incursions from the Cult of the Black Grail.'
  },
  {
    id: 'th-rome-sancta-sedis',
    name: 'Papal Gates & Rome (Sancta Sedis)',
    type: 'Holy Sanctuary',
    region: 'Italian Peninsula',
    x: 45.0,
    y: 69.0,
    perk: 'Warband starts each match with 1 permanent Blessing Marker',
    description: 'Sacred throne of the Supreme Pontiff, defended by walking Anchorite shrines and zealot crusaders.'
  },
  {
    id: 'th-numidia-marruecos',
    name: 'Kingdom of Numidia & Marruecos',
    type: 'Desert Redoubt',
    region: 'North African Bulwark',
    x: 18.0,
    y: 81.0,
    perk: '+1" Movement Characteristic across difficult or open ground',
    description: 'Sun-scorched fortresses and nomadic warriors guarding the southern flank from demonic desert horrors.'
  },
  {
    id: 'th-domain-mammon',
    name: 'Domain of Mammon & Ekron',
    type: 'Demonic Waste',
    region: 'Southern Infernal Sector',
    x: 73.0,
    y: 92.0,
    perk: '+25 Ducats loot bounty upon winning a match in this theater',
    description: 'Avarice-choked salt plains and demonic refineries guarded by Heretic Shocktroopers and brass fiends.'
  },
  {
    id: 'th-mecca-sanctuary',
    name: 'Mecca (Sanctuary of the Prophet)',
    type: 'Divine Citadel',
    region: 'Arabian Heartland',
    x: 94.0,
    y: 90.0,
    perk: '+1 Glory Point & +1 Reroll on Morale Checks',
    description: 'Inviolable holy sanctuary protected by miraculous alchemical storms and elite Janissary cohorts.'
  }
];

// Clean Default Campaign
export const defaultFreshCampaign: Campaign = {
  id: 'camp-default',
  name: 'Crusade for the Lands of the Great Powers',
  inviteCode: 'TRENCH-1099',
  adminName: 'Commander',
  status: 'active',
  currentTurn: 1,
  maxWarbandDucats: 700,
  gloryVictoryThreshold: 25,
  members: [],
  territories: DEFAULT_WORLD_THEATERS,
  matches: SULTANATE_MATCH_HISTORY,
  chronicleLogs: []
};

export const defaultSultanateWarband: Warband = {
  id: 'wb-al-qarn-rihla',
  name: 'Al-Qarn Rihla',
  factionId: 'iron-sultanate',
  ducatLimit: 1220,
  treasuryDucats: 220,
  gloryPoints: 4,
  lore: SULTANATE_WARBAND_LORE.lore,
  motto: SULTANATE_WARBAND_LORE.motto,
  patron: SULTANATE_WARBAND_LORE.patron,
  chronicleLog: SULTANATE_WARBAND_LORE.chronicleLog,
  snapshots: SULTANATE_WARBAND_SNAPSHOTS,
  units: SULTANATE_WARBAND_SNAPSHOTS[2].units,
  armoryStash: [],
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: new Date().toISOString()
};
