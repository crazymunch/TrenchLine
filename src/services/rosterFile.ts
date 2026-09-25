/**
 * The TrenchLine roster file: a versioned envelope, and a reader for the dump
 * that came before it.
 *
 * The app has shipped an export since long before this: `JSON.stringify(warband)`,
 * the internal type, unversioned. It is already in users' hands and is already
 * the de-facto TrenchLine file, so any refactor of `Warband` silently breaks
 * every file anyone has saved and nothing declares a version to detect it. That
 * is what this replaces — see `docs/EXPORT-ARCHITECTURE-BRIEF.md` §3.1 and
 * Codex's review, `docs/EXPORT-CODEX-REVIEW.md` E2 and E9.
 *
 * Three things it does that the dump did not.
 *
 * **It says what it is.** `format` and `schemaVersion`, so a reader can refuse
 * a file from a newer build rather than partially loading it. Rule 2: half a
 * roster restored silently is worse than a refusal a person can act on.
 *
 * **It says what the roster was built under.** Not `rulesetId` alone: the same
 * base commit with a different layer stack is a different ruleset, and this app
 * ships two. The manifest carries the ordered layers and the base catalogue
 * files as well (E2 — "different layers or overrides atop the same commit can
 * change the roster").
 *
 * **It is an explicit projection, not the runtime type.** Every field of
 * `Warband` and `ActiveUnit` is classified below, and the classification is a
 * `Record<keyof T, …>`, so adding a field to either type fails to compile until
 * someone decides whether it belongs in a file. `SYNC-1` found six warband
 * fields being dropped silently by a different serialiser; a file format is a
 * worse place to repeat that, because nobody notices until they need the file.
 *
 * What it deliberately does NOT do: claim a file is legal. A manifest records
 * what the roster was built under. Validating it against the rules loaded now
 * is a separate operation with a separate answer (E2).
 */
import type {
  ActiveUnit, StashedItem, Warband, WarbandSnapshot,
} from '../types/warband';
import type { Dataset } from '../types/catalogue';
import { migrateFallen } from '../rules/fallen';
import { openLedger, migrateFoundingPot } from '../rules/ledger';

export const ROSTER_FILE_FORMAT = 'trenchline.roster';
export const ROSTER_SCHEMA_VERSION = 1;

/* ------------------------------------------------------ the field inventory */

/**
 * What happens to a field when a roster becomes a file.
 *
 *   `durable`   goes in the file. The roster's actual content and history.
 *   `identity`  goes in the file, but as a REFERENCE, never as authority. A
 *               file's ids confer no ownership, no membership and no sync
 *               precedence (E2); importing as a new roster remints them.
 *   `live`      never goes in. Transient battle state that happens to live on
 *               the roster today — see `store/slices/match.ts`, a known defect.
 *   `local`     never goes in. This device's bookkeeping, or an id that would
 *               travel to someone it does not belong to.
 */
export type Disposition = 'durable' | 'identity' | 'live' | 'local';

/**
 * Every field of `Warband`, classified.
 *
 * `Record<keyof Warband, …>` on purpose: a new field on the type is a
 * compile error here until someone decides what a file does with it.
 */
export const WARBAND_FIELDS: Record<keyof Warband, Disposition> = {
  id: 'identity',
  name: 'durable',
  /* What the import read from `Campaign Rules > Enabled`. Durable: it is what
     the Warband EARNED, it cannot be reconstructed from the models, and the
     Book of Golems action is offered on the strength of it (GOLEM-1). */
  campaignRules: 'durable',
  factionId: 'durable',
  variantId: 'durable',
  allowThirdParty: 'durable',
  earnedRecruitment: 'durable',
  forceMode: 'durable',
  ledger: 'durable',
  explorationDiscoveries: 'durable',
  explorationEffects: 'durable',
  ducatLimit: 'durable',
  treasuryDucats: 'durable',
  /* Promotion Dice rolled in a row without a Promotion. Durable, and it reads
     like battle state without being any: the count is kept BETWEEN games, so a
     restore that dropped it hands the Warband back five misses it had already
     paid for — the same class of mistake as resurrecting a dead model. */
  promotionMisses: 'durable',
  gloryPoints: 'durable',
  units: 'durable',
  /* The models removed by the Trauma Step, and their Battlekits.
     Durable: a campaign's dead are half of what a roster's history means, and
     they cannot be reconstructed from a file that dropped them. */
  fallen: 'durable',
  armoryStash: 'durable',
  lore: 'durable',
  motto: 'durable',
  patron: 'durable',
  chronicleLog: 'durable',
  notes: 'durable',
  snapshots: 'durable',
  createdAt: 'durable',
  updatedAt: 'durable',
  /* This device's copy of when it last wrote. Sync bookkeeping, not history. */
  editedAt: 'local',
  /* An id for a campaign on somebody's device. It grants no membership, so
     carrying it into a file that may be handed to a stranger buys nothing. */
  campaignId: 'local',
  /* The account that made it. `creatorName` is authorship a player wrote and
     may want to keep; `creatorId` is an account identifier, and a roster file
     is not a place to put one. */
  creatorId: 'local',
  creatorName: 'durable',
};

/**
 * Every field of `ActiveUnit`, classified.
 *
 * `isDead` is DURABLE and the distinction matters: it reads like battle state
 * and it is not. A model removed by the Trauma Step is gone from the campaign,
 * and a restore that quietly brought it back would be inventing a model
 * (E2 — "do not accidentally remove persistent death because it sounds like
 * combat state").
 *
 * It is also now legacy: nothing sets it, because the model is moved to
 * `Warband.fallen` instead. It stays durable because a file written before
 * that carries the flag and nothing else, and reading it is the only way to
 * know that model is dead.
 */
export const UNIT_FIELDS: Record<keyof ActiveUnit, Disposition> = {
  id: 'identity',
  customName: 'durable',
  baseProfileId: 'durable',
  /* Provenance: lose it and a Golem comes back a model that may be Promoted. */
  grantedBy: 'durable',
  profileSnapshot: 'durable',
  equippedWeapons: 'durable',
  equippedArmour: 'durable',
  equippedEquipment: 'durable',
  xp: 'durable',
  isElite: 'durable',
  advancements: 'durable',
  skills: 'durable',
  /* How many Advancement Rolls the model has taken. Durable, and load-bearing
     on restore: it is what `advancementRollsDue` subtracts from the thresholds
     the model's Experience has passed, so losing it hands the model every roll
     it has already made, a second time. */
  advancementRolls: 'durable',
  injuries: 'durable',
  scars: 'durable',
  /* Sitting the next game out. DURABLE, and the call is not obvious: it
     reads like battle state, and it is a decision about a game not yet
     played. A player picks their Force the night before and closes the app,
     and a restore that un-benched everybody would hand them a list over the
     Threshold with no sign of why. */
  benched: 'durable',
  isDead: 'durable',
  /* An outstanding Re-creation offer on a model the post-battle sequence
     killed. Durable, and load-bearing: a roster saved between the battle and
     the Quartermaster Step carries a model that is neither alive nor fallen,
     and dropping the field would silently restore it to full health. The
     deadline is stored rather than recomputed because the two entries that
     grant it are printed with different ones. */
  awaitingRecreation: 'durable',
  /* Which battle killed it. Durable: it is what lets the memorial name the
     game, and it cannot be recovered from anywhere else once the roster
     leaves this device. */
  diedInMatchId: 'durable',
  /* Sent home rather than killed, and the game it happened in. Durable for the
     same reason as `diedInMatchId`: it is the only thing that distinguishes a
     retired model from a dead one, and a memorial that cannot tell them apart
     reports a Warband's losses as higher than they were. */
  retired: 'durable',
  retiredAtGame: 'durable',
  totalCost: 'durable',
  grantedFree: 'durable',
  fireteam: 'durable',
  specialUpgrades: 'durable',
  lore: 'durable',
  titles: 'durable',
  titleRecords: 'durable',
  deeds: 'durable',
  quote: 'durable',
  notes: 'durable',
  /* Battle state. Wounds taken in a game that is over, markers on a table that
     has been cleared, and whether a model has acted this turn. */
  currentWounds: 'live',
  maxWounds: 'live',
  bloodMarkers: 'live',
  blessingMarkers: 'live',
  status: 'live',
  hasActedThisTurn: 'live',
};

const keptKeys = <T extends object>(map: Record<keyof T, Disposition>) =>
  (Object.keys(map) as (keyof T)[])
    .filter((k) => map[k] === 'durable' || map[k] === 'identity');

const project = <T extends object>(source: T, map: Record<keyof T, Disposition>): Partial<T> => {
  const out: Partial<T> = {};
  for (const key of keptKeys(map)) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
};

/* ------------------------------------------------------------- the envelope */

/** What the roster was built under. A record, not a certificate. */
export interface RulesManifest {
  rulesetId: string;
  /** The catalogue repository commit the dataset was built from. */
  baseCommit: string;
  /** The catalogue files, so a differing base is visible and not merely hashed. */
  baseFiles: string[];
  /** Ordered: the layer stack is part of the ruleset's identity, not a set. */
  layers: string[];
}

/**
 * How much the file can say about what it was built under.
 *
 *   `known`    the exporter had a loaded dataset and recorded its manifest.
 *   `partial`  a manifest survived a migration but not from this exporter.
 *   `unknown`  a v0 file. It says nothing, and this must not be filled in with
 *              today's dataset — stamping current metadata onto an old roster
 *              and calling it provenance is a lie the file then carries (E2).
 */
export type ProvenanceStatus = 'known' | 'partial' | 'unknown';

/** A snapshot with its models projected the same way the roster's are. */
export type DurableSnapshot = Omit<Partial<WarbandSnapshot>, 'units'>
  & { units: Partial<ActiveUnit>[] };

/**
 * The roster as a file carries it.
 *
 * `units` and `snapshots` are replaced rather than intersected: a `Partial`
 * model is not an `ActiveUnit`, and pretending otherwise is how a projection
 * quietly stops being one.
 */
export type DurableWarband = Omit<Partial<Warband>, 'units' | 'snapshots'>
  & { name: string; units: Partial<ActiveUnit>[]; snapshots?: DurableSnapshot[] };

export interface RosterFile {
  format: typeof ROSTER_FILE_FORMAT;
  schemaVersion: number;
  /** The app build that wrote it. */
  exporterVersion: string;
  exportedAt: string;
  provenance: ProvenanceStatus;
  rules: RulesManifest | null;
  roster: DurableWarband;
}

/* ---------------------------------------------------------------- encoding */

/** The roster reduced to what a file carries. Exported for the round-trip test. */
export function durableWarband(warband: Warband): DurableWarband {
  const out = project(warband, WARBAND_FIELDS) as DurableWarband;
  out.units = (warband.units ?? []).map((u) => project(u, UNIT_FIELDS));
  /* Snapshots are campaign history and are kept, but they carry whole warband
     copies — including the live fields — so they are projected too. */
  if (warband.snapshots) {
    out.snapshots = warband.snapshots.map((s) => ({
      ...s,
      units: (s.units ?? []).map((u) => project(u as ActiveUnit, UNIT_FIELDS)),
    }));
  }
  return out;
}

export function encodeRosterFile(
  warband: Warband,
  dataset: Dataset | null | undefined,
  opts: { exporterVersion: string; now?: () => Date } = { exporterVersion: '0.0.0' },
): RosterFile {
  const meta = dataset?.meta;
  return {
    format: ROSTER_FILE_FORMAT,
    schemaVersion: ROSTER_SCHEMA_VERSION,
    exporterVersion: opts.exporterVersion,
    exportedAt: (opts.now?.() ?? new Date()).toISOString(),
    /* No dataset loaded means no manifest, and saying so beats inventing one. */
    provenance: meta ? 'known' : 'unknown',
    rules: meta
      ? {
        rulesetId: meta.rulesetId,
        baseCommit: meta.baseCommit,
        baseFiles: [...(meta.baseFiles ?? [])],
        layers: [...(meta.layers ?? [])],
      }
      : null,
    roster: durableWarband(warband),
  };
}

/* ---------------------------------------------------------------- decoding */

export type DecodeResult =
  | { ok: true; file: RosterFile; warnings: string[] }
  | { ok: false; reason: string };

/** Bounds, so a malformed or hostile file cannot exhaust the tab. */
const LIMITS = { units: 500, stash: 2000, snapshots: 500, stringLength: 200_000 };

/** Keys that must never be written onto an object built from a file. */
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strip anything that could poison a prototype, and refuse a structure deeper
 * than any real roster.
 *
 * The input is a file a person was handed; it is not trusted (E10).
 */
function sanitise(value: unknown, depth = 0): unknown {
  if (depth > 40) throw new Error('The file is nested too deeply to be a roster.');
  if (Array.isArray(value)) return value.map((v) => sanitise(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN.has(k)) continue;
      out[k] = sanitise(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > LIMITS.stringLength) {
    throw new Error('The file contains a value too long to be roster text.');
  }
  return value;
}

const looksLikeWarband = (v: Record<string, unknown>) =>
  typeof v.name === 'string' && Array.isArray(v.units);

/**
 * Read a roster file: this format, or the raw dump that came before it.
 *
 * Refuses rather than guesses. A schema version this build does not know is a
 * file written by a newer TrenchLine, and the only honest answers are "update"
 * or "no" — partially loading it would silently drop whatever the new version
 * added, which is the failure the version field exists to prevent.
 */
export function decodeRosterFile(input: unknown): DecodeResult {
  let value: unknown;
  try {
    value = sanitise(typeof input === 'string' ? JSON.parse(input) : input);
  } catch (e) {
    return { ok: false, reason: e instanceof Error && e.message.startsWith('The file')
      ? e.message
      : 'That file is not readable JSON.' };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'That file does not contain a roster.' };
  }
  const obj = value as Record<string, unknown>;
  const warnings: string[] = [];

  /* v0: the raw `JSON.stringify(warband)` the app used to write. It has no
     envelope at all, so it is recognised by its shape and read as what it is —
     a roster with no provenance. Not "assumed to be the current ruleset". */
  if (obj.format === undefined && looksLikeWarband(obj)) {
    const roster = readRoster(obj, warnings);
    if (!roster.ok) return roster;
    warnings.unshift(
      'This is a file from an older TrenchLine, which recorded no ruleset. '
      + 'It cannot say which rules the roster was built under.');
    return {
      ok: true,
      warnings,
      file: {
        format: ROSTER_FILE_FORMAT,
        schemaVersion: ROSTER_SCHEMA_VERSION,
        exporterVersion: 'unknown',
        exportedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
        provenance: 'unknown',
        rules: null,
        roster: roster.roster,
      },
    };
  }

  if (obj.format !== ROSTER_FILE_FORMAT) {
    return { ok: false, reason: 'That file is not a TrenchLine roster.' };
  }
  const version = obj.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'That roster file does not say which version it is.' };
  }
  if (version > ROSTER_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `That roster file is version ${version}; this build reads up to `
            + `${ROSTER_SCHEMA_VERSION}. Update TrenchLine to open it.`,
    };
  }

  if (!obj.roster || typeof obj.roster !== 'object') {
    return { ok: false, reason: 'That roster file contains no roster.' };
  }
  const roster = readRoster(obj.roster as Record<string, unknown>, warnings);
  if (!roster.ok) return roster;

  const rules = readManifest(obj.rules);
  if (!rules) {
    warnings.push('The file records no ruleset manifest, so it cannot say which '
                + 'rules the roster was built under.');
  }

  return {
    ok: true,
    warnings,
    file: {
      format: ROSTER_FILE_FORMAT,
      schemaVersion: version,
      exporterVersion: typeof obj.exporterVersion === 'string' ? obj.exporterVersion : 'unknown',
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
      provenance: rules ? 'known' : 'unknown',
      rules,
      roster: roster.roster,
    },
  };
}

function readManifest(value: unknown): RulesManifest | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  if (typeof m.rulesetId !== 'string' || typeof m.baseCommit !== 'string') return null;
  return {
    rulesetId: m.rulesetId,
    baseCommit: m.baseCommit,
    baseFiles: Array.isArray(m.baseFiles) ? m.baseFiles.filter((f) => typeof f === 'string') : [],
    layers: Array.isArray(m.layers) ? m.layers.filter((l) => typeof l === 'string') : [],
  };
}

type RosterRead =
  | { ok: true; roster: DurableWarband }
  | { ok: false; reason: string };

/**
 * Read the roster itself, keeping only classified fields.
 *
 * Unclassified keys are DROPPED rather than passed through, and a live field
 * present in the file is dropped too: a v0 dump carries mid-battle wounds, and
 * restoring those onto a roster would put a model back on the table injured
 * from a game that finished months ago.
 */
function readRoster(value: Record<string, unknown>, warnings: string[]): RosterRead {
  if (!looksLikeWarband(value)) {
    return { ok: false, reason: 'That file does not contain a warband.' };
  }
  const units = value.units as unknown[];
  if (units.length > LIMITS.units) {
    return { ok: false, reason: `That roster claims ${units.length} models, which is not a roster.` };
  }

  const out = project(value as unknown as Warband, WARBAND_FIELDS) as DurableWarband;
  out.name = String(value.name);
  out.units = units.map((u) => project((u ?? {}) as ActiveUnit, UNIT_FIELDS));

  const stash = value.armoryStash;
  if (Array.isArray(stash) && stash.length > LIMITS.stash) {
    return { ok: false, reason: 'That roster claims more stashed items than a warband can hold.' };
  }
  out.armoryStash = (Array.isArray(stash) ? stash : []) as StashedItem[];

  const snapshots = value.snapshots;
  if (Array.isArray(snapshots) && snapshots.length > LIMITS.snapshots) {
    warnings.push(`The file carries ${snapshots.length} history entries; only the most `
                + `recent ${LIMITS.snapshots} were read.`);
    out.snapshots = snapshots.slice(-LIMITS.snapshots) as DurableSnapshot[];
  }

  const dropped = Object.keys(value)
    .filter((k) => !(k in WARBAND_FIELDS));
  if (dropped.length) {
    warnings.push(`The file carries ${dropped.length} field(s) this build does not know: `
                + `${dropped.join(', ')}. They were not imported.`);
  }

  /*
    A file written before the dead left the Roster holds them in `units`
    behind `isDead: true`. Moved here, so a roster that arrives by import is
    in the same shape as one that arrives from storage — the alternative is
    every reader downstream having to know which door the roster came through.

    Said out loud rather than done quietly: the model count and the Ducat
    total both change, and an import that silently revalues a roster is worse
    than one that explains itself.
  */
  const before = (out.fallen ?? []).length;
  /*
    The same three migrations as the storage door, in the same order, so an
    imported roster arrives in the shape a stored one has — including the
    founding pot a never-played campaign Warband was always shown.
  */
  const fallenFixed = migrateFallen(out as unknown as Warband);
  const migrated = migrateFoundingPot(
    openLedger(fallenFixed),
    /* The record as it arrived: `openLedger` replaces the ledger, and with it
       the rows that prove this Warband has played. See `migrateFoundingPot`. */
    fallenFixed,
  ) as unknown as DurableWarband;
  const moved = (migrated.fallen ?? []).length - before;
  if (moved > 0) {
    warnings.push(`${moved} model(s) marked dead were moved off the active roster. `
                + 'The Trauma Table removes a dead model from the Warband Roster, so they '
                + 'no longer count towards the Warband\u2019s Ducats or appear in the builder.');
  }

  return { ok: true, roster: migrated };
}

/* ------------------------------------------------- back into a live roster */

/**
 * How a file becomes a Warband again.
 *
 *   `clone`    "import as new roster". Every id is reminted, so a file opened
 *              twice gives two warbands rather than one overwriting the other.
 *   `restore`  "restore this backup". Ids are kept, which is what makes it a
 *              restore — and what makes it the caller's job to have asked
 *              about a collision first (E2).
 */
export type ImportMode = 'clone' | 'restore';

const mintId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Rebuild a live roster from a file.
 *
 * The live fields a file does not carry are set to a model standing ready, not
 * to whatever it was doing when the file was written: full wounds, no markers,
 * nothing acted. `isDead` is honoured, because a model removed by the Trauma
 * Step is gone and bringing it back would be inventing a model.
 *
 * Nothing here revalidates. A file records what a roster was built under; that
 * it is legal under the rules loaded now is a different question with a
 * different answer, and the caller asks it separately.
 */
export function warbandFromFile(file: RosterFile, mode: ImportMode = 'clone'): Warband {
  const roster = file.roster;
  const now = new Date().toISOString();

  const units = (roster.units ?? []).map((u) => {
    const wounds = (u.profileSnapshot?.stats?.keywords ?? [])
      .some((k) => String(k).toLowerCase().includes('tough')) ? 2 : 1;
    return {
      ...u,
      id: mode === 'clone' ? mintId('u') : (u.id ?? mintId('u')),
      currentWounds: wounds,
      maxWounds: wounds,
      bloodMarkers: 0,
      blessingMarkers: 0,
      status: u.isDead ? 'Out of Action' : 'Active',
      hasActedThisTurn: false,
    } as ActiveUnit;
  });

  return {
    ...roster,
    id: mode === 'clone' ? mintId('wb') : (roster.id ?? mintId('wb')),
    units,
    armoryStash: (roster.armoryStash ?? []) as StashedItem[],
    snapshots: (roster.snapshots ?? []) as unknown as WarbandSnapshot[],
    createdAt: roster.createdAt ?? now,
    updatedAt: now,
  } as Warband;
}
