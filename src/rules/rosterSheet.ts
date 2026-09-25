/**
 * The official Warband Roster Sheet, as data (FD-12 item 3).
 *
 * The owner supplied the printed sheet; it is committed at
 * `data-sources/rulebook/warband-roster-sheet.pdf` with its text at
 * `data-sources/rulebook/extracted/warband-roster-sheet.txt`, and every field
 * below is one the sheet prints. The three pages, from that extract:
 *
 *   L2–L4   WARBAND NAME, PLAYER, WARBAND, PATRON, CAMPAIGN BATTLE, FACTION
 *   L5–L7   STRONGBOX: 👑 TOTAL / UNSPENT, and ☼ TOTAL / UNSPENT
 *   L8      WARBAND BIO & EXPLORATION NOTES
 *   L9      HERALDRY
 *   L10     ARSENAL
 *   L11–L24 GAME, THRESHOLD, FIELD STRENGTH, SCENARIO NAME, RESULT (W/L/D),
 *           CAMPAIGN VPS, and TOTAL CAMPAIGN VICTORY POINTS
 *   L28–L78 the unit cards: NAME, MODEL NAME, COST, the five characteristics,
 *           EXPERIENCE, SCARS, Battlekit, Abilities/Skills & Injuries, Keywords
 *
 * **Nothing here is typed from the picture.** The twelve THRESHOLD and FIELD
 * STRENGTH rows come from `campaign.thresholds` through `forceLimits`, which is
 * the same function the builder measures a Force with; the sheet's own printed
 * numbers (700/10 up to 1800/22) are asserted to equal them in
 * `rosterSheet.test.ts`, so the sheet is a rendering of the dataset and the
 * agreement is a test rather than a coincidence.
 *
 * **A separate projection from `presentRoster`, composed on top of it.** E1 in
 * `docs/EXPORT-CODEX-REVIEW.md` is that two renderers must not each resolve the
 * same field: the models, their costs, gear, keywords, abilities and the list
 * totals are `presentRoster`'s, unchanged. What this adds is the sheet's own
 * structure — the header, the Strongbox's TOTAL/UNSPENT pair, the campaign
 * table, the Experience track per model, and the provenance review — none of
 * which the text export or the print sheet has.
 *
 * It takes a `Warband` and renders without the store, because SH-1's public
 * page has no store: the builder's route and `/w/<token>` both call this.
 */
import type { Dataset, ExplorationLocation } from '@/types/catalogue';
import type { Warband } from '@/types/warband';
import {
  campaignVictoryPoints, forceLimits, rollLabel, strongboxOf, victoryPointScale,
  type LedgerEntry,
} from './campaign';
import { experienceTrackFor, type ExperienceTrackModel } from './experienceTrack';
import { holdingsOf, provenanceLabel, type Holding } from './provenance';
import { factionOf, variantById } from './variants';
import { presentRoster, type PresentedModel } from '@/services/rosterPresentation';
import { stashPrice } from '@/types/warband';

/** L2–L4. Every blank on the sheet's header, and an empty string for a blank. */
export interface SheetHeader {
  warbandName: string;
  /** PLAYER. `creatorName` — who owns the roster, never an address. */
  player: string;
  /** WARBAND. The Variant, which is what the sheet's second blank names. */
  warband: string;
  patron: string;
  /** CAMPAIGN BATTLE: the campaign's name. */
  campaignBattle: string;
  faction: string;
}

/** L5–L7. TOTAL is everything ever credited; UNSPENT is the balance. */
export interface SheetStrongbox {
  ducatsTotal: number;
  ducatsUnspent: number;
  gloryTotal: number;
  gloryUnspent: number;
  /**
   * False where the Warband has no ledger at all, so the pair cannot be a
   * TOTAL and a balance — only a balance. FD-05d made the ledger the
   * Strongbox's authority; a Warband from before it has the stored numbers and
   * no history, and the sheet says which it is holding rather than printing a
   * TOTAL it invented.
   */
  fromLedger: boolean;
}

/** One row of L11–L23. */
export interface SheetGameRow {
  game: number;
  /** From `forceLimits`, the same reading the builder measures against. */
  threshold: number | null;
  fieldStrength: number | null;
  /** True where `forceLimits` ran past the published table. */
  extrapolated: boolean;
  /** Blank until the game is played. */
  scenarioName?: string;
  /** W, L or D. Blank until the game is played. */
  result?: 'W' | 'L' | 'D';
  /** That game's Campaign Victory Points, or null where no scale is published. */
  vps: number | null;
}

export interface SheetCampaignTable {
  rows: SheetGameRow[];
  /**
   * TOTAL CAMPAIGN VICTORY POINTS, summed over the rows that have a result.
   *
   * `null` where the ruleset publishes no scale — not zero, for the reason
   * `campaignVictoryPoints` gives: standings that cannot be computed must not
   * render as everybody on nothing.
   *
   * **The per-game total only.** Two Exploration results move Campaign Victory
   * Points outside the scale (`16 Treasure of the Holies` scores D3, `23
   * Patron's Visit` exchanges Glory for points) and neither is derivable from a
   * win/loss/draw record. The sheet is paper, so the player writes those in;
   * `adjustmentsPending` is how the view says so.
   */
  total: number | null;
  adjustmentsPending: boolean;
  /**
   * The Exploration Locations whose own text moves Campaign Victory Points,
   * by name, in the order the dataset lists them.
   *
   * **Derived, never typed.** The sheet used to name `16 Treasure of the
   * Holies` and `23 Patron's Visit` and quote what each scores, in a UI string
   * (review round 1, finding O) — two rows of game data retyped into a
   * paragraph. These are found by reading which Locations' printed text names
   * Campaign Victory Points at all, so a Dispatch that adds a third one says so
   * and a reworded row does not leave a stale sentence behind.
   *
   * Empty where the ruleset publishes no Exploration tables, and the view then
   * says that points can move outside the scale without naming anything.
   */
  outsideTheScale: string[];
}

/** One unit card, pages 2 and 3. */
export interface SheetCard {
  model: PresentedModel;
  /** Eighteen boxes and two scars, from the dataset. `null` if it cannot be read. */
  track: ExperienceTrackModel | null;
  /** Battlekit, as the sheet's own heading groups it. */
  battlekit: string[];
  /** Abilities, Skills & Injuries: one heading on the sheet, so one list here. */
  abilitiesSkillsInjuries: { name: string; detail?: string; provenance?: string }[];
  keywords: string[];
}

export interface RosterSheetModel {
  header: SheetHeader;
  strongbox: SheetStrongbox;
  /** WARBAND BIO: the Warband's own lore. */
  bio: string;
  /**
   * EXPLORATION NOTES: every reward, Skill, injury and scar the Warband holds
   * and how each was earned — the review the owner asked for alongside the
   * sheet. From `holdingsOf`.
   */
  holdings: Holding[];
  /** HERALDRY. The sheet's box is for a drawn device; the app has the motto. */
  heraldry: string;
  /** ARSENAL, from the stash. */
  arsenal: { name: string; quantity: number; ducats: number; glory: number }[];
  campaign: SheetCampaignTable;
  cards: SheetCard[];
  /**
   * The models removed by the Trauma Step. Not on the printed sheet, which has
   * no room for them — and the whole point of this being the app's sheet
   * rather than a photocopy is that a campaign's dead are half its history.
   *
   * `retired` separates the two ways a model leaves: the Quartermaster Step's
   * Retire Injured Models sends one home (#114), and `removeFromRoster` writes
   * `isDead` for both, so a list that cannot tell them apart tells a Warband
   * that retired two of its eight losses that it buried all eight.
   */
  fallen: {
    name: string;
    profileName: string;
    retired: boolean;
    retiredAtGame?: number;
  }[];
}

export interface RosterSheetContext {
  dataset: Dataset | null | undefined;
  /** The campaign this Warband is in, for CAMPAIGN BATTLE and the game count. */
  campaign?: { id?: string; name?: string; currentGame?: number; currentTurn?: number } | null;
  /**
   * Whether the reader may see the player's own writing.
   *
   * False on the public share page for a model's private notes: `presentRoster`
   * applies it, and SH-1's page is read by whoever has the link. The Warband's
   * lore and motto ARE shown — they are what a player shares a roster for —
   * and a model's private notes are not.
   */
  includePrivate?: boolean;
}

/** Everything ever credited in each currency. The other half of TOTAL/UNSPENT. */
function everCredited(ledger: LedgerEntry[]): { ducats: number; glory: number } {
  return ledger.reduce(
    (acc, e) => ({
      ducats: acc.ducats + Math.max(0, e.ducats || 0),
      glory: acc.glory + Math.max(0, e.glory || 0),
    }),
    { ducats: 0, glory: 0 },
  );
}

const RESULT: Record<string, 'W' | 'L' | 'D'> = {
  Victory: 'W', Defeat: 'L', Draw: 'D',
};

/**
 * The campaign table, one row per published game.
 *
 * Twelve rows because the dataset publishes twelve; a game played past the end
 * of the table gets a row of its own, flagged `extrapolated`, rather than being
 * dropped — a thirteenth game is a real thing groups do and losing its scenario
 * off the record is worse than a row the book does not print.
 */
function campaignTable(
  dataset: Dataset | null | undefined,
  warband: Pick<Warband, 'snapshots' | 'variantId'>,
): SheetCampaignTable {
  const played = new Map<number, { scenarioName?: string; outcome?: string }>();
  for (const snap of warband.snapshots ?? []) {
    if (snap.type !== 'post_battle') continue;
    /*
      `campaignGame` is read STRICTLY, as `WarbandSnapshot` says it must be: a
      snapshot written before the field existed is not evidence for any
      particular game, and placing it on a row would put a scenario against a
      Threshold it was never played under.
    */
    if (typeof snap.campaignGame !== 'number') continue;
    played.set(snap.campaignGame, {
      scenarioName: snap.scenarioName, outcome: snap.outcome,
    });
  }

  const publishedRows =
    (dataset as { campaign?: { thresholds?: { game: number }[] } } | null | undefined)
      ?.campaign?.thresholds ?? [];
  const games = new Set<number>(publishedRows.map((r) => r.game));
  for (const g of played.keys()) games.add(g);

  const scale = victoryPointScale(dataset);
  const rows: SheetGameRow[] = [...games].sort((a, b) => a - b).map((game) => {
    const limits = dataset ? forceLimits(dataset, game, warband.variantId) : null;
    const record = played.get(game);
    const result = record?.outcome ? RESULT[record.outcome] : undefined;
    return {
      game,
      threshold: limits?.threshold ?? null,
      fieldStrength: limits?.fieldStrength ?? null,
      extrapolated: limits?.extrapolated ?? false,
      ...(record?.scenarioName ? { scenarioName: record.scenarioName } : {}),
      ...(result ? { result } : {}),
      /* Per row, through the same function the standings use, by handing it a
         one-game record. So a row and the Hub cannot disagree on a number. */
      vps: result
        ? campaignVictoryPoints(dataset, {
          wins: result === 'W' ? 1 : 0,
          losses: result === 'L' ? 1 : 0,
          draws: result === 'D' ? 1 : 0,
        })
        : null,
    };
  });

  const scored = rows.filter((r) => r.vps !== null);
  return {
    rows,
    total: scale === null ? null : scored.reduce((n, r) => n + (r.vps ?? 0), 0),
    adjustmentsPending: scored.length > 0,
    outsideTheScale: locationsMovingVictoryPoints(dataset),
  };
}

/**
 * Exploration Locations whose printed text moves Campaign Victory Points.
 *
 * Read out of the dataset's own Exploration tables by the phrase the rows use,
 * because the alternative is retyping two row numbers and what they score into
 * a sentence in a component — which is rule 1, and which is what this replaces.
 *
 * `16 Treasure of the Holies` scores D3 of them and `23 Patron's Visit`
 * exchanges Glory for them; both say so in their own description, and a third
 * row that said so would be found by the same reading rather than by somebody
 * remembering to add it here.
 *
 * Named with their roll, as the book prints them, and de-duplicated: the same
 * Location appears on more than one rarity table.
 */
function locationsMovingVictoryPoints(dataset: Dataset | null | undefined): string[] {
  /* `exploration.locations` is the Locations, keyed by table name;
     `exploration.tables` is the games-played band that decides WHICH tables a
     Warband may consult, which is a different thing. */
  const locations = (dataset as {
    campaign?: { exploration?: { locations?: Record<string, ExplorationLocation[]> } };
  } | null | undefined)?.campaign?.exploration?.locations ?? {};

  const moves = /campaign victory point/i;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rows of Object.values(locations)) {
    for (const row of rows ?? []) {
      if (!moves.test(row.description ?? '')) continue;
      const label = `${rollLabel(row.roll)} ${row.name}`.trim();
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

/**
 * The sheet for one Warband.
 *
 * Pure, and store-free on purpose: the builder's route reads the Warband out of
 * the store and the share page reads it out of the database, and both hand it
 * here. A second rendering path is what SH-1 forbids.
 */
export function rosterSheet(
  warband: Warband,
  context: RosterSheetContext,
): RosterSheetModel {
  const { dataset } = context;
  const faction = dataset ? factionOf(dataset, warband.factionId) : undefined;
  const variant = dataset ? variantById(dataset, warband.variantId) : undefined;

  const presented = presentRoster(
    warband,
    {
      factionName: faction?.name,
      variantName: variant?.name,
    },
    { includePrivate: context.includePrivate === true },
  );

  const ledger = warband.ledger ?? [];
  const balance = ledger.length
    ? strongboxOf(ledger)
    : { ducats: warband.treasuryDucats ?? 0, glory: warband.gloryPoints ?? 0 };
  const credited = ledger.length ? everCredited(ledger) : balance;

  const campaignName = context.campaign && context.campaign.id === warband.campaignId
    ? context.campaign.name ?? ''
    : '';

  return {
    header: {
      warbandName: warband.name || '',
      player: warband.creatorName || '',
      warband: variant?.name || '',
      patron: warband.patron || '',
      campaignBattle: campaignName,
      faction: faction?.name || warband.factionId || '',
    },
    strongbox: {
      ducatsTotal: credited.ducats,
      ducatsUnspent: balance.ducats,
      gloryTotal: credited.glory,
      gloryUnspent: balance.glory,
      fromLedger: ledger.length > 0,
    },
    bio: warband.lore || '',
    holdings: holdingsOf(warband),
    heraldry: warband.motto || '',
    arsenal: (warband.armoryStash ?? []).map((item) => {
      const price = stashPrice(item);
      return {
        name: item.name,
        quantity: item.quantity ?? 1,
        ducats: price.ducats ?? 0,
        glory: price.glory ?? 0,
      };
    }),
    campaign: campaignTable(dataset, warband),
    cards: (warband.units ?? []).map((unit, i) => {
      const model = presented.models[i];
      return {
        model,
        track: experienceTrackFor(dataset, unit),
        /* The sheet's own heading. `presentModel` already flattened the three
           equipment arrays into one list in roster order, which is what
           "Battlekit" is on the card. */
        battlekit: model?.gear ?? [],
        abilitiesSkillsInjuries: sheetAbilities(unit, model),
        keywords: model?.keywords ?? [],
      };
    }),
    fallen: (warband.fallen ?? []).map((u) => ({
      name: u.customName || u.profileSnapshot?.name || 'Unnamed',
      profileName: u.profileSnapshot?.name ?? '',
      retired: u.retired === true,
      ...(u.retiredAtGame !== undefined ? { retiredAtGame: u.retiredAtGame } : {}),
    })),
  };
}

/**
 * ABILITIES, SKILLS & INJURIES — one heading on the printed sheet, so one list.
 *
 * In the sheet's own order: what the model IS first (its innate abilities),
 * then what it has learned, then what has been done to it. Each learned or
 * suffered entry carries its provenance line, which is the second half of what
 * the owner asked for beside the sheet: not just what a model holds, but how it
 * came by it.
 */
function sheetAbilities(
  unit: Warband['units'][number],
  model: PresentedModel | undefined,
): SheetCard['abilitiesSkillsInjuries'] {
  const out: SheetCard['abilitiesSkillsInjuries'] = [];
  for (const a of model?.abilities ?? []) {
    out.push({ name: a.name, detail: a.description });
  }
  for (const h of holdingsOf({ units: [unit] })) {
    if (h.kind === 'reward') continue;
    out.push({
      name: h.name,
      ...(h.text ? { detail: h.text } : {}),
      /* `skill · Advancement Roll · game 4 · rolled 9`, or as much of it as the
         record actually holds. */
      provenance: `${h.kind} · ${provenanceLabel({ source: h.source })}`,
    });
  }
  /* The legacy free-text progression notes. Still shown, because they are the
     player's own record of what they did — see `ActiveUnit.advancements`. */
  for (const a of unit.advancements ?? []) out.push({ name: a });
  return out;
}
