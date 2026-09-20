/**
 * Seed data: the default campaign map, a fresh campaign, and the example
 * warband a first-run install starts with.
 *
 * Presentation and demo content, not game data — the theatres are the app's own
 * map of the setting. Nothing here is a statline, a cost or a rule; those come
 * from the pipeline.
 *
 * Every `perk` is EMPTY, and that is the point. Each carried an invented
 * mechanical effect — `+15 Ducats & +1 Alchemical Formula discount per match`,
 * `+1 Armour Characteristic on Turn 1`, `Reroll 1 failed Initiative roll per
 * battle` — presented in the campaign hub as a "Strategic Territory Perk",
 * beside rules the pipeline derives and with nothing to tell a player which
 * was which. No published rule attaches any effect to holding one of these
 * theatres, because these theatres are the app's own; the ones the game does
 * publish are the Carcass Front Special Zone Outpost Bonuses, which are
 * derived and in the Codex.
 *
 * Empty rather than removed: `TerritoryNode.perk` is a required column, and a
 * campaign's organiser agreeing a house rule for a theatre is a real thing to
 * want. What is not allowed is the app writing one and not saying so.
 */
import { Warband } from '../types/warband';
import { Campaign, TerritoryNode } from '../types/campaign';
import { SULTANATE_WARBAND_LORE, SULTANATE_WARBAND_SNAPSHOTS } from '../data/warbandLore';

export const DEFAULT_WORLD_THEATERS: TerritoryNode[] = [
  {
    id: 'th-iron-wall',
    name: 'The Great Iron Wall & New Antioch',
    type: 'Strategic Bastion',
    region: 'Levant Front',
    x: 82.5,
    y: 77.0,
    perk: '',
    description: 'The monumental 800-year-old alchemically reinforced wall holding back the demonic incursions of the Jerusalem Hell Breach.'
  },
  {
    id: 'th-jerusalem-gates',
    name: 'The Gates of Hell & Jerusalem',
    type: 'Infernal Breach',
    region: 'The Holy Land',
    x: 79.5,
    y: 83.5,
    perk: '',
    description: 'Epicenter of the Ultimate Heresy where mortal earth and Hell collide in volcanic brimstone and madness.'
  },
  {
    id: 'th-baghdad-alamut',
    name: 'Baghdad & Alamut (House of Wisdom)',
    type: 'Alchemical Citadel',
    region: 'Iron Sultanate',
    x: 89.0,
    y: 74.0,
    perk: '',
    description: 'Seat of golden alchemical science, where master alchemists forge living brass golems and naphtha flamethrowers.'
  },
  {
    id: 'th-kyiv-steppes',
    name: 'Principality of Kyiv & Cossack Steppes',
    type: 'Frontier Steppes',
    region: 'Rus Frontier',
    x: 69.0,
    y: 46.0,
    perk: '',
    description: 'Snow-dusted trenches and rolling steppes defended by fierce Cossacks against barbarian and demon hordes.'
  },
  {
    id: 'th-novgorod-finland',
    name: 'Tzardom of Novgorod & Finland',
    type: 'Boreal Bastion',
    region: 'Northern Frontier',
    x: 71.0,
    y: 22.0,
    perk: '',
    description: 'Frozen tundras and iron cathedral-citadels standing vigil against abominations from the Arctic deeps.'
  },
  {
    id: 'th-holy-roman-empire',
    name: 'Holy Roman Empire & Aachen',
    type: 'Cathedral City',
    region: 'Central Europe',
    x: 46.0,
    y: 46.0,
    perk: '',
    description: 'Heartland of Church industry and knightly orders, churning out heavy machine plate and blessed ammunition.'
  },
  {
    id: 'th-britannia',
    name: 'Insulae Britannorum & England',
    type: 'Fortress Island',
    region: 'Britannic Sector',
    x: 32.0,
    y: 36.0,
    perk: '',
    description: 'Moated island redoubt guarded by massive dreadnought fleets and razor-wire shoreline trenches.'
  },
  {
    id: 'th-hungary-danube',
    name: 'Kingdom of Hungary & Balkans Breach',
    type: 'Contested Trench Line',
    region: 'Danubian Sector',
    x: 57.0,
    y: 55.0,
    perk: '',
    description: 'Grisly mountain passes and fortified river crossings resisting incursions from the Cult of the Black Grail.'
  },
  {
    id: 'th-rome-sancta-sedis',
    name: 'Papal Gates & Rome (Sancta Sedis)',
    type: 'Holy Sanctuary',
    region: 'Italian Peninsula',
    x: 45.0,
    y: 69.0,
    perk: '',
    description: 'Sacred throne of the Supreme Pontiff, defended by walking Anchorite shrines and zealot crusaders.'
  },
  {
    id: 'th-numidia-marruecos',
    name: 'Kingdom of Numidia & Marruecos',
    type: 'Desert Redoubt',
    region: 'North African Bulwark',
    x: 18.0,
    y: 81.0,
    perk: '',
    description: 'Sun-scorched fortresses and nomadic warriors guarding the southern flank from demonic desert horrors.'
  },
  {
    id: 'th-domain-mammon',
    name: 'Domain of Mammon & Ekron',
    type: 'Demonic Waste',
    region: 'Southern Infernal Sector',
    x: 73.0,
    y: 92.0,
    perk: '',
    description: 'Avarice-choked salt plains and demonic refineries guarded by Heretic Shocktroopers and brass fiends.'
  },
  {
    id: 'th-mecca-sanctuary',
    name: 'Mecca (Sanctuary of the Prophet)',
    type: 'Divine Citadel',
    region: 'Arabian Heartland',
    x: 94.0,
    y: 90.0,
    perk: '',
    description: 'Inviolable holy sanctuary protected by miraculous alchemical storms and elite Janissary cohorts.'
  }
];

/**
 * No campaign.
 *
 * This was `defaultFreshCampaign`, and it was every new device's campaign: a
 * crusade named "Crusade for the Lands of the Great Powers", invite code
 * `TRENCH-1099`, admin "Commander", already on Turn 1 and seated on all twelve
 * world theatres. A player who had never made a campaign was shown one, with a
 * copy button beside an invite code that no server had ever issued and nobody
 * could join.
 *
 * A fresh device has no campaign, and the hub says so and offers the two
 * things that make one: create, or join with a code. The shape stays a
 * `Campaign` rather than `null` because every campaign surface reads it
 * synchronously; `hasCampaign` is how they tell the two apart, and it keys on
 * `id` because a real campaign always has one — `camp-<timestamp>` minted
 * locally by `createCampaign`, or the server's uuid once published.
 *
 * A function, not a constant: a shared object one view mutates is a bug that
 * only shows up on the second campaign.
 */
export function emptyCampaign(): Campaign {
  return {
    id: '',
    name: '',
    inviteCode: '',
    adminName: '',
    status: 'active',
    currentTurn: 1,
    maxWarbandDucats: 700,
    gloryVictoryThreshold: 25,
    members: [],
    territories: [],
    // No matches. A fresh campaign has not been played yet, and filling it with
    // one player's battle record made every new campaign open on someone else's
    // history.
    matches: [],
    chronicleLogs: []
  };
}

/** Whether this is a campaign at all, or the placeholder above. */
export function hasCampaign(campaign: Campaign | null | undefined): boolean {
  return Boolean(campaign?.id);
}

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
