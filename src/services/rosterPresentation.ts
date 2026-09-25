/**
 * A roster reduced to what a person needs to read, once, for both readers.
 *
 * Codex's `docs/EXPORT-CODEX-REVIEW.md` E1: the interchange formats and the
 * presentation formats should not duplicate resolution, totals or identity —
 * "duplication of resolution, totals, injury adjustments and identity mapping
 * would recreate the serializer drift the brief correctly fears". So the text
 * renderer and the print sheet read this, and neither reaches into `Warband`
 * for a number the other also computes.
 *
 * It is a PRESENTATION projection and not the file's one. The durable
 * projection in `rosterFile.ts` exists to be read back; this exists to be
 * looked at, so it flattens, it formats nothing, and it drops anything a reader
 * would not see.
 *
 * The privacy choice is applied HERE rather than in each renderer. Lore, a
 * model's quote and the player's notes are personal writing, and a second
 * renderer that forgot to check the flag would be a disclosure bug rather than
 * a formatting one (E5).
 */
import type { ActiveUnit, Warband } from '../types/warband';
import { rosterGlory, unitGlory } from '../rules/savedGlory';

export interface PresentedTotals {
  /** What the models and their gear cost — the list. */
  listDucats: number;
  listGlory: number;
  /** The budget the list is measured against. */
  ducatLimit: number;
  /** Ducats in the Strongbox. NOT part of the list cost. */
  strongbox: number;
  /** Glory the Warband holds. Also not part of the list cost. */
  gloryHeld: number;
  models: number;
  /** Models on the roster the campaign has killed. */
  dead: number;
}

export interface PresentedModel {
  id: string;
  name: string;
  profileName: string;
  category: string;
  ducats: number;
  glory: number;
  dead: boolean;
  /** A model a rule gave the Warband, and the rule that gave it. */
  grantedFree?: string;
  gear: string[];
  /**
   * The five characteristics the official Warband Roster Sheet prints across a
   * unit card: MOVEMENT, RANGED, MELEE, ARMOUR and BASE.
   *
   * `base` is here rather than in the sheet's own projection because the sheet
   * prints it as a characteristic, and E1 is that two renderers must not each
   * resolve the same field. Optional within the group: a warband saved before
   * `baseSize` existed carries no base size, and an empty cell is the honest
   * rendering of that.
   */
  stats?: {
    movement: string; ranged: string; melee: string; armour: string; base: string;
  };
  keywords: string[];
  abilities: { name: string; description: string }[];
  xp: number;
  advancements: string[];
  skills: string[];
  injuries: string[];
  scars: string[];
  /** Present only where the export asked for personal writing. */
  lore?: string;
  quote?: string;
  notes?: string;
}

export interface PresentedRoster {
  name: string;
  faction: string;
  variant?: string;
  ruleset?: string;
  totals: PresentedTotals;
  models: PresentedModel[];
  stash: { name: string; quantity: number }[];
  lore?: string;
  notes?: string;
}

export interface PresentationContext {
  factionName?: string;
  variantName?: string;
  rulesetId?: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function presentRoster(
  warband: Warband,
  context: PresentationContext,
  options: { includePrivate?: boolean } = {},
): PresentedRoster {
  const units = warband.units ?? [];
  const priv = options.includePrivate === true;

  return {
    name: warband.name || 'Unnamed Warband',
    faction: context.factionName || warband.factionId || 'Unknown faction',
    variant: context.variantName || undefined,
    ruleset: context.rulesetId || undefined,
    totals: {
      listDucats: units.reduce((n, u) => n + (u.totalCost ?? 0), 0),
      listGlory: rosterGlory(units),
      ducatLimit: warband.ducatLimit ?? 0,
      strongbox: warband.treasuryDucats ?? 0,
      gloryHeld: warband.gloryPoints ?? 0,
      /*
        `units` holds no dead model now — the Trauma Step moves it to
        `fallen`, which is what "remove the model from your Warband Roster"
        means. So the living are a plain count, and the dead are counted where
        they actually live.

        The `!u.isDead` filter that used to be here is kept in spirit by
        `migrateFallen`, which runs on load: a roster written before the move
        arrives with its dead already in `fallen`, so neither number is wrong
        for an old file.
      */
      models: units.length,
      dead: (warband.fallen ?? []).length,
    },
    models: units.map((u) => presentModel(u, priv)),
    stash: (warband.armoryStash ?? [])
      .map((s) => ({ name: s.name, quantity: s.quantity ?? 1 })),
    ...(priv && warband.lore ? { lore: warband.lore } : {}),
    ...(priv && warband.notes ? { notes: warband.notes } : {}),
  };
}

function presentModel(u: ActiveUnit, priv: boolean): PresentedModel {
  const profile = u.profileSnapshot;
  const stats = profile?.stats;
  return {
    id: u.id,
    name: u.customName || profile?.name || 'Warrior',
    profileName: profile?.name ?? '',
    category: str(profile?.category),
    ducats: u.totalCost ?? 0,
    glory: unitGlory(u),
    dead: Boolean(u.isDead),
    ...(u.grantedFree ? { grantedFree: u.grantedFree } : {}),
    gear: [
      ...(u.equippedWeapons ?? []).map((w) => w.name),
      ...(u.equippedArmour ?? []).map((a) => a.name),
      ...(u.equippedEquipment ?? []).map((e) => e.name),
    ].filter(Boolean),
    ...(stats ? { stats: {
      movement: str(stats.movement),
      ranged: str(stats.ranged),
      melee: str(stats.melee),
      armour: str(stats.armour),
      base: str(stats.baseSize),
    } } : {}),
    keywords: (stats?.keywords ?? []).map(String),
    abilities: (profile?.innateAbilities ?? [])
      .map((a) => ({ name: a.name, description: a.description })),
    xp: u.xp ?? 0,
    advancements: u.advancements ?? [],
    skills: (u.skills ?? []).map((s) => s.name),
    injuries: u.injuries ?? [],
    scars: (u.scars ?? []).map((s) => s.name ?? '').filter(Boolean),
    ...(priv && u.lore ? { lore: u.lore } : {}),
    ...(priv && u.quote ? { quote: u.quote } : {}),
    ...(priv && u.notes ? { notes: u.notes } : {}),
  };
}
