/**
 * The two campaign frameworks, and the Carcass Front map as territories.
 *
 * The app has always had a campaign: a map of the setting, a Glory-point
 * victory threshold and a match log, all of it the app's own. Carcass Front
 * publishes a complete campaign of its own — 32 zones with Resources, Camp
 * buildings, a Campaign Tracker, Vision cards and Shared Objectives — and it
 * is a different game, not a variation on the first.
 *
 * So it is a CHOICE MADE AT CREATION and never afterwards. The two do not
 * agree on what a territory is, what a turn is or how the campaign is won, and
 * switching mid-campaign would leave every game already recorded meaning
 * something other than what it meant when it was played.
 */
import type { CampaignFramework, TerritoryNode } from '@/types/campaign';
import type { CarcassFrontMap } from '@/types/catalogue';

export interface FrameworkOption {
  id: CampaignFramework;
  name: string;
  /** One line, on the picker. */
  summary: string;
  /** What a player gets, stated as facts about the campaign rather than sold. */
  detail: string;
}

export const FRAMEWORKS: FrameworkOption[] = [
  {
    id: 'classic',
    name: 'Crusade Campaign',
    summary: 'This app’s own: a world map, a Glory threshold, and a match log.',
    detail:
      'Twelve theatres pinned on the world map, claimed by whoever holds them. '
      + 'The first Warband to reach the Glory total you set wins. No published '
      + 'rule attaches an effect to holding a theatre — any bonus is one your '
      + 'campaign agrees.',
  },
  {
    id: 'carcass-front',
    name: 'The Carcass Front Campaign',
    summary: 'The published campaign: 32 zones, Resources, a Camp and the Tracker.',
    detail:
      'The campaign printed in Carcass Front. Thirty-two zones, each offering '
      + 'Favour, Relics, Supplies or Territories and each with the scenario '
      + 'played there; ten of them confer a published Outpost Bonus. Camp '
      + 'buildings, the Campaign Tracker, the Vision cards and the Shared '
      + 'Objectives are in the Codex under Campaigns. The zone BOARD — which '
      + 'zone borders which — is printed on the fold-out map in the box and is '
      + 'not in the app, so supply lines and adjacency are read off the sheet.',
  },
];

export const frameworkOf = (c: { framework?: CampaignFramework } | null | undefined)
  : CampaignFramework => c?.framework ?? 'classic';

export const frameworkNamed = (id: CampaignFramework): FrameworkOption =>
  FRAMEWORKS.find((f) => f.id === id) ?? FRAMEWORKS[0];

/**
 * The Carcass Front zones, as the campaign hub's territories.
 *
 * Everything here is read off `dataset.carcassFrontMap`, which is parsed from
 * the fold-out map's own tables. Nothing is written: a zone's Resources, the
 * scenario played there and — for the ten Special Zones — the Outpost Bonus a
 * Warband holding it receives are all printed.
 *
 * No `x`/`y`. The zone board is a graphic on the printed sheet and the app
 * does not have it, so there is nowhere honest to put a pin; the territory
 * view falls back to its list for a Carcass Front campaign rather than
 * scattering thirty-two markers over a map of Europe.
 */
export function carcassFrontTerritories(map: CarcassFrontMap | undefined): TerritoryNode[] {
  if (!map?.zones?.length) return [];
  const bonusOf = new Map(map.outpostBonuses.map((b) => [b.zone, b.bonus]));

  return map.zones.map((z) => {
    const bonus = bonusOf.get(z.name) ?? '';
    return {
      id: `cf-${z.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      name: z.name,
      type: bonus ? 'Special Zone' : 'Zone',
      perk: bonus,
      // The scenario is what a player needs to know about a zone before
      // fighting over it, so it is the line under the name rather than a
      // sentence of atmosphere the book does not print for these.
      description: `Scenario played here: ${z.scenario}.`,
      resources: z.resources,
      scenario: z.scenario,
    };
  });
}
