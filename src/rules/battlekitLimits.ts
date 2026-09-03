/**
 * How much Battlekit one model may carry.
 *
 * The rulebook states this plainly and the app enforced none of it — a model
 * could wear three suits of Armour, carry two Shields and four 2-Handed
 * weapons, and validate clean. It is the last legality dimension in the
 * Battlekit chapter that nothing read.
 *
 *     BATTLEKIT LIMITS
 *     Unless otherwise stated a model is limited to the following Battlekit:
 *     ** One 2-Handed Ranged Weapon or two 1-Handed Ranged Weapons.
 *     ** One 2-Handed Melee Weapon or two 1-Handed Melee Weapons.
 *     ** One type of Grenade.
 *     ** One suit of Armour.
 *     ** One Shield (▶ see additional restrictions below).
 *     ** Any number of pieces of Equipment or Special Battlekit. A Model
 *        cannot have two or more … with the same Name.
 *
 * Every number here comes from `dataset.battlekitLimits`, parsed out of that
 * page. Nothing in this file decides what a limit *is*; it decides only how to
 * count a roster against one.
 *
 * The counting is per SECTION, as the Armoury Tables section their rows, which
 * also settles Dual-Purpose Battlekit for free: "a Pistol counts as a single
 * 1-Handed Weapon when determining how many Weapons a model can have", and a
 * Pistol occupies one row, in one section, so it is counted once.
 */
import type {
  Dataset, BattlekitLimit, BattlekitLimits, ShieldRestrictions, KeywordCarryRule,
} from '@/types/catalogue';
import { offersOf, sectionsOf, restrictionsFor, type Armoury } from './armoury';
import { parseRestrictions } from './restrictions';
import { nameKey } from './names';

/** One thing a model is carrying. */
export interface Carried {
  name: string;
  weaponId?: string;
  quantity?: number;
}

export interface BattlekitBreach {
  /** The published sentence this breaks, quoted rather than paraphrased. */
  raw: string;
  message: string;
  section: string;
}

/** What the model is, for the two rules that depend on it. */
export interface CarrierContext {
  armoury?: Armoury;
  dataset: Dataset;
  /**
   * The model has a third weapon hand.
   *
   * "Unless otherwise stated" is the first line of the rule, and this is the
   * app's existing answer to it — see `hasExtraLimb`. Honoured here so the
   * validator cannot contradict an equip the builder already allows: a model
   * offered a third weapon and then told it is illegal is worse than either
   * answer on its own.
   */
  extraLimb?: boolean;
  /**
   * The model's own Keywords.
   *
   * STRONG is one of the four carrying rules the Keyword Glossary states, and
   * the equip modal used to detect it with `/strong|bulky|large|ogre/i` over
   * ability NAMES. It is a keyword; the dataset carries it as one.
   */
  keywords?: string[];
}

const q = (i: Carried) => Math.max(1, i.quantity ?? 1);

/** The Armoury Table section an item is offered under, then the chapter's. */
function sectionOf(item: Carried, ctx: CarrierContext): string | undefined {
  const ref = { id: item.weaponId, name: item.name };
  const [fromArmoury] = sectionsOf(ctx.armoury, ref);
  if (fromArmoury) return fromArmoury;
  // A model can carry something its own faction does not stock — a variant's
  // cross-faction grant, or an item taken before a Variant changed. The
  // chapter still knows what kind of thing it is.
  return (ctx.dataset.battlekit ?? []).find((b) => nameKey(b.name) === nameKey(item.name))?.section;
}

/**
 * How many hands the item needs.
 *
 * The Battlekit chapter states it per entry (`1-Handed` / `2-Handed`) and the
 * catalogue states it as the profile's `type`. Absent from both, the item is
 * counted as needing none rather than guessed at one: a wrong guess here is a
 * legality error on a legal roster, which is the failure mode this codebase
 * has been paying for.
 */
function handsOf(item: Carried, ctx: CarrierContext): number | undefined {
  const key = nameKey(item.name);
  const chapter = (ctx.dataset.battlekit ?? []).find((b) => nameKey(b.name) === key);
  const profile = ctx.dataset.weapons.find(
    (w) => (item.weaponId && w.id === item.weaponId) || nameKey(w.name) === key);
  const type = chapter?.type ?? profile?.type ?? '';
  const m = /^(\d)-Handed$/i.exec(type.trim());
  return m ? Number(m[1]) : undefined;
}

/** The keywords on an item, from the chapter and the catalogue alike. */
function keywordsOf(item: Carried, ctx: CarrierContext): string[] {
  const key = nameKey(item.name);
  const chapter = (ctx.dataset.battlekit ?? []).find((b) => nameKey(b.name) === key);
  const profile = ctx.dataset.weapons.find(
    (w) => (item.weaponId && w.id === item.weaponId) || nameKey(w.name) === key);
  return [...(chapter?.keywords ?? []), ...(profile?.keywords ?? [])]
    .map((k) => k.trim().toUpperCase());
}

const carries = (item: Carried, keyword: string, ctx: CarrierContext) =>
  keywordsOf(item, ctx).some((k) => k === keyword.toUpperCase()
                                 || k.startsWith(`${keyword.toUpperCase()} `));

/** Does the item carry a named stipulation — `Shield Combo`? */
function hasStipulation(item: Carried, name: string, ctx: CarrierContext): boolean {
  const ref = { id: item.weaponId, name: item.name };
  const raw = ctx.armoury ? restrictionsFor(ctx.armoury, ref) : [];
  const fromProfile = ctx.dataset.weapons.find(
    (w) => (item.weaponId && w.id === item.weaponId) || nameKey(w.name) === nameKey(item.name),
  )?.restrictions ?? [];
  return [...raw, ...fromProfile]
    .flatMap((r) => parseRestrictions(r))
    .some((r) => r.kind === 'property' && nameKey(r.name) === nameKey(name));
}

/**
 * A section name, canonical across the sources that spell it differently.
 *
 * The rulebook heads the rule `Shields`; the Procession of the Sacred
 * Affliction and the Heretic Naval Raiders head their Armoury Table column
 * `Shield`. Matched literally, the one-Shield limit simply did not apply to
 * those two factions — silently, which is the worst way for a rule not to
 * apply. The same singular/plural split is waiting in `Grenade`/`Grenades`.
 */
const sectionKey = (s: string) => nameKey(s).replace(/s$/, '');

/**
 * Is the model exempt from a keyword's Effect?
 *
 * "NEGATE [KEYWORD] (Effect): A model with the NEGATE Keyword is not affected
 * by the specified Keyword's Effect." A carrying limit stated by a keyword is
 * part of that keyword's Effect, so NEGATE lifts it.
 */
const negates = (ctx: CarrierContext, keyword: string) =>
  (ctx.keywords ?? []).some(
    (k) => k.trim().toUpperCase() === `NEGATE ${keyword.toUpperCase()}`);

/** The carrying rules the Keyword Glossary states, if this ruleset has them. */
const keywordRules = (limits: BattlekitLimits): KeywordCarryRule[] =>
  limits.byKeyword ?? [];

/** The rule governing a section, if the book states one for it. */
const ruleFor = (limits: BattlekitLimits, section: string): BattlekitLimit | undefined =>
  limits.limits.find((l) => sectionKey(l.section) === sectionKey(section));

/**
 * Everything one model's Battlekit breaks.
 *
 * Returns an empty list when the ruleset carries no limits — absent means
 * "unknown", never "no limits", so an older ruleset simply is not policed
 * rather than being declared legal.
 */
export function battlekitBreaches(items: Carried[], ctx: CarrierContext): BattlekitBreach[] {
  const limits = ctx.dataset.battlekitLimits;
  if (!limits?.limits?.length) return [];

  const out: BattlekitBreach[] = [];

  /*
    Items grouped by the section they are offered under, keyed canonically so
    a faction's own spelling of the column cannot decide whether a published
    limit applies to it.
  */
  const bySection = new Map<string, { label: string; items: Carried[] }>();
  for (const item of items) {
    const section = sectionOf(item, ctx);
    if (!section) continue;   // Unknown kind: not counted, never guessed.
    const group = bySection.get(sectionKey(section)) ?? { label: section, items: [] };
    for (let n = 0; n < q(item); n++) group.items.push(item);
    bySection.set(sectionKey(section), group);
  }

  const shields = bySection.get(sectionKey('Shields'))?.items ?? [];

  for (const [, group] of bySection) {
    const section = group.label;
    const carried = group.items;
    const rule = ruleFor(limits, section);
    if (!rule) continue;

    // "One suit of Armour", "One Shield" — a flat ceiling on the section.
    if (typeof rule.max === 'number' && !rule.per) {
      if (carried.length > rule.max) {
        out.push({
          section, raw: rule.raw,
          message: `${carried.length} ${section} carried — the limit is ${rule.max}: `
                 + carried.map((c) => c.name).join(', ') + '.',
        });
      }
    }

    // "One type of Grenade" — a ceiling on distinct KINDS, not on how many.
    if (typeof rule.max === 'number' && rule.per === 'name') {
      const kinds = new Set(carried.map((c) => nameKey(c.name)));
      if (kinds.size > rule.max) {
        out.push({
          section, raw: rule.raw,
          message: `${kinds.size} kinds of ${section} carried — the limit is ${rule.max}: `
                 + [...new Set(carried.map((c) => c.name))].join(', ') + '.',
        });
      }
    }

    // "cannot have two or more pieces … with the same Name".
    if (rule.distinctByName) {
      const seen = new Map<string, string>();
      const dupes = new Set<string>();
      for (const c of carried) {
        const k = nameKey(c.name);
        if (seen.has(k)) dupes.add(seen.get(k)!);
        else seen.set(k, c.name);
      }
      for (const name of dupes) {
        out.push({
          section, raw: rule.raw,
          message: `Two or more ${name} — a model cannot have two pieces of `
                 + `${section} with the same name.`,
        });
      }
    }

    /*
      "One 2-Handed … or two 1-Handed …" is one allowance stated twice, so it
      is counted in hand-slots rather than as two separate ceilings. Both
      numbers come from the page: the capacity is what the rule allows in
      1-Handed weapons, and a 2-Handed weapon costs capacity/allowed-2-Handed.
      For the published 2-and-1 that is two slots and one apiece, and the
      arithmetic reproduces the sentence exactly rather than assuming it.
    */
    if (rule.byHands) {
      const perHand = (h: number) => rule.byHands![String(h)];
      const capacity = perHand(1);
      if (capacity) {
        const slots = ctx.extraLimb ? capacity + 1 : capacity;

        /*
          STRONG: "it can equip and use ONE 2-Handed Melee Weapon as if it were
          a 1-Handed Melee Weapon." One, in the Melee section, and CUMBERSOME
          exists to opt a weapon out of exactly this: "require two hands to
          use, EVEN IF the model has the STRONG Keyword."

          The equip modal's version applied the conversion to every 2-Handed
          melee weapon and read CUMBERSOME not at all, so a STRONG model could
          carry two greatswords in two hands.
        */
        const convert = keywordRules(limits).find(
          (k) => k.converts
              && (ctx.keywords ?? []).some((w) => w.trim().toUpperCase() === k.keyword)
              && sectionKey(k.converts.section) === sectionKey(section));
        const exempts = keywordRules(limits).filter(
          (k) => k.fixedHands && k.overrides === convert?.keyword);
        let conversionsLeft = convert?.converts?.count ?? 0;

        let used = 0;
        const counted: string[] = [];
        for (const c of carried) {
          let hands = handsOf(c, ctx);
          if (hands === undefined) continue;
          if (convert?.converts
              && hands === convert.converts.from
              && conversionsLeft > 0
              && !exempts.some((e) => carries(c, e.keyword, ctx))) {
            hands = convert.converts.to;
            conversionsLeft--;
          }
          const allowed = perHand(hands);
          used += allowed ? capacity / allowed : hands;
          counted.push(c.name);
        }
        if (used > slots) {
          out.push({
            section, raw: rule.raw,
            message: `${counted.join(', ')} needs ${used} hands and the model has `
                   + `${slots}` + (ctx.extraLimb ? ' (an extra limb included)' : '') + '.',
          });
        }
      }
    }
  }

  /*
    The Shield sub-section: what carrying one costs elsewhere. Only applies
    while a Shield is actually carried, which is why it sits outside the loop.
  */
  const ws: ShieldRestrictions | undefined = limits.withShield;
  if (ws && shields.length) {
    for (const section of ['Melee Weapons', 'Ranged Weapons']) {
      const carried = bySection.get(sectionKey(section))?.items ?? [];

      if (typeof ws.oneHandedEach === 'number') {
        const oneHanded = carried.filter((c) => handsOf(c, ctx) === (ws.hands ?? 1));
        if (oneHanded.length > ws.oneHandedEach) {
          out.push({
            section, raw: ws.raw,
            message: `${oneHanded.length} ${ws.hands ?? 1}-Handed ${section} with a Shield `
                   + `— the limit is ${ws.oneHandedEach}: `
                   + oneHanded.map((c) => c.name).join(', ') + '.',
          });
        }
      }

      if (typeof ws.blocksHands === 'number') {
        // Legal only where the weapon AND the Shield both carry the stipulation.
        const blocked = carried.filter((c) =>
          handsOf(c, ctx) === ws.blocksHands
          && !(ws.unlessBoth
               && hasStipulation(c, ws.unlessBoth, ctx)
               && shields.some((s) => hasStipulation(s, ws.unlessBoth!, ctx))));
        for (const c of blocked) {
          out.push({
            section, raw: ws.raw,
            message: `${c.name} is ${ws.blocksHands}-Handed and cannot be carried with a `
                   + `Shield unless both have ${ws.unlessBoth}.`,
          });
        }
      }
    }
  }

  const all = [...bySection.values()].flatMap((g) => g.items);

  /*
    HEAVY — "A model cannot be equipped with more than one piece of Battlekit
    with this Keyword" — is parsed and DELIBERATELY NOT ENFORCED.

    STRONG grants NEGATE HEAVY, and NEGATE is unambiguous: "A model with the
    NEGATE Keyword is not affected by the specified Keyword's Effect." The
    carrying limit is part of HEAVY's Effect, so a STRONG model may carry two.

    Deciding that needs the model's effective Keywords, and the roster does not
    have them: a saved `profileSnapshot` carries no keyword list at all, and
    STRONG is commonly GRANTED — the Inhuman Strength Alchemical Formula reads
    "Gains STRONG" — so it is absent from the base catalogue entry of exactly
    the models most likely to carry two HEAVY items.

    Enforcing it anyway raised two violations on a real, legal warband on the
    first run: a Brazen Bull (STRONG on its own entry) and Al-Masyukh (STRONG
    from a Formula). Both were false. A permissive gap is the better failure —
    the whole point of this work is that the app stops telling players their
    legal rosters are illegal.
  */

  /*
    HELD: occupies a hand and cannot be put down, so the model may add only
    ONE of a 1-Handed Weapon or a Shield — never a 2-Handed weapon, and never
    both a Weapon and a Shield. Grenades are exempt by the rule's own last
    sentence.
  */
  for (const rule of keywordRules(limits)) {
    if (typeof rule.occupiesHands !== 'number') continue;
    if (negates(ctx, rule.keyword)) continue;
    const heldItems = all.filter((c) => carries(c, rule.keyword, ctx));
    if (!heldItems.length) continue;

    /*
      "…either a 1-Handed Weapon or a Shield… or both a Weapon and a Shield."
      The rule is about WEAPONS and SHIELDS. Armour is worn rather than
      carried and Equipment is explicitly unrestricted elsewhere, so counting
      either as a companion would forbid a Held model from wearing a coat.
    */
    const exempt = rule.exempt ? sectionKey(rule.exempt) : undefined;
    const companionSections = ['Melee Weapons', 'Ranged Weapons', 'Shields']
      .map(sectionKey).filter((k) => k !== exempt);
    const others = all.filter((c) => {
      if (heldItems.includes(c)) return false;
      const s = sectionOf(c, ctx);
      return !!s && companionSections.includes(sectionKey(s));
    });

    const twoHanded = others.filter((c) => handsOf(c, ctx) === rule.blocksHands);
    for (const c of twoHanded) {
      out.push({
        section: rule.keyword, raw: rule.raw,
        message: `${c.name} is ${rule.blocksHands}-Handed and cannot be carried with `
               + `${heldItems[0].name}, which is ${rule.keyword} and cannot be put down.`,
      });
    }

    // "…or both a Weapon and a Shield": one companion, not two.
    const companions = others.filter((c) => !twoHanded.includes(c));
    if (companions.length > 1) {
      out.push({
        section: rule.keyword, raw: rule.raw,
        message: `${heldItems[0].name} is ${rule.keyword}, so only one of `
               + `${companions.map((c) => c.name).join(', ')} can be carried beside it.`,
      });
    }
  }

  return out;
}

/** Re-exported so callers need one import for the whole rule. */
export { offersOf };
