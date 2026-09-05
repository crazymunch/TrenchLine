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
  /** The loadout bundle that handed this to the model — see `oneStatedLoadout`. */
  grantedBy?: string;
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
   * Every name the model holds — Formulae, Strains, innate abilities.
   *
   * Used to match a carrying allowance the model's own entry states. Supplied
   * by `traitsOf`, which reads all three places a Formula can be recorded,
   * because the importer used to file them differently from the app's own
   * purchase path.
   */
  traits?: string[];
  /**
   * The model's own Keywords.
   *
   * STRONG is one of the four carrying rules the Keyword Glossary states, and
   * the equip modal used to detect it with `/strong|bulky|large|ogre/i` over
   * ability NAMES. It is a keyword; the dataset carries it as one.
   */
  keywords?: string[];
  /**
   * The ENTRY's name — `Desecrated Saint`, not what the player called this
   * model.
   *
   * Two of the stated carrying allowances are unconditional: they belong to
   * the entry rather than to anything the model can acquire. Without this
   * they could only be matched on `requires`, and `requires` is empty for
   * them — which every model would satisfy.
   */
  modelName?: string;
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
 * Do these items all arrive together, from one entry that states the loadout?
 *
 * "UNLESS OTHERWISE STATED a model is limited to the following Battlekit" is
 * the first line of the rule, and a model's own entry is where the book states
 * otherwise:
 *
 *     A Mamluk Faris always has either a Greatsword, or a Polearm and a
 *     Trench Shield, or a Pistol and a Sword/Axe.
 *
 * The catalogue offers that as one selection, `Polearm and Shield`, and names
 * the generic `Shield` profile rather than the Trench Shield the book names.
 * The generic one carries no Shield Combo stipulation, so policed against each
 * other the two halves of a loadout the book hands the model raise a breach on
 * a legal roster — the exact failure this file exists to stop making.
 *
 * Scoped to items of ONE bundle, so a Shield bought on top of a bundled one is
 * still counted: the entry states what it grants, not what may be added to it.
 */
const oneStatedLoadout = (items: Carried[]): boolean => {
  const grant = items[0]?.grantedBy;
  return Boolean(grant) && items.every((i) => i.grantedBy === grant);
};

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
/**
 * The allowance this model's own entry states, if it states one.
 *
 * "Unless otherwise stated" is the first line of the Battlekit Limits. A
 * Takwin Homunculus with `Human Hands` and an `Additional Arm` is stated
 * otherwise, and the app was calling its Siege Jezzail illegal because the
 * chapter forbids a 2-Handed weapon alongside a Shield — while the entry says
 * the Shield replaces a MELEE weapon.
 *
 * Matched on the traits the model actually holds. The names come from the
 * book's own sentence, so nothing about which Formula grants what is written
 * here; `traitsOf` supplies the model's side from all three places a Formula
 * can be recorded.
 */
function statedAllowance(ctx: CarrierContext) {
  const traits = (ctx.traits ?? []).map((t) => t.trim().toLowerCase());
  const model = ctx.modelName ? nameKey(ctx.modelName) : undefined;

  return (ctx.dataset.carryAllowances ?? []).find((a) => {
    /*
      Conditional: the sentence names what the model must hold, and holding it
      is the whole test. The Homunculus allowance is stated about Formulae,
      not about being a Homunculus.
    */
    if (a.requires.length) {
      return traits.length
        && a.requires.every((r) => traits.includes(r.trim().toLowerCase()));
    }
    /*
      Unconditional: it belongs to the entry, so the entry has to match. An
      empty `requires` is satisfied by every model — matching on it alone
      would have given every model in the game the Desecrated Saint's arms.
      With no entry name to check against, the chapter's limits stand.
    */
    return model !== undefined && nameKey(a.model) === model;
  });
}

/**
 * The hands each item needs, after any Keyword that changes the number.
 *
 * STRONG is the only one the book states: "it can equip and use ONE 2-Handed
 * Melee Weapon as if it were a 1-Handed Melee Weapon" — one, in the Melee
 * section — and CUMBERSOME opts a weapon back out of it: "require two hands to
 * use, EVEN IF the model has the STRONG Keyword". Both are read from
 * `limits.byKeyword`; nothing about either is written here.
 *
 * Applied ONCE, in one place, because it was applied in only one of the two
 * that need it. The conversion lived inside the chapter's hand arithmetic, and
 * an entry that states its own allowance `continue`s past that branch — so a
 * Takwin Homunculus with Human Hands, an Additional Arm and Inhuman Strength
 * was told that a Zulfiqar, a Great Sword and a Shield is more Melee Weapons
 * than its entry allows. Its entry allows three 1-Handed Melee Weapons with a
 * Shield replacing one of them, and STRONG makes the Great Sword one of them:
 * three hands, three used, legal. The engine had the allowance and had the
 * conversion, and never let them meet.
 *
 * Greedy in the order carried, which is safe: the conversion is stated as a
 * count of weapons rather than as a choice between them, so any eligible
 * 2-Handed weapon converts to the same number of hands as any other.
 */
function effectiveHands(
  carried: Carried[],
  ctx: CarrierContext,
  limits: BattlekitLimits,
  section: string,
): (number | undefined)[] {
  const convert = keywordRules(limits).find(
    (k) => k.converts
        && (ctx.keywords ?? []).some((w) => w.trim().toUpperCase() === k.keyword)
        && sectionKey(k.converts.section) === sectionKey(section));
  const exempts = keywordRules(limits).filter(
    (k) => k.fixedHands && k.overrides === convert?.keyword);
  let conversionsLeft = convert?.converts?.count ?? 0;

  return carried.map((c) => {
    const hands = handsOf(c, ctx);
    if (hands === undefined) return undefined;   // Unknown kind: never counted.
    if (convert?.converts
        && hands === convert.converts.from
        && conversionsLeft > 0
        && !exempts.some((e) => carries(c, e.keyword, ctx))) {
      conversionsLeft--;
      return convert.converts.to;
    }
    return hands;
  });
}

/**
 * Do these weapons fit any combination the entry allows?
 *
 * Combinations, not hand arithmetic: the book says "three 1-Handed, or one
 * 1-Handed and one 2-Handed", and another entry in the same book says "up to
 * three 1-Handed OR two 1-Handed and one 2-Handed" — three items in one
 * branch and four hands in the other. A single capacity number gets one wrong.
 *
 * `spend` is the slot a Shield takes where the entry says it replaces one of
 * these weapons.
 */
function fitsAllowance(
  combos: Record<string, number>[],
  /** One entry per carried item, from `effectiveHands`. */
  hands: (number | undefined)[],
  spend: number,
): boolean {
  const have = new Map<number, number>();
  for (const h of hands) {
    if (h === undefined) continue;      // Unknown kind: never counted.
    have.set(h, (have.get(h) ?? 0) + 1);
  }

  return combos.some((combo) => {
    /* The Shield takes one of the weapons the branch allows — the cheapest,
       so the branch is given its best reading before anything is refused. */
    const budget = new Map<number, number>(
      Object.entries(combo).map(([h, n]) => [Number(h), n]));
    let toSpend = spend;
    for (const h of [...budget.keys()].sort((a, b) => a - b)) {
      while (toSpend > 0 && (budget.get(h) ?? 0) > 0) {
        budget.set(h, budget.get(h)! - 1);
        toSpend--;
      }
    }
    if (toSpend > 0) return false;

    for (const [h, n] of have) if (n > (budget.get(h) ?? 0)) return false;
    return true;
  });
}

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
      if (carried.length > rule.max && !oneStatedLoadout(carried)) {
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
      if (kinds.size > rule.max && !oneStatedLoadout(carried)) {
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
        if (oneStatedLoadout(carried.filter((c) => nameKey(c.name) === nameKey(name)))) continue;
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
    /*
      An allowance this model's own entry states replaces the chapter's for
      this section — "unless otherwise stated". Checked as a set of
      combinations rather than through the hand arithmetic below, because the
      book states alternatives that are not a single capacity.
    */
    const stated = statedAllowance(ctx);
    const combos = stated?.bySection[section];
    if (combos?.length) {
      const spend = stated!.shieldReplaces === section ? shields.length : 0;
      const hands = effectiveHands(carried, ctx, limits, section);
      if (!fitsAllowance(combos, hands, spend) && !oneStatedLoadout(carried)) {
        out.push({
          section, raw: stated!.raw,
          message: `${carried.map((c) => c.name).join(', ')}`
                 + (spend ? ` with a Shield` : '')
                 + ` is more ${section} than ${stated!.model}'s own entry allows.`,
        });
      }
      continue;   // The entry's allowance stands in place of the chapter's.
    }

    if (rule.byHands) {
      const perHand = (h: number) => rule.byHands![String(h)];
      const capacity = perHand(1);
      if (capacity) {
        const slots = ctx.extraLimb ? capacity + 1 : capacity;

        /*
          STRONG and CUMBERSOME are applied by `effectiveHands`, which the
          entry's own stated allowance above uses too. The equip modal's old
          version applied the conversion to every 2-Handed melee weapon and
          read CUMBERSOME not at all, so a STRONG model could carry two
          greatswords in two hands.
        */
        const hands = effectiveHands(carried, ctx, limits, section);

        let used = 0;
        const counted: string[] = [];
        const countedItems: Carried[] = [];
        carried.forEach((c, i) => {
          const h = hands[i];
          if (h === undefined) return;
          const allowed = perHand(h);
          used += allowed ? capacity / allowed : h;
          counted.push(c.name);
          countedItems.push(c);
        });
        if (used > slots && !oneStatedLoadout(countedItems)) {
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
  /*
    Not applied to a model whose own entry states its allowance WITH a Shield.

    This is the half that made the app call Al-Masyukh's Siege Jezzail
    illegal. The chapter says a 2-Handed weapon cannot be carried alongside a
    Shield unless both have Shield Combo; the Homunculus entry says the Shield
    replaces one of its MELEE weapons and that Shield Combo cannot be used at
    all — so its 2-Handed RANGED weapon is untouched by the Shield, and the
    stipulation the chapter asks for is one this model is forbidden to use.
    Enforcing both at once demands something the entry forbids.
  */
  const shieldStated = shields.length ? statedAllowance(ctx) : undefined;
  const chapterShieldApplies = !(shieldStated && shieldStated.shieldReplaces);

  if (ws && shields.length && chapterShieldApplies) {
    for (const section of ['Melee Weapons', 'Ranged Weapons']) {
      const carried = bySection.get(sectionKey(section))?.items ?? [];

      if (typeof ws.oneHandedEach === 'number') {
        const oneHanded = carried.filter((c) => handsOf(c, ctx) === (ws.hands ?? 1));
        if (oneHanded.length > ws.oneHandedEach
            && !oneStatedLoadout([...oneHanded, ...shields])) {
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
          && !shields.some((s) => oneStatedLoadout([c, s]))
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
