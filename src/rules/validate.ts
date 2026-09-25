/**
 * Roster legality.
 *
 * This is the feature that makes TrenchLine a NewRecruit replacement rather
 * than a spreadsheet, and the original app had none of it: it checked only
 * "has a Leader" and "over budget", while computing elite/trooper counts it
 * never used (docs/AUDIT.md §1.7).
 *
 * Everything here is a pure function over a Roster and a Dataset, so the rules
 * can be tested without rendering anything.
 */
import type { Cost, Dataset, UnitProfile, WarbandVariant, FactionSpecialRule, LayerOp } from '@/types/catalogue';
import type { Roster } from './costs';
import { budgetState, unitCost, formatCost, isZero } from './costs';
import { parseRestrictions, onlyForVerdict, type Restriction } from './restrictions';
import { armouryFor, offersOf, restrictionsFor, sectionsOf, stocks, type Armoury } from './armoury';
import { nameKey } from './names';
import { stockedAnywhere, variantArmoury, withinGrants, type GrantUsage } from './variantArmoury';
import { thirdPartyGate } from './thirdParty';
import { variantLocks, unlockedBy } from './variantLocks';
import { battlekitBreaches } from './battlekitLimits';
import { groupBreaches } from './optionGroups';
import { boundFor, entitlementOf } from './earnedRecruitment';
import { stockedByEntry } from './entryGrants';

export type Severity = 'error' | 'warning' | 'info';

export interface Violation {
  severity: Severity;
  /** Stable code so the UI can group and the tests can assert. */
  code:
    | 'over-budget-ducats'
    | 'over-budget-glory'
  | 'strongbox-overdrawn'
    | 'unit-max'
    | 'unit-min'
    | 'wargear-limit'
    | 'wargear-restricted'
    | 'variant-forbids'
    | 'variant-requires'
    | 'variant-requires-gear'
    | 'battlekit-limit'
    | 'unknown-profile'
    | 'faction-rule'
    | 'wargear-not-stocked'
    | 'variant-grant-exceeded'
    | 'force-over-threshold'
    | 'force-over-field-strength'
    | 'unparsed-restriction'
    | 'restriction-unverified'
    | 'option-group-max'
    | 'option-group-distinct'
    | 'third-party-not-allowed'
    | 'mercenary-extra-battlekit'
    | 'mercenary-melee-required'
    | 'variant-locked';
  message: string;
  /** Which rule said so, for the "why?" affordance. */
  rule?: string;
  unitId?: string;
  profileId?: string;
}

export interface ValidationResult {
  legal: boolean;
  violations: Violation[];
  errors: Violation[];
  warnings: Violation[];
}

const err = (v: Omit<Violation, 'severity'>): Violation => ({ severity: 'error', ...v });
const warn = (v: Omit<Violation, 'severity'>): Violation => ({ severity: 'warning', ...v });

/* ------------------------------------------------------------------ helpers */

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/* ---------------------------------------------------------------- the rules */

/**
 * Recruitment limits. The catalogues express "0-2 Sniper Priests" as a
 * roster-scoped max of 2, and "A New Antioch Warband must include 1
 * Lieutenant" as a min of 1 — neither of which the old data carried at all.
 */
function checkRecruitmentLimits(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  variant?: WarbandVariant
): Violation[] {
  const out: Violation[] = [];
  const counts = new Map<string, number>();
  const revealed = variantReveals(variant);

  for (const u of roster.units) {
    counts.set(u.profileId, (counts.get(u.profileId) ?? 0) + 1);
  }

  for (const [profileId, n] of counts) {
    const p = profiles.get(profileId);
    if (!p) {
      out.push(err({
        code: 'unknown-profile',
        message: `${n} model(s) reference a profile that is not in this ruleset.`,
        profileId,
      }));
      continue;
    }
    // The variant moves the bound before it is checked, so the message quotes
    // the limit actually in force rather than the base one.
    const { max: variantMax } = variantLimits(p, variant);
    /*
      And then a bound the Warband may have EARNED. The Amalgam's base 1 is
      correct as a base — *Curse on Creation* raises it to 2 for a Warband that
      has paid six Grail Thralls for it, and until this existed the app had no
      state that could tell a legal second Amalgam from an illegal one (RC-08).
    */
    const max = boundFor(p, roster.earnedRecruitment, variantMax);
    const earned = entitlementOf(p);
    if (max != null && n > max) {
      out.push(err({
        code: 'unit-max',
        message: `${p.name}: ${n} taken, limit is ${max}.`
          + (earned && max !== earned.max
            ? ` ${earned.grantedBy} would raise it to ${earned.max}.` : ''),
        rule: max === p.max ? `0-${max} ${p.name}`
              : earned && max === earned.max ? earned.text
              : `${variant?.name}: 0-${max} ${p.name} (base ${p.max})`,
        profileId,
      }));
    }
  }

  // Entries the variant forbids outright.
  const forbidden = variantForbids(variant);
  if (forbidden.size) {
    for (const [profileId, n] of counts) {
      const p = profiles.get(profileId);
      if (!p) continue;
      if (!forbidden.has(p.entryId ?? p.id)) continue;
      out.push(err({
        code: 'variant-forbids',
        message: `${variant?.name} cannot include ${p.name} — ${plural(n, p.name)} taken.`,
        rule: `${variant?.name}: ${p.name} is not available to this variant`,
        profileId,
      }));
    }
  }

  // A required entry is one the faction must include. Only enforce it for
  // profiles belonging to this roster's faction, or every faction's required
  // leader would fire at once.
  for (const p of profiles.values()) {
    if (!p.min || p.min < 1) continue;
    if (p.factionId && roster.factionId && !factionMatches(p.factionId, roster.factionId)) continue;
    // A variant can raise a required minimum (House of Wisdom: 1-2 Alchemists)
    // or forbid the entry entirely, in which case there is nothing to require.
    if (variantForbids(variant).has(p.entryId ?? p.id)) continue;
    /*
      Nor require a model the Warband cannot recruit.

      `Chieftain` is the Children of Yggdrasil leader: hidden in the catalogue,
      revealed by that Variant, and carrying `min=1`. Enforced regardless, every
      Trench Pilgrims Warband was told it "must include 1 Chieftain" — a model
      absent from its recruit list, under a Variant it had not taken, while the
      leader it actually needs is the War Prophet.

      Hidden-and-unrevealed is the same state as forbidden: not on this list.
    */
    if (p.hiddenByDefault && !revealed.has(p.entryId ?? p.id)) continue;
    const { min } = variantLimits(p, variant);
    if (!min || min < 1) continue;
    const n = counts.get(p.id) ?? 0;
    if (n < min) {
      out.push(err({
        code: 'unit-min',
        message: `A ${variant?.name ?? roster.factionId} warband must include ` +
                 `${plural(min, p.name)} — ${n} taken.`,
        rule: min === p.min ? `must include ${min} ${p.name}`
                            : `${variant?.name}: must include ${min} ${p.name}`,
        profileId: p.id,
      }));
    }
  }

  return out;
}

/** Catalogue faction ids are file names ("Iron Sultanate"); rosters use slugs. */
export function factionMatches(a: string, b: string): boolean {
  const k = nameKey;
  return k(a) === k(b) || k(a).includes(k(b)) || k(b).includes(k(a));
}

/**
 * What the model IS, for a restriction that names a kind of model.
 *
 * FD-17 finding 2. The Iron Sultanate's Reinforced Armour row reads "ELITE &
 * Janissaries only", and an "X & Y only" stipulation admits either — so a
 * Favoured Kavass, an Azeb promoted to ELITE, may wear it. The gate agreed;
 * it was being handed the wrong subject. This call passed the DATASET ENTRY,
 * whose Keywords are `["SULTANATE"]` and whose role is `Troop`, because that
 * is what the Azeb entry is. An Elite Promotion does not rewrite the entry —
 * it writes `Elite` onto the model — so no promoted model could ever satisfy
 * a requirement naming ELITE, and Idris the Relic Hound was refused armour
 * the book gives it.
 *
 * The entry's answers and the model's are UNIONED rather than either winning:
 * the entry says what the model is by type, the model says what it has become.
 *
 * `name` stays the entry's. `u.name` is the player's own text — "Idris the
 * Relic Hound" — and `matchesIdentity` matches loosely by containment, so a
 * model someone called "Janissary Hunter" would let itself through every
 * Janissary-only row in the table.
 */
function identityOf(
  u: Roster['units'][number],
  profile: UnitProfile,
): { name: string; keywords: string[]; roles: string[] } {
  return {
    name: profile.name,
    keywords: [...(profile.keywords ?? []), ...(u.keywords ?? [])],
    roles: [...(profile.roles ?? []), ...(u.roles ?? [])],
  };
}

/** Wargear legality from the Armoury Table restriction text. */
function checkWargear(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  weapons: Map<string, { id: string; name: string; restrictions?: string[] }>,
  armoury?: Armoury,
  /** Needed to follow a variant's cross-faction armoury grants. */
  dataset?: Dataset,
  variant?: WarbandVariant
): Violation[] {
  const out: Violation[] = [];
  const rosterCounts = new Map<string, { name: string; count: number }>();

  /*
    The Arsenal counts towards a roster-wide `Limit: N`.

    Page 123, L7234–7238: "if the Battlekit had a Limit of 2, and your Warband
    already has 2 such items in its Arsenal and/or equipped by a model, then you
    could not purchase any more". The count was built from the models' `items`
    alone, so a Warband could hold a Limit 1 item in the Arsenal and buy a
    second onto a model — and the Quartermaster Step is exactly where a player
    buys into the Arsenal, so the omission bit hardest in the place the rule is
    printed.

    The same sentence gives the other half for free: "if your Warband used to
    have 2 of the Battlekit and one has subsequently been removed … then you
    could purchase a replacement." Nothing is needed for that — a sold copy
    leaves `stash` and the count falls with it.

    Only the roster-wide limit reads this. A `Limit: N per model` is a
    statement about a model, and an item in the Arsenal is on no model.
  */
  /*
    Counted by NAME, not by catalogue id.

    Keying on `weaponId` skipped every row the catalogues cannot name, and the
    Glory Item Tables are full of them: a Sniper Scope, a Trench Dog, a
    Smokescreen, an Executioner's Axe and Beelzebub's Embrace all carry
    `weaponId: null`, so five of the items whose whole stipulation is a limit
    were the five the limit did not reach. The Armoury row states the limit and
    `restrictionsFor` matches that row by name, so the name is the key the two
    halves already share.
  */
  const bump = (name: string | undefined, qty: number) => {
    const k = nameKey(name ?? '');
    if (!k) return;
    const at = rosterCounts.get(k);
    if (at) at.count += qty;
    else rosterCounts.set(k, { name: name!, count: qty });
  };

  for (const item of roster.stash) {
    bump(item.weaponId ? weapons.get(item.weaponId)?.name ?? item.name : item.name,
      item.quantity ?? 1);
  }

  for (const u of roster.units) {
    const profile = profiles.get(u.profileId);
    const perUnit = new Map<string, number>();

    for (const item of u.items) {
      const qty = item.quantity ?? 1;
      const named = item.weaponId ? weapons.get(item.weaponId) : undefined;
      /* Counted whether or not the catalogues carry a profile for it — see
         `bump`. Everything BELOW still needs the profile and stops without it,
         which is unchanged: a restriction is read off the armoury row, and the
         roster-wide limit below is what reads it for these. */
      bump(named?.name ?? item.name, qty);
      if (!item.weaponId) continue;
      perUnit.set(item.weaponId, (perUnit.get(item.weaponId) ?? 0) + qty);

      const w = named;
      if (!w) continue;

      // A faction that does not stock an item cannot buy it. This is a real
      // rule the old data could not express: the armoury *is* the list of what
      // is available, not merely what it costs.
      if (armoury && !stocks(armoury, w)) {
        // A variant can extend the armoury, so the faction's own table is not
        // the whole picture. Cross-faction grants are followed — Knights of
        // Avarice's *Corrupt Merchants* buys from New Antioch and the Iron
        // Sultanate — and an item a grant covers is simply legal.
        const reach = dataset
          ? stockedAnywhere(dataset, roster.factionId, variant, w)
          : { stocked: false, via: null };
        if (reach.stocked) continue;

        /*
          Nor is the Armoury Table the only thing that stocks kit. FD-17
          finding 3: entry-granted kit — an entry's own option or fixed kit —
          is stocked by the entry and is never measured against the Armoury
          Table, and the same holds for a campaign award.

          This sat below `stocks` and `stockedAnywhere` deliberately. An item
          the faction really does buy is answered by the table first, so the
          grant is only ever consulted for kit the table has no row for.

          See `rules/entryGrants.ts` for each granter and the measurement
          behind it. It is what made the owner's August roster report five
          violations: the Sapper's own Shovel, a Fireteam's Coordinated
          Engagement twice, the Alchemist's Secrets of Takwin and the Fire
          Shield a Homunculus has because Human Hands grants it.
        */
        if (stockedByEntry(profile, u.traits ?? [], {
          weaponId: item.weaponId, name: w.name,
          type: (w as { type?: string }).type,
          factionId: (w as { factionId?: string | null }).factionId,
        })) continue;

        // Still advisory rather than blocking, and now for a narrower reason.
        // Two kinds of armoury rule remain unreadable: a variant with its own
        // Armoury Table the pipeline does not parse, and price or restriction
        // overrides stated in prose. Where a variant has one of those, the item
        // may well be legal, so the warning names the rule to check.
        const open = dataset && variant
          ? variantArmoury(variant, roster.factionId,
                           (dataset.armouries ?? []).map((a) => a.factionId)).unreadable
          : [];
        out.push(warn({
          code: 'wargear-not-stocked',
          message: `${w.name} is not in the ${armoury.faction} Armoury Table` +
                   (open.length
                     ? ` — check ${open.map((o) => `“${o.rule}”`).join(' and ')}.`
                     : ', and no rule this warband has grants it.'),
          rule: open.length
            ? `${armoury.faction} Armoury Table. ${variant?.name} has armoury rules ` +
              `whose effect is stated in prose and not yet modelled.`
            : `${armoury.faction} Armoury Table. A faction may only buy from an ` +
              `armoury it can reach.`,
          unitId: u.id,
        }));
        continue;
      }

      for (const r of restrictionsOf(w, armoury)) {
        const catalogueWeapon = item.weaponId ? weapons.get(item.weaponId) : undefined;
        const onlyForContext = {
          // Purchased options AND what the model simply has. A Formula the
          // model was advanced into is not a line item on the roster, but the
          // catalogue gates the entry on its name all the same.
          selections: [
            ...(u.options?.map((o) => o.name ?? '') ?? []),
            ...(u.traits ?? []),
          ].filter(Boolean),
          unlockedBy: (catalogueWeapon as { unlockedBy?: string[] } | undefined)?.unlockedBy,
          /*
            The condition half of a compound restriction, and ONLY the
            purchased options — `traits` above carries the entry's own printed
            abilities, and "with Janissary Veteran" asks what the player bought.
          */
          taken: u.options?.map((o) => o.name ?? '').filter(Boolean) ?? [],
        };
        if (r.kind === 'onlyFor' && profile) {
          const verdict = onlyForVerdict(r.requires, identityOf(u, profile), onlyForContext);
          if (!verdict.met) {
            out.push(err({
              code: 'wargear-restricted',
              message: `${profile.name} cannot take ${w.name} — ${r.raw}.`,
              rule: r.raw, unitId: u.id,
            }));
          } else if (verdict.unknown) {
            /*
              The identity half of a compound restriction is satisfied and the
              condition half cannot be read off the roster. Warned, not refused:
              refusing would make the entry unbuyable by anyone, which is the
              same silence as permitting it, pointed the other way.

              Before RC-06 this branch did not exist and neither did the
              warning — "Janissaries & Yüzbaşı with Janissary Veteran" parsed
              cleanly as `onlyFor`, so it never reached `unparsed-restriction`
              either, and an Azeb could be handed the Regimental Kaşık with
              nothing on screen at all.
            */
            out.push(warn({
              code: 'restriction-unverified',
              message: `${profile.name} may take ${w.name}, but "${r.raw}" `
                     + `${verdict.unknown} — check this by hand.`,
              rule: r.raw, unitId: u.id,
            }));
          }
        }
        if (r.kind === 'limit' && r.perModel != null) {
          const n = perUnit.get(item.weaponId) ?? 0;
          if (n > r.perModel) {
            out.push(err({
              code: 'wargear-limit',
              message: `${profile?.name ?? 'model'} has ${n}× ${w.name}, limit is ${r.perModel} per model.`,
              rule: r.raw, unitId: u.id,
            }));
          }
        }
        if (r.kind === 'unparsed') {
          out.push(warn({
            code: 'unparsed-restriction',
            message: `${w.name}: "${r.raw}" — check this by hand, TrenchLine cannot verify it yet.`,
            rule: r.raw, unitId: u.id,
          }));
        }
      }
    }
  }

  /*
    Roster-wide "Limit: N", over everything the Warband holds — on a model or in
    the Arsenal, with a catalogue profile or without one.

    `restrictionsOf` reads the stipulation off the Armoury row, and
    `restrictionsFor` matches that row by id OR by name, so an item the
    catalogues cannot name is still checked against the row that priced it.
  */
  /* Name -> the weapon entry, for the rows that have one. Where there is no
     armoury to read a stipulation from — a hand-built dataset in a test, a
     ruleset with no tables — the weapon's own `restrictions` are the only
     source, and they are on that entry. */
  const weaponByName = new Map<string, { id: string; name: string; restrictions?: string[] }>();
  for (const w of weapons.values()) {
    const k = nameKey(w.name);
    if (k && !weaponByName.has(k)) weaponByName.set(k, w);
  }

  for (const { name, count } of rosterCounts.values()) {
    const offer = weaponByName.get(nameKey(name)) ?? { name };
    for (const r of restrictionsOf(offer, armoury)) {
      if (r.kind === 'limit' && r.perModel == null && count > r.max) {
        out.push(err({
          code: 'wargear-limit',
          message: `${name}: ${count} taken across the warband, limit is ${r.max}.`,
          rule: r.raw,
        }));
      }
    }
  }

  return out;
}

/**
 * The restrictions in force for this warband.
 *
 * The faction's armoury is authoritative, because the same weapon is restricted
 * differently by different factions — an Automatic Rifle is `Limit: 1` for New
 * Antioch and `Limit: 2` for the Heretic Legions. The weapon's own list is the
 * union across every armoury, and is only a fallback for a roster whose faction
 * we could not match.
 */
function restrictionsOf(
  w: { id?: string; name: string; restrictions?: string[] },
  armoury?: Armoury
): Restriction[] {
  const text = armoury ? restrictionsFor(armoury, w) : (w.restrictions ?? []);
  return text.flatMap(parseRestrictions);
}

/* ------------------------------------------------------- variant mechanics */

/**
 * A variant's effect on a unit's recruitment limits, taken from its derived
 * ops rather than from prose.
 *
 * "Pride of Jabir: a House of Wisdom Warband can include 0-3 Lions of Jabir" is
 * an `increment` of 1 on the Lion's roster-max constraint. Reading it from the
 * catalogue beats regexing the sentence: the sentence wraps across lines in the
 * PDF, phrases the same rule three different ways across variants, and says
 * nothing at all for the three variants the PDF extraction never produced.
 */
export function variantLimits(
  profile: UnitProfile,
  variant: WarbandVariant | undefined
): { min: number | null; max: number | null } {
  let { min, max } = profile;
  const key = profile.entryId ?? profile.id;

  for (const op of (variant?.ops ?? []) as VariantOp[]) {
    if (op.target?.id !== key) continue;
    if (!op.field?.startsWith('constraint:')) continue;

    const id = op.field.slice('constraint:'.length);
    const c = profile.constraints?.find((x) => (x as { id?: string }).id === id);
    // The op may name a bound directly (`-min` / `-max`), otherwise the
    // constraint it points at says which one it is.
    const bound = op.constraintBound ?? c?.type;
    if (bound !== 'min' && bound !== 'max') continue;

    const value = Number(op.value);
    if (!Number.isFinite(value)) continue;
    const current = bound === 'min' ? min : max;
    const next =
      op.op === 'set' ? value
      : op.op === 'increment' ? (current ?? 0) + value
      : op.op === 'decrement' ? (current ?? 0) - value
      : current;

    if (bound === 'min') min = next; else max = next;
  }
  return { min, max };
}

interface VariantOp {
  op: string;
  field: string;
  value: string;
  constraintBound?: 'min' | 'max';
  target?: { kind: string; id: string; name?: string };
}

/**
 * Entries a variant forbids outright. The catalogues express this as
 * `set hidden = true` on the unit, conditioned on the variant — the
 * machine-readable form of "a House of Wisdom Warband cannot include a
 * Yüzbaşı, Janissaries, or Sultanate Assassins".
 */
/**
 * Entries a variant brings back onto the list — the mirror of `variantForbids`.
 *
 * The catalogues state it as `set hidden = false` on the entry, conditioned on
 * the variant, which is how the Children of Yggdrasil reveals its Chieftain
 * and Huscarl and how The House of Wisdom reveals the Homunculus.
 */
export function variantReveals(variant: WarbandVariant | undefined): Set<string> {
  const out = new Set<string>();
  for (const op of (variant?.ops ?? []) as VariantOp[]) {
    if (op.field === 'hidden' && String(op.value) === 'false' && op.target?.id) {
      out.add(op.target.id);
    }
  }
  return out;
}

export function variantForbids(variant: WarbandVariant | undefined): Set<string> {
  const out = new Set<string>();
  for (const op of (variant?.ops ?? []) as VariantOp[]) {
    if (op.field === 'hidden' && String(op.value) === 'true' && op.target?.id) {
      out.add(op.target.id);
    }
  }
  return out;
}

/**
 * Warband Variant rules — "cannot include Trench Moles", "must include 1
 * Trench Cleric". Seventeen variants; the app supported none.
 */
function checkVariant(
  roster: Roster,
  variant: WarbandVariant | undefined,
  profiles: Map<string, UnitProfile>
): Violation[] {
  if (!variant) return [];
  // Where the catalogues gave us ops, they are the authority: they are exact,
  // they cover the three variants the PDF extraction missed, and they do not
  // depend on a sentence surviving a PDF line wrap. The prose reader below is
  // the fallback for a variant that has no derived ops at all.
  if (variant.ops?.length) return [];
  const out: Violation[] = [];

  const names = roster.units
    .map((u) => profiles.get(u.profileId)?.name?.toLowerCase())
    .filter(Boolean) as string[];
  const has = (needle: string) =>
    names.some((n) => n.includes(needle.toLowerCase()) || needle.toLowerCase().includes(n));

  for (const rule of variant.specialRules ?? []) {
    const text = `${rule.name}: ${rule.description}`;

    // "A House of Wisdom Warband cannot include a Yüzbaşı, Janissaries, or
    // Sultanate Assassins."
    const forbids = rule.description.match(/cannot include ([^.]+)/i);
    if (forbids) {
      for (const raw of splitList(forbids[1])) {
        if (has(raw)) {
          out.push(err({
            code: 'variant-forbids',
            message: `${variant.name} cannot include ${raw}.`,
            rule: text,
          }));
        }
      }
    }

    // "must include 1 Trench Cleric" / "must include 1-2 Jabirean Alchemists".
    // The range form gives a minimum of 1 and a maximum of 2; only the minimum
    // is a legality failure, so read the lower bound.
    const requires = rule.description.match(/must include\s+(?:(\d+)\s*(?:[-–]\s*\d+)?\s+)?([^.]+)/i);
    if (requires) {
      const need = Number(requires[1] ?? 1);
      for (const raw of splitList(requires[2])) {
        const n = names.filter((n) => n.includes(raw.toLowerCase()) || raw.toLowerCase().includes(n)).length;
        if (n < need) {
          out.push(err({
            code: 'variant-requires',
            message: `${variant.name} must include ${plural(need, raw)} — ${n} taken.`,
            rule: text,
          }));
        }
      }
    }
  }

  return out;
}

/** "a Yüzbaşı, Janissaries, or Sultanate Assassins" -> three names. */
function splitList(s: string): string[] {
  return s
    .replace(/\bor\b|\band\b/gi, ',')
    .split(',')
    .map((x) => x.replace(/^\s*(a|an|the)\s+/i, '').trim())
    .filter((x) => x.length > 2);
}

/* ------------------------------------------------------ faction-level rules */

/**
 * Faction special rules, which apply to every warband of that faction
 * *including its variants* — distinct from the variant rules above.
 *
 * Only New Antioch and the Black Grail have any: the other four factions
 * state, in the book, that they have none. The one with a countable bound is
 * the Fireteam cap:
 *
 *     New Antioch Fireteams: A New Antioch Warband can include up to 2
 *     Fireteams.
 *
 * A variant can move it — "a Stosstruppen of the Free State of Prussia Warband
 * can include up to 3 Fireteams instead of only 2" — so the variant's own rules
 * are read second and win.
 */
const FIRETEAM_CAP = /can include up to (\d+)\s+Fireteams?/i;

export function fireteamCap(
  faction: { specialRules?: FactionSpecialRule[] } | undefined,
  variant: WarbandVariant | undefined
): number | null {
  let cap: number | null = null;
  for (const r of faction?.specialRules ?? []) {
    const m = r.description?.match(FIRETEAM_CAP);
    if (m) cap = Number(m[1]);
  }
  for (const r of variant?.specialRules ?? []) {
    const m = r.description?.match(FIRETEAM_CAP);
    if (m) cap = Number(m[1]);          // the variant overrides the faction
  }
  return cap;
}

function checkFactionRules(
  roster: Roster,
  faction: { name?: string; specialRules?: FactionSpecialRule[] } | undefined,
  variant: WarbandVariant | undefined
): Violation[] {
  const cap = fireteamCap(faction, variant);
  if (cap == null) return [];

  // A Fireteam is a pair, so two models carrying the keyword are one team.
  const inFireteams = roster.units.filter((u) => u.fireteam).length;
  const teams = Math.ceil(inFireteams / 2);
  if (teams <= cap) return [];

  return [err({
    code: 'faction-rule',
    message: `${teams} Fireteams — ${variant?.name ?? faction?.name} allows up to ${cap}.`,
    rule: `${faction?.name} Fireteams: can include up to ${cap} Fireteams`,
  })];
}

/* ---------------------------------------------------------------- entry point */

export function validateRoster(roster: Roster, dataset: Dataset): ValidationResult {
  const profiles = byId(dataset.units);
  const weapons = byId(dataset.weapons as { id: string; name: string; restrictions?: string[] }[]);
  const variant = (dataset as unknown as { variants?: WarbandVariant[] }).variants
    ?.find((v) => v.id === roster.variantId || v.name === roster.variantId);

  const violations: Violation[] = [];

  const budget = budgetState(roster);
  if (budget.overDucats) {
    violations.push(err({
      code: 'over-budget-ducats',
      message: `Over budget by ${-budget.remaining.ducats} Ducats ` +
               `(${budget.spent.ducats} of ${budget.budget.ducats}).`,
    }));
  }
  if (budget.overGlory) {
    violations.push(err({
      code: 'over-budget-glory',
      message: `Over budget by ${-budget.remaining.glory} Glory ` +
               `(${budget.spent.glory} of ${budget.budget.glory}).`,
    }));
  }

  /*
    An overdrawn Strongbox, refused here rather than on the button.

    FD-05e made the builder's remaining figure the Strongbox and FD-05e-2 made
    every purchase spend it, so a muster can now run the balance negative. The
    builder does not block that — a player part-way through a list is over for
    a moment and then trims, and a button that will not press while they
    rearrange is the worse failure — but a roster that is still overdrawn must
    not reach a game or the post-battle wizard, because every number those
    produce would be built on Ducats the Warband does not have.

    **Both currencies (FD-05h).** This read `strongbox.ducats` alone, which was
    the whole reason a Glory-priced hire went uncharged: charging one would
    have driven a Warband negative in a currency nothing checked, so the hire
    charged nothing instead and the model was free. A Strongbox is a `Cost`,
    and either half of it can go under. The message names the currency because
    a player told only that they are "overdrawn by 5" would go looking through
    a Ducat balance that is fine.

    One violation, not one per currency: a muster that is short of both is one
    roster to trim, and `formatCost` already spells a two-currency shortfall.
  */
  const short: Cost = {
    ducats: Math.max(0, -(roster.strongbox?.ducats ?? 0)),
    glory: Math.max(0, -(roster.strongbox?.glory ?? 0)),
  };
  if (!isZero(short)) {
    violations.push(err({
      code: 'strongbox-overdrawn',
      message: `Strongbox overdrawn by ${formatCost(short)}.`,
    }));
  }

  violations.push(...checkRecruitmentLimits(roster, profiles, variant));
  const armoury = armouryFor(dataset, roster.factionId);
  violations.push(...checkWargear(roster, profiles, weapons, armoury, dataset, variant));
  violations.push(...checkVariant(roster, variant, profiles));
  violations.push(...checkVariantGear(roster, variant, profiles, dataset, armoury, weapons));
  violations.push(...checkBattlekitLimits(roster, profiles, dataset, armoury, weapons));
  violations.push(...checkMercenaryKit(roster, profiles, weapons));

  const faction = (dataset as unknown as { factions?: { id: string; name: string;
    specialRules?: FactionSpecialRule[] }[] }).factions
    ?.find((f) => factionMatches(f.id, roster.factionId) || factionMatches(f.name, roster.factionId));
  violations.push(...checkFactionRules(roster, faction, variant));
  violations.push(...checkThirdParty(roster, profiles));
  violations.push(...checkVariantLocks(roster, dataset, variant));
  violations.push(...checkVariantGrants(roster, dataset, variant, weapons));
  violations.push(...checkOptionGroups(roster, dataset));

  const errors = violations.filter((v) => v.severity === 'error');
  return {
    legal: errors.length === 0,
    violations,
    errors,
    warnings: violations.filter((v) => v.severity === 'warning'),
  };
}

/**
 * Limits that govern an option group rather than one option.
 *
 * The Black Grail's Strains and Vile Corpus shipped as independent toggles with
 * empty constraints, so a Thrall could hold all four Strains and two Amalgams
 * could hold the same Corpus (RC-07). The counting is in `rules/optionGroups.ts`
 * with the rules' own sentences; this turns each breach into a violation that
 * names the sentence.
 */
function checkOptionGroups(roster: Roster, dataset: Dataset): Violation[] {
  return groupBreaches(dataset, roster).map((b) => (b.kind === 'over-allowance'
    ? err({
      code: 'option-group-max',
      message: `${b.unitName} has ${plural(b.held.length, b.group.replace(/s$/, ''))} `
             + `(${b.held.join(', ')}); the limit is ${b.max}.`,
      rule: b.rule,
      unitId: b.unitId,
    })
    : err({
      code: 'option-group-distinct',
      message: `${b.unitName} shares its ${b.group} (${b.shared}) with another model.`,
      rule: b.rule,
      unitId: b.unitId,
    })));
}

/**
 * How much a variant's cross-faction grant actually allows.
 *
 * `variantArmoury` has read these since it was written and nothing counted
 * them. The House of Wisdom's *Weapon Collections* says "you can purchase 1
 * piece of Battlekit from the New Antioch Armoury, and 1 piece of Battlekit
 * from the Trench Pilgrims Armoury"; `stockedAnywhere` answered "yes, that is
 * stocked somewhere you can reach" and a roster with five New Antioch items
 * validated clean. The rule was half-applied, which is the worst of the three
 * states — the app looked like it was checking.
 *
 * Only items reachable ONLY through a grant are counted. Something the
 * faction's own armoury stocks is not spending the allowance, whichever other
 * table also happens to carry it.
 *
 * An error rather than a warning: the count comes from the rule's own sentence
 * and the catalogue's own FAQ, with nothing inferred. Where the number is what
 * cannot be read — a grant whose rule states no count — `withinGrants` treats
 * it as unbounded and says nothing, which is this codebase's standing answer
 * to a rule it cannot read.
 */
function checkVariantGrants(
  roster: Roster,
  dataset: Dataset,
  variant: WarbandVariant | undefined,
  weapons: Map<string, { id: string; name: string }>,
): Violation[] {
  if (!variant) return [];

  const known = (dataset.armouries ?? []).map((a) => a.factionId);
  const { grants } = variantArmoury(variant, roster.factionId, known);
  if (!grants.length) return [];

  const own = armouryFor(dataset, roster.factionId);
  const usage: GrantUsage[] = [];

  for (const u of roster.units) {
    for (const item of [...u.items, ...u.options]) {
      const w = item.weaponId ? weapons.get(item.weaponId) : undefined;
      const ref = w ?? (item.name ? { name: item.name } : undefined);
      if (!ref) continue;

      // Stocked at home: not spending anybody's allowance.
      if (own && offersOf(own, ref).length) continue;

      const via = grants.filter((g) => offersOf(armouryFor(dataset, g.factionId), ref).length);
      if (!via.length) continue;   // `wargear-not-stocked` has this one.

      /* Per COPY, not per name. MISC. Q4 in the catalogue's FAQ: "You can only
         purchase one of each piece of Battlekit." A second copy of the chosen
         piece is a second piece. */
      for (let n = 0; n < (item.quantity ?? 1); n += 1) usage.push({ item: ref, via });
    }
  }

  if (!usage.length) return [];

  const fits = withinGrants(usage);
  /* `null` is the search giving up, which is neither answer. Saying nothing
     beats reporting a roster illegal on the strength of not having finished
     looking. */
  if (fits !== false) return [];

  const byRule = [...new Set(grants.map((g) => g.rule))].join(' and ');
  const allowance = grants
    .map((g) => `${g.limit ?? 'any number'} from ${armouryFor(dataset, g.factionId)?.faction ?? g.factionId}`)
    .join(', ');

  return [err({
    code: 'variant-grant-exceeded',
    message:
      `${usage.length} pieces of Battlekit come from armouries only `
      + `${byRule} reaches: ${[...new Set(usage.map((x) => x.item.name))].join(', ')}. `
      + `The allowance is ${allowance}.`,
    rule: `${variant.name} — ${byRule}.`,
  })];
}

/**
 * The rulebook's per-model carrying limits.
 *
 * "Unless otherwise stated a model is limited to the following Battlekit:
 * …One suit of Armour. One Shield…" — six bullets the app enforced nowhere, so
 * a model could wear three suits of Armour and validate clean.
 *
 * The numbers are `dataset.battlekitLimits`, parsed off that page; the counting
 * is `battlekitBreaches`. An older ruleset that carries no limits is not
 * policed rather than declared legal — absent means unknown.
 *
 * Errors, not warnings: these are the rules that decide what a model may take
 * to a table. The violation quotes the published sentence rather than a
 * paraphrase, because the player's next move is to check it.
 */
/**
 * A Mercenary carrying what it may not, and one missing what it must.
 *
 * "A Mercenaries' Battlekit cannot be removed or lost over the course of the
 * campaign for any reason, and they cannot have any other Battlekit"
 * (Warbands L9751-9752). `equipGate.ts` stops the player reaching this from
 * the equip sheet; this is what catches a roster that already has it — an
 * import, a cloud pull, or a Warband built before the gate shipped.
 *
 * The exception, and the requirement, are the same entry's. The Scripture
 * Guardian "must have either two 1-Handed Melee Weapons or one 2-Handed Melee
 * Weapon" (Dispatch L748-749), so a Guardian with neither is not illegal — it
 * is unfinished, and says so as a warning rather than refusing the roster.
 *
 * Silent where the entry's own Battlekit is not in the dataset: the rule
 * forbids any OTHER Battlekit, and the app cannot name what is "other" when it
 * does not hold the kit. See `mercenaryRefusal` for the Mamluk Faris case.
 */
function checkMercenaryKit(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  weapons: Map<string, { id: string; name: string; range?: string; type?: string }>,
): Violation[] {
  const out: Violation[] = [];

  for (const u of roster.units) {
    const profile = profiles.get(u.profileId);
    if (!profile) continue;
    if (!(profile.roles ?? []).some((r) => r.toLowerCase() === 'mercenary')) continue;

    const kit = profile.battlekit ?? [];
    if (!kit.length) continue;

    const kitNames = new Set(kit.map((b) => nameKey(b.name)));
    const kitIds = new Set(kit.map((b) => b.id));
    const mayBuyMelee = (profile.mercenaryMayBuy ?? []).includes('Melee');
    let meleeHands = 0;

    for (const item of u.items) {
      const w = item.weaponId ? weapons.get(item.weaponId) : undefined;
      const name = item.name ?? w?.name ?? '';
      if (!name && !item.weaponId) continue;
      /* Granted by the entry itself, or a Variant, is not "other". */
      if (item.grantedBy) continue;
      if (item.weaponId && kitIds.has(item.weaponId)) continue;
      if (nameKey(name) && kitNames.has(nameKey(name))) continue;

      const isMelee = (w?.range ?? '').trim().toLowerCase() === 'melee'
        && !/armour/i.test(w?.type ?? '');
      if (mayBuyMelee && isMelee) {
        meleeHands += /2-?handed/i.test(w?.type ?? '') ? 2 : 1;
        continue;
      }

      out.push(err({
        code: 'mercenary-extra-battlekit',
        message: `${profile.name} cannot have ${name || 'that'}: a Mercenary may `
               + 'have no Battlekit but its own.',
        rule: "A Mercenaries' Battlekit cannot be removed or lost over the course "
            + 'of the campaign for any reason, and they cannot have any other '
            + 'Battlekit.',
        unitId: u.id,
        profileId: u.profileId,
      }));
    }

    /*
      Two 1-Handed or one 2-Handed, counted in hands so the two readings share
      one number. A warning: an unfinished model is not an illegal one, and
      refusing the roster would stop a player saving a Warband mid-build.
    */
    if (mayBuyMelee && meleeHands !== 2) {
      out.push(warn({
        code: 'mercenary-melee-required',
        message: `${profile.name} must have either two 1-Handed Melee Weapons or `
               + `one 2-Handed Melee Weapon (it has ${meleeHands === 0 ? 'none'
                 : `${meleeHands} hand${meleeHands === 1 ? '' : 's'}' worth`}).`,
        rule: 'In addition, it must have either two 1-Handed Melee Weapons or one '
            + '2-Handed Melee Weapon.',
        unitId: u.id,
        profileId: u.profileId,
      }));
    }
  }

  return out;
}

function checkBattlekitLimits(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  dataset: Dataset,
  armoury: Armoury | undefined,
  weapons: Map<string, { id: string; name: string }>,
): Violation[] {
  if (!dataset.battlekitLimits?.limits?.length) return [];

  const out: Violation[] = [];
  for (const u of roster.units) {
    const carried = u.items.map((item) => ({
      name: item.name ?? (item.weaponId ? weapons.get(item.weaponId)?.name ?? '' : ''),
      weaponId: item.weaponId,
      quantity: item.quantity,
      grantedBy: item.grantedBy,
    })).filter((c) => c.name || c.weaponId);

    for (const b of battlekitBreaches(carried, {
      armoury, dataset, extraLimb: u.extraLimb, traits: u.traits,
      // The ENTRY's name, not the one the player typed: two entries state a
      // carrying allowance that belongs to the entry itself.
      modelName: profiles.get(u.profileId)?.name,
      // STRONG is a Keyword the model has, not a word in an ability's name.
      // The model's EFFECTIVE Keywords, computed with the ones its Formulae
      // grant. The base entry alone is why a legal Homunculus was told its
      // greatsword and sword needed three hands.
      keywords: u.keywords ?? profiles.get(u.profileId)?.keywords,
    })) {
      out.push(err({
        code: 'battlekit-limit',
        message: `${profiles.get(u.profileId)?.name ?? u.name}: ${b.message}`,
        rule: b.raw,
        unitId: u.id,
      }));
    }
  }
  return out;
}

/**
 * Gear a Variant requires a model to be wearing.
 *
 * "The Leper-Knights use the Lazarist Castigator Warband entry but must wear a
 * suit of Armour…" — a condition on the roster entry rather than a change to
 * the profile, so it lands here and not in `applyVariant`.
 *
 * What satisfies it is the Armoury Table SECTION, not the item's name. The
 * Procession of the Sacred Affliction stocks Holy Icon Armour, Ragged
 * Vestments, Reinforced Armour and Standard Armour under `Armour`; matching on
 * the word would let Armour-Piercing Bullets clear the requirement and would
 * refuse Ragged Vestments, which is the only one of the four a 50-Ducat model
 * can comfortably afford.
 *
 * An error rather than a warning: an unarmoured Leper-Knight is not a model
 * the book lets you field. Nothing is bought for the player — the fix is a
 * purchase, and which suit is theirs to choose.
 */
function checkVariantGear(
  roster: Roster,
  variant: WarbandVariant | undefined,
  profiles: Map<string, UnitProfile>,
  dataset: Dataset,
  armoury: Armoury | undefined,
  weapons: Map<string, { id: string; name: string }>,
): Violation[] {
  const required = (variant?.ops ?? []).filter(
    (op): op is Extract<LayerOp, { op: 'requireGear' }> => op.op === 'requireGear');
  if (!required.length) return [];

  const out: Violation[] = [];

  for (const op of required) {
    for (const u of roster.units) {
      const profile = profiles.get(u.profileId);
      if (!profile) continue;
      if ((profile.entryId || profile.id) !== op.target.id) continue;

      /*
        Both shapes of roster item. One priced from a catalogue weapon carries
        a `weaponId`; one priced straight off an Armoury Table row that has no
        profile behind it carries only a `name`, and `offersOf` matches either.
      */
      const worn = u.items.some((item) => {
        const name = item.name ?? (item.weaponId ? weapons.get(item.weaponId)?.name : undefined);
        if (!name && !item.weaponId) return false;
        return sectionsOf(armoury, { id: item.weaponId, name: name ?? '' })
          .some((section) => nameKey(section) === nameKey(op.section));
      });
      if (worn) continue;

      /*
        Name what they can actually buy. A legality error the player cannot act
        on is the same failure as no error at all, and the four suits differ by
        40 Ducats — which one is a real decision, so all of them are offered.
      */
      const offers = (armoury?.rows ?? [])
        .filter((r) => nameKey(r.section) === nameKey(op.section))
        .map((r) => r.name);

      out.push(err({
        code: 'variant-requires-gear',
        message: `${profile.name} must wear a suit of ${op.noun}` +
                 (offers.length ? ` — ${offers.join(', ')}.` : '.'),
        rule: `${variant!.name}: ${profile.name}s must wear a suit of ${op.noun}.`,
        unitId: u.id,
      }));
    }
  }

  return out;
}

/**
 * Models rostered outside the Variant that unlocks them.
 *
 * The recruit list will not offer one, so this fires when the Variant is
 * changed afterwards — which the roster screen allows until the first game.
 * An error, not a warning: the model is not one this Warband may field. The
 * fix is the player's, either Variant or model; nothing is removed for them.
 */
function checkVariantLocks(
  roster: Roster,
  dataset: Dataset,
  variant: WarbandVariant | undefined,
): Violation[] {
  const locks = variantLocks(dataset);
  if (!locks.size) return [];

  const entryIdOf = new Map(dataset.units.map((u) => [u.id, u.entryId || u.id]));
  const out: Violation[] = [];

  for (const u of roster.units) {
    const lock = locks.get(entryIdOf.get(u.profileId) ?? u.profileId);
    if (!lock || unlockedBy(lock, variant)) continue;
    out.push(err({
      code: 'variant-locked',
      message: `${u.name} may only be fielded by a ${lock.variantNames.join(' or ')} ` +
               'Warband.',
      rule: 'Warband Variant',
      unitId: u.id,
    }));
  }
  return out;
}

/**
 * Third-party models on a Warband that has not opted in.
 *
 * The recruit list hides them, so this only fires when the option was on and is
 * then turned off — a table changing its mind between games, which is a real
 * thing to do. An error rather than a warning: the model is not legal for this
 * Warband as it now stands, and the fix is to turn the option back on or drop
 * the model. Nothing is deleted on the player's behalf.
 */
function checkThirdParty(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
): Violation[] {
  if (roster.allowThirdParty) return [];
  const out: Violation[] = [];
  for (const u of roster.units) {
    const profile = profiles.get(u.profileId);
    if (!profile || !thirdPartyGate(profile).thirdParty) continue;
    out.push(err({
      code: 'third-party-not-allowed',
      message: `${u.name} is third-party content, which this Warband has not ` +
               'allowed. Turn on "3rd party" or remove the model.',
      rule: 'Allow Third-Party Mercenaries?',
      unitId: u.id,
    }));
  }
  return out;
}

/** Per-model cost, exposed so the UI need not import costs.ts separately. */
export { unitCost, budgetState };


/* ------------------------------------------------------------------ force */

/**
 * Whether the Force you would field is legal for this game of the campaign.
 *
 * Kept apart from `validateRoster` because it asks a different question. The
 * roster is what you *own* and it has no cap; the Force is what you *field* and
 * it has two. The book is explicit that the roster may exceed both:
 *
 *   "Your Warband's Threshold Value and/or its Field Strength may mean that you
 *    cannot take all of the models that are on your Warband Roster. When this is
 *    the case any models you do not use will have to sit the game out."
 *
 * So these are never errors against the roster. They say how much has to sit
 * out, which is a thing the player acts on, rather than telling them to delete a
 * model they are entitled to own.
 */
export function checkForceLimits(
  totalCost: number,
  modelCount: number,
  limits: { game: number; threshold: number; fieldStrength: number; extrapolated: boolean }
): Violation[] {
  const out: Violation[] = [];
  const past = limits.extrapolated
    ? ` The published table stops at game 12, so game ${limits.game} holds at the last row — set a campaign override if your group continues past it.`
    : '';

  if (totalCost > limits.threshold) {
    out.push({
      severity: 'warning',
      code: 'force-over-threshold',
      message:
        `Force costs ${totalCost} Ducats against a Threshold Value of ${limits.threshold} ` +
        `for game ${limits.game}. ${totalCost - limits.threshold} Ducats' worth must sit this game out.`,
      rule: 'Warband Threshold Table. The Threshold caps the Force you field, not the roster you own.' + past,
    });
  }

  if (modelCount > limits.fieldStrength) {
    out.push({
      severity: 'warning',
      code: 'force-over-field-strength',
      message:
        `${modelCount} models against a Field Strength of ${limits.fieldStrength} for game ` +
        `${limits.game}. ${modelCount - limits.fieldStrength} must sit this game out.`,
      rule:
        'Warband Threshold Table. Field Strength counts only models with a Warband Entry — ' +
        'Battlekit and Glory Items do not count. A scenario limit lower than Field Strength ' +
        'takes precedence over it.' + past,
    });
  }

  return out;
}
