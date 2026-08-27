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
  campaignId?: string;
  creatorId?: string;
  creatorName?: string;
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

