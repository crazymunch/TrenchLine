import type { LedgerEntry } from '@/rules/campaign';

import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem } from './rules';

export interface EquippedWeapon extends WeaponProfile {
  instanceId: string;
}

export interface EquippedArmour extends ArmourProfile {
  instanceId: string;
}

export interface EquippedEquipment extends EquipmentItem {
  instanceId: string;
}

export interface UnitTitleRecord {
  title: string;
  source: 'user' | 'injury' | 'exploration' | 'deed';
  origin?: string;
  active: boolean;
}

export interface ActiveUnit {
  id: string;
  customName: string;
  baseProfileId: string;
  profileSnapshot: UnitProfile;
  equippedWeapons: EquippedWeapon[];
  equippedArmour: EquippedArmour[];
  equippedEquipment: EquippedEquipment[];
  
  // Progression & Campaign
  xp: number;
  isElite?: boolean;
  advancements: string[];
  skills?: { name: string; category: string; roll?: string; effect?: string }[];
  injuries: string[];
  scars?: { name: string; roll?: string; effect?: string }[];
  isDead: boolean;
  totalCost: number; // calculated ducats

  // Special Faction Rules & Fireteams
  fireteam?: string;
  specialUpgrades?: { id: string; name: string; cost: number; category: string }[];

  // Narrative Lore & Chronicle
  lore?: string;
  titles?: string[];
  titleRecords?: UnitTitleRecord[];
  deeds?: string[];
  quote?: string;

  // Tabletop Play Mode transient state
  currentWounds: number;
  maxWounds: number;
  bloodMarkers: number;
  status: 'Active' | 'Downed' | 'Out of Action';
  hasActedThisTurn: boolean;
  notes?: string;
}

export interface StashedItem {
  id: string;
  name: string;
  type: 'Weapon' | 'Armour' | 'Equipment';
  cost: number;
  quantity: number;
}

export type StashItem = StashedItem;

export interface WarbandSnapshot {
  id: string;
  timestamp: string;
  label: string; // e.g. "Founding Muster", "Post-Battle 1: Victory vs Sorcerer Zortan"
  type: 'founding' | 'post_battle' | 'recruitment' | 'equipment' | 'manual';
  matchId?: string;
  scenarioName?: string;
  outcome?: 'Victory' | 'Defeat' | 'Draw';
  ducatCost: number;
  treasuryDucats: number;
  gloryPoints: number;
  unitCount: number;
  units: ActiveUnit[];
  armoryStash: StashedItem[];
  changesSummary: string[]; // Specific diff bullet points
  notes?: string;
}

export interface Warband {
  id: string;
  name: string;
  factionId: string;
  /**
   * The Warband Variant, e.g. 'the-house-of-wisdom'. Seventeen exist and the
   * app previously had no field for one at all, so every variant rule went
   * unenforced. See docs/RULESET-MODEL.md §7a.
   */
  variantId?: string;
  campaignId?: string;
  creatorId?: string;
  creatorName?: string;
  /**
   * How this warband's budget is governed.
   *
   *   'campaign'     — the published economy. Starts on the book's 700 Ducats
   *                    and 0 Glory, and the per-game cap comes from the Warband
   *                    Threshold Table rather than from a field anyone edits.
   *   'unrestricted' — the player sets Ducats and Glory. For one-off games,
   *                    imports, and testing a list.
   *
   * Either kind may join a campaign, so this records how the warband was
   * founded, not whether it is allowed in.
   */
  forceMode?: 'campaign' | 'unrestricted';
  /**
   * Every movement of Ducats and Glory, with a reason. The Strongbox is the sum
   * of this rather than a stored total, so a purchase can be reversed before the
   * next game and an admin's catch-up allotment says who granted it.
   */
  ledger?: LedgerEntry[];
  /**
   * Only meaningful for 'unrestricted'. A campaign warband's cap is derived, and
   * this is ignored — kept because existing saved warbands carry it.
   */
  ducatLimit: number;
  treasuryDucats: number;
  gloryPoints: number;
  units: ActiveUnit[];
  armoryStash: StashedItem[];
  
  // Narrative & House Lore
  lore?: string;
  motto?: string;
  patron?: string;
  chronicleLog?: string[];
  notes?: string;

  // Growth Changelog & History
  snapshots?: WarbandSnapshot[];

  createdAt: string;
  updatedAt: string;
}

