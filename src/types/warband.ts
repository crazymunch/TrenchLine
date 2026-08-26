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
  advancements: string[];
  injuries: string[];
  isDead: boolean;
  totalCost: number; // calculated ducats

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

export interface Warband {
  id: string;
  name: string;
  factionId: string;
  campaignId?: string;
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

  createdAt: string;
  updatedAt: string;
}
