import type {
  UnitProfile, WarbandVariant, Ability, Dataset, Condition,
} from '@/types/catalogue';
import { evaluateCondition, type SelectionContext } from './modifiers';

/**
 * A unit profile as a particular Warband Variant fields it.
 *
 * A Variant's ops are the same vocabulary as an errata Layer's — `set`,
 * `addKeyword`, `addAbility`, `replaceAbility` — and `scripts/lib/layers.mjs`
 * has been applying that vocabulary since Phase 1. It applies it at BUILD time,
 * to the whole dataset, which is right for errata and wrong for a Variant: two
 * Warbands of the same faction take different Variants, so the same entry has
 * to read differently for each of them. Nothing applied a Variant's ops at
 * roster-build time at all.
 *
 * What happened instead is that four separate readers each reached into
 * `variant.ops` for one field apiece — `variantLimits` for constraints,
 * `variantForbids` and `variantReveals` for `hidden`, `variantRenames` for
 * `name` — and anything the ops said beyond those four was simply not read. So
 * the Knights of Saint Lazarus could rename the Lazarist Castigator to a
 * Leper-Knight and raise its limit, and could not give it the +2 Melee the
 * same paragraph grants it.
 *
 * This is that missing step, and it supersedes the ad-hoc readers rather than
 * joining them: one function, the whole op vocabulary, applied to one profile.
 *
 * Pure — the dataset's own profile is never mutated. A Variant is a lens on the
 * catalogue, not an edit to it, and a mutation here would leak one Warband's
 * Variant into every other Warband on the device.
 */

/** A Variant op, which is a `LayerOp` narrowed to what a Variant can say. */
type VariantOp = {
  op?: string;
  field?: string;
  value?: unknown;
  keyword?: string;
  ability?: Ability;
  name?: string;
  constraintBound?: 'min' | 'max';
  target?: { kind?: string; id?: string; name?: string };
};

/** `stats.melee` -> set that leaf. Mirrors `setPath` in the build's applier. */
function setPath(obj: Record<string, unknown>, dotted: string, value: unknown): void {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts.at(-1) as string] = value;
}

/** Whether an op is aimed at this profile. */
const hits = (op: VariantOp, profile: UnitProfile) =>
  !!op.target?.id && op.target.id === (profile.entryId || profile.id);

/**
 * Apply a Variant to one profile.
 *
 * Returns the profile unchanged — the identical object — when the Variant has
 * nothing to say about it, so React sees no new reference for the entries a
 * Variant does not touch, which is most of them.
 */
export function applyVariant(
  profile: UnitProfile,
  variant: WarbandVariant | undefined,
): UnitProfile {
  const ops = ((variant?.ops ?? []) as VariantOp[]).filter((op) => hits(op, profile));
  if (!ops.length) return profile;

  // One shallow clone, then deep-clone only the branches an op writes to.
  const next: UnitProfile = { ...profile };

  for (const op of ops) {
    switch (op.op) {
      case 'set': {
        const field = op.field ?? '';
        /*
          Constraints are read by `variantLimits`, which resolves them against
          the profile's own constraint list and the op's `constraintBound`.
          Writing them here as well would double-apply an increment.
        */
        if (field.startsWith('constraint:')) break;
        // `hidden` decides whether the entry is on the list at all, which is a
        // question about the LIST rather than about this profile.
        if (field === 'hidden') break;
        if (field.startsWith('stats.')) next.stats = { ...next.stats };
        setPath(next as unknown as Record<string, unknown>, field, op.value);
        break;
      }

      case 'addKeyword':
        if (op.keyword && !next.keywords.includes(op.keyword)) {
          next.keywords = [...next.keywords, op.keyword];
        }
        break;

      case 'setKeywords':
        next.keywords = [...((op as { keywords?: string[] }).keywords ?? [])];
        break;

      case 'addAbility':
        if (op.ability) {
          const at = next.abilities.findIndex(
            (a) => a.name.toLowerCase() === op.ability!.name.toLowerCase());
          next.abilities = [...next.abilities];
          // Replace in place where the catalogue already carries the name: two
          // abilities of one name is a duplicate, not a rule. The build's
          // applier makes the same call, for the same reason.
          if (at >= 0) next.abilities[at] = op.ability;
          else next.abilities.push(op.ability);
        }
        break;

      /*
        "…replace the Whip of God Ability with the Knightly Code Ability."

        An ability named in the op but absent from the profile is left alone
        rather than appended. The op describes an exchange, and performing half
        of one — granting the new ability without removing the old — hands the
        model a rule the book took away from it.
      */
      case 'replaceAbility': {
        if (!op.name || !op.ability) break;
        const at = next.abilities.findIndex(
          (a) => a.name.toLowerCase() === op.name!.toLowerCase());
        if (at < 0) break;
        next.abilities = [...next.abilities];
        next.abilities[at] = op.ability;
        break;
      }

      /*
        A condition on the roster entry, not a change to the profile: "the
        Leper-Knights …must wear a suit of Armour". The model reads the same
        either way, so there is nothing to apply here; `checkVariantGear` in
        the validator is what enforces it.
      */
      case 'requireGear':
        break;

      default:
        break;
    }
  }

  return next;
}

/* ------------------------------------------------- abilities a Variant reveals */

/**
 * Which of a unit's abilities are actually printed on its entry (DA-01).
 *
 * The catalogues mark an Ability profile `hidden="true"` when a Variant owns it
 * and reveal it with a `set hidden=false` modifier whose condition names that
 * Variant. `New Antioch.cat` L4207 onward is the shape: the Shocktrooper's Axe
 * Mastery, Shield Bash, Indomitable and Weapon Familiarity are four hidden
 * profiles with four identical reveals, all naming the Remnants of Byzantium.
 *
 * Neither half was read. The parser ignored the attribute, so every hidden
 * ability shipped as an ordinary one and `recruitable()` copied all of them
 * into `innateAbilities`; a standard New Antioch Shocktrooper's card printed
 * four Varangian Guard rules it does not have. Twenty-eight such profiles on
 * fourteen units, by the audit's count; thirty on thirteen as the dataset
 * stands today.
 *
 * ## It runs both ways
 *
 * `value: 'false'` reveals and `'true'` hides, and both are real. Shock Charge
 * is printed on the entry and *removed* under the Remnants of Byzantium when
 * the model carries a shield and a two-handed axe — which is the Varangian
 * Guard's own Weapon Familiarity saying so: *"They lose Shock Charge if they
 * equip a shield together with a two-handed axe."* FD-08 describes this case
 * the other way round, as Shock Charge appearing when the Shields are carried.
 * The catalogue and the book agree against the design, so the catalogue is what
 * is implemented.
 *
 * ## An undecidable condition changes nothing
 *
 * Rule 2. A leaf this cannot evaluate — one naming something that is neither a
 * Variant nor one of the model's own selections — leaves its modifier
 * unapplied, so the ability stays as the catalogue printed it. It is never
 * guessed in either direction, and `unknownVisibilityLeaves` counts them over
 * the whole dataset so a wording that drifts is a failing test rather than an
 * ability that quietly stops appearing. That count is zero on the shipped
 * catalogues.
 */
export interface VisibilityContext {
  /** The ruleset, for the Variant list a roster-scoped leaf is decided against. */
  dataset?: Dataset | null;
  /** The Warband Variant in play, if one is declared. */
  variant?: WarbandVariant;
  /**
   * The names of everything selected on this model: options, gear, injuries.
   *
   * Empty is the honest default for a recruit list, which shows an entry before
   * anything has been chosen on it.
   */
  selections?: readonly string[];
  /**
   * The names of the WARBAND's own roster-level selections, where the caller
   * knows them.
   *
   * FD-08 expected every roster-scoped reveal to name a Variant, and eleven of
   * them do not: the Court of the Seven-Headed Serpent's Desecrated Saint has
   * seven Auras revealed by the roster's **Chosen Sin** — `Envy`, `Gluttony`,
   * `Greed` and so on — which is a selectionEntryGroup on the Warband
   * (`Court of the Seven-Headed Serpent.cat` L4554), not a Variant.
   *
   * The app does not record a Chosen Sin anywhere, so every caller passes an
   * empty list today and the Auras stay off the card. That is the Warband's
   * actual state rather than a guess: no Sin has been chosen in the app. The
   * Codex shows all seven with their label, through `labelledAbilities`, so no
   * rule is hidden from the reference.
   *
   * `undefined` is different from `[]` and the difference is rule 2: undefined
   * means the caller cannot say, so a roster leaf it would answer is left
   * undecided and the modifier is not applied.
   */
  rosterSelections?: readonly string[];
}

type Leaf = {
  scope?: string;
  childId?: string;
  childName?: string;
  type?: string;
  value?: string;
};

const key = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Evaluate one `when` tree. `null` is "cannot be decided", never `false` —
 * the same three-valued discipline `rules/modifiers.ts` uses.
 */
function decide(when: unknown, ctx: VisibilityContext): boolean | null {
  if (when == null) return true;                 // unconditional
  if (typeof when !== 'object') return null;

  const group = when as { all?: unknown[]; any?: unknown[] };
  if (Array.isArray(group.all)) {
    let unknown = false;
    for (const sub of group.all) {
      const r = decide(sub, ctx);
      if (r === false) return false;             // one false settles an AND
      if (r === null) unknown = true;
    }
    return unknown ? null : true;
  }
  if (Array.isArray(group.any)) {
    let unknown = false;
    /* A `null` member is an empty conditionGroup the catalogue leaves behind —
       the Shocktrooper's Shock Charge has one. It asserts nothing, so it is
       skipped rather than counted as undecidable. */
    const members = group.any.filter((c) => c != null);
    if (!members.length) return true;
    for (const sub of members) {
      const r = decide(sub, ctx);
      if (r === true) return true;               // one true settles an OR
      if (r === null) unknown = true;
    }
    return unknown ? null : false;
  }

  const leaf = when as Leaf;
  const held = holds(leaf, ctx);
  if (held === null) return null;

  /*
    The comparison is `rules/modifiers.ts`'s, not a second one written here.

    This used to answer the leaf directly with "is the thing present", which
    silently assumed every condition was `atLeast 1` — and eleven are not. The
    Artillery Witch's Creator's Shadow is hidden when the roster holds **fewer
    than one** Cadaver Corps, so reading presence as the answer showed the
    ability to everyone except the Warband it belongs to, and the Yoke Fiend's
    Hateful read backwards the same way.

    So membership is decided above, where the names and the groups are, and the
    arithmetic is delegated: a one-element pool carrying this leaf's own id when
    it is held, and `evaluateCondition` to apply `atLeast`, `lessThan`,
    `equalTo` and the rest. An operator it does not know comes back `null` and
    the modifier is left unapplied.
  */
  const pool: SelectionContext = { self: new Set(), roster: new Set() };
  if (held && leaf.childId) {
    if (leaf.scope === 'roster' || leaf.scope === 'force') pool.roster.add(leaf.childId);
    else if (leaf.scope === 'parent') { pool.parent = new Set([leaf.childId]); }
    else pool.self.add(leaf.childId);
  } else if (leaf.scope === 'parent') {
    pool.parent = new Set();
  }
  return evaluateCondition(leaf as unknown as Condition, pool);
}

/**
 * Whether the thing a condition names is present — `null` where that cannot be
 * decided from what the caller supplied.
 *
 * Separate from the comparison above because these are different questions and
 * only this one needs the dataset. A `lessThan 1 Cadaver Corps` leaf and an
 * `atLeast 1 Cadaver Corps` leaf ask the same thing of the roster and want
 * opposite answers from it.
 */
function holds(leaf: Leaf, ctx: VisibilityContext): boolean | null {
  /*
    A leaf naming a Variant, at ANY scope: true when it is the Variant in play.
    Decidable in BOTH directions, which is what keeps the Desecrated Saint's
    seven Court Auras off a Warband that has declared no Variant at all.

    Scope is not the question here. The catalogues write the same test at
    `roster` and at `parent` — the Grail Thrall's Gluttonous Horde asks for The
    Great Hunger with `scope="parent"` — and a Variant is declared once for the
    Warband however the condition reaches for it. Keying on the scope left those
    undecidable and the ability unapplied.
  */
  const variants = ctx.dataset?.variants ?? [];
  const namedVariant = variants.find((v) =>
    (leaf.childId && v.entryId === leaf.childId)
    || (leaf.childName && key(v.name) === key(leaf.childName)));
  if (namedVariant) {
    const mine = ctx.variant;
    if (!mine) return false;
    return (!!mine.entryId && mine.entryId === namedVariant.entryId)
      || key(mine.name) === key(namedVariant.name);
  }

  if (leaf.scope === 'roster' || leaf.scope === 'force') {
    /* Not a Variant: a roster-level selection the Warband makes, which is the
       Court's Chosen Sin. Decidable only when the caller can say what the
       Warband has chosen — see `rosterSelections`. */
    if (!ctx.rosterSelections || !leaf.childName) return null;
    const want = key(leaf.childName);
    return ctx.rosterSelections.some((sel) => key(sel) === want);
  }

  /* The model's own selections: `Infected`, `Lost Arm [26]`, a Dane Axe.
     Matched by NAME, because a roster records what a model carries by name and
     the catalogue's entry ids for those selections are not on it. */
  if (leaf.scope === 'self' || leaf.scope === 'model' || leaf.scope === 'parent') {
    if (!leaf.childName) return null;
    const want = key(leaf.childName);
    const selections = ctx.selections ?? [];
    if (selections.some((s) => key(s) === want)) return true;

    /*
      A condition can name a GROUP rather than an item. Shock Charge is taken
      away by `Shields` and a two-handed axe — `Shields` is a
      selectionEntryGroup, not a thing a model can carry — so a Varangian Guard
      with a Trench Shield and a Great Sword kept an ability the Varangian
      Guard's own rule takes off it. It is the only ability in the shipped
      catalogues gated this way; the Archeologist's `Melee Weapons` asks the
      same question of the same index, but gates a weapon profile (Weaponized
      Shovel) rather than an ability, so it is not read here.

      Membership comes from the two places the pipeline already records it: the
      Armoury Table section an item is stocked under, and the option group an
      entry files a choice in. A name that is neither a group nor anything the
      dataset knows at all is `null` rather than false, so the build's guard
      reports it instead of it passing as "the model does not have one".
    */
    const index = membershipIndex(ctx.dataset);
    if (!index) return null;
    const members = index.groups.get(want);
    if (members) return selections.some((s) => members.has(key(s)));
    /* A known item the model simply does not have. */
    if (index.items.has(want)) return false;
    return null;
  }

  return null;
}

/** Group name -> the names in it, and every item name the dataset knows. */
interface Membership {
  groups: Map<string, Set<string>>;
  items: Set<string>;
}

const membershipCache = new WeakMap<object, Membership>();

/**
 * What belongs to what, built once per dataset.
 *
 * Read from the dataset rather than listed here: the Armoury Tables already say
 * which section stocks an item, and an entry's options already say which group
 * a choice sits in. Those are the two sources the catalogues give, and a third
 * written down here would be a hand-kept list of the kind rule 1 exists to
 * prevent.
 */
function membershipIndex(dataset: Dataset | null | undefined): Membership | null {
  if (!dataset) return null;
  const cached = membershipCache.get(dataset as unknown as object);
  if (cached) return cached;

  const groups = new Map<string, Set<string>>();
  const items = new Set<string>();
  const add = (group: string, member: string) => {
    if (!group || !member) return;
    const g = key(group);
    if (!groups.has(g)) groups.set(g, new Set());
    groups.get(g)!.add(key(member));
  };

  for (const armoury of dataset.armouries ?? []) {
    for (const row of armoury.rows ?? []) {
      add(row.section, row.name);
      items.add(key(row.name));
    }
  }
  for (const unit of dataset.units ?? []) {
    for (const option of unit.options ?? []) {
      add(option.group, option.name);
      for (const part of (option.groupPath ?? '').split('::')) add(part, option.name);
      items.add(key(option.name));
    }
  }
  for (const weapon of dataset.weapons ?? []) items.add(key(weapon.name));

  const built = { groups, items };
  membershipCache.set(dataset as unknown as object, built);
  return built;
}

/** `profile:Axe Mastery` -> `Axe Mastery`. Null for a modifier on the entry. */
const abilityOfOrigin = (origin: string | undefined): string | null => {
  const m = /^profile:(.*)$/.exec(origin ?? '');
  return m ? m[1].trim() : null;
};

/**
 * The abilities this model prints, in the catalogue's own order.
 *
 * Starts from the abilities that are not `hidden`, then walks the unit's
 * `profile:<name>` `hidden` modifiers in document order — a later one wins, as
 * it does everywhere else in this vocabulary.
 */
export function visibleAbilities(
  profile: Pick<UnitProfile, 'abilities' | 'modifiers'>,
  ctx: VisibilityContext = {},
): Ability[] {
  const abilities = profile.abilities ?? [];
  if (!abilities.length) return [];

  /*
    Keyed by the ability's own id, not by its name. The Yoke Fiend states
    `Hateful` twice — one version for a Fang of the Seething Black Warband and
    one for everybody else — and a name-keyed map made the two one entry, so
    whichever modifier was read last hid both and the ability appeared under no
    Variant at all. `Modifier.originId` is what tells them apart.
  */
  const shown = new Map<string, boolean>();
  for (const a of abilities) shown.set(a.id, !a.hidden);

  /** The abilities a modifier is about: the one it names by id, else by name. */
  const targets = (m: { origin?: string; originId?: string }): Ability[] => {
    if (m.originId) {
      const byId = abilities.find((a) => a.id === m.originId);
      return byId ? [byId] : [];
    }
    const name = abilityOfOrigin(m.origin);
    if (name === null) return [];                // about the ENTRY, not an ability
    return abilities.filter((a) => key(a.name) === key(name));
  };

  for (const m of profile.modifiers ?? []) {
    if (m.field !== 'hidden' || m.op !== 'set') continue;
    const about = targets(m);
    if (!about.length) continue;                 // names no ability on this entry
    const ok = decide(m.when, ctx);
    if (ok !== true) continue;                   // false, or undecidable: unapplied
    for (const a of about) shown.set(a.id, String(m.value) !== 'true');
  }

  return abilities.filter((a) => shown.get(a.id) !== false);
}

/**
 * Every ability, with the ones only a Variant reveals labelled.
 *
 * For the Codex, which describes the game rather than one roster: an ability a
 * player cannot see anywhere is a rule missing from the reference. The label is
 * the Variants whose reveal is the ability's only route in.
 */
export function labelledAbilities(
  profile: Pick<UnitProfile, 'abilities' | 'modifiers'>,
  dataset?: Dataset | null,
): Ability[] {
  const variants = dataset?.variants ?? [];
  const reveals = new Map<string, Set<string>>();

  for (const m of profile.modifiers ?? []) {
    if (m.field !== 'hidden' || m.op !== 'set' || String(m.value) === 'true') continue;
    const name = abilityOfOrigin(m.origin);
    if (name === null) continue;
    const names = new Set<string>();
    const walk = (when: unknown) => {
      if (!when || typeof when !== 'object') return;
      const g = when as { all?: unknown[]; any?: unknown[] };
      if (Array.isArray(g.all)) { g.all.forEach(walk); return; }
      if (Array.isArray(g.any)) { g.any.forEach(walk); return; }
      const leaf = when as Leaf;
      const hit = variants.find((v) =>
        (leaf.childId && v.entryId === leaf.childId)
        || (leaf.childName && key(v.name) === key(leaf.childName)));
      /* The Variant's name where the reveal names one, and the catalogue's own
         word where it does not — the Court's Sins reveal by `Envy`, `Wrath`
         and so on, and "revealed by Envy" is what a reader needs. */
      if (hit) names.add(hit.name);
      else if (leaf.childName) names.add(leaf.childName);
    };
    walk(m.when);
    if (!names.size) continue;
    const at = reveals.get(key(name)) ?? new Set<string>();
    names.forEach((n) => at.add(n));
    reveals.set(key(name), at);
  }

  return (profile.abilities ?? []).map((a) => {
    if (!a.hidden) return a;
    const by = reveals.get(key(a.name));
    return by?.size ? { ...a, variantOnly: [...by] } : a;
  });
}

/**
 * Condition leaves `visibleAbilities` cannot decide, across a whole dataset.
 *
 * The build's own guard against this rule failing quietly: a hidden ability
 * whose reveal cannot be evaluated stays exactly as the catalogue printed it,
 * which is the safe answer and an invisible one. Asserted at zero over the
 * shipped catalogues, so a catalogue release that introduces a new condition
 * shape is a failing test rather than an ability that stops appearing for
 * somebody, six weeks later, in a campaign.
 */
export function unknownVisibilityLeaves(
  dataset: Dataset,
): { unit: string; ability: string; leaf: string }[] {
  const out: { unit: string; ability: string; leaf: string }[] = [];
  /* Both lists supplied and empty: a Warband that has declared no Variant and
     chosen no Sin, which is what a fresh roster is. Anything still undecidable
     against that is a condition shape this cannot read. */
  const ctx: VisibilityContext = { dataset, selections: [], rosterSelections: [] };

  const collect = (when: unknown, into: Leaf[]) => {
    if (!when || typeof when !== 'object') return;
    const g = when as { all?: unknown[]; any?: unknown[] };
    if (Array.isArray(g.all)) { g.all.forEach((c) => collect(c, into)); return; }
    if (Array.isArray(g.any)) { g.any.forEach((c) => collect(c, into)); return; }
    into.push(when as Leaf);
  };

  for (const unit of dataset.units) {
    const names = new Set((unit.abilities ?? []).map((a) => key(a.name)));
    const ids = new Set((unit.abilities ?? []).map((a) => a.id));
    for (const m of unit.modifiers ?? []) {
      if (m.field !== 'hidden' || m.op !== 'set') continue;
      const ability = abilityOfOrigin(m.origin);
      if (m.originId ? !ids.has(m.originId) : (ability === null || !names.has(key(ability)))) continue;
      const leaves: Leaf[] = [];
      collect(m.when, leaves);
      for (const leaf of leaves) {
        if (decide(leaf, ctx) !== null) continue;
        out.push({
          unit: unit.name,
          ability: ability
            ?? (unit.abilities ?? []).find((a) => a.id === m.originId)?.name
            ?? '(unnamed)',
          leaf: leaf.childName || leaf.childId || `${leaf.scope}:${leaf.type}`,
        });
      }
    }
  }
  return out;
}

/**
 * Everything selected on one model, by name, for `VisibilityContext.selections`.
 *
 * Wider than `traitsOf` in `rules/formulae.ts`, deliberately: that answers
 * "does this model unlock that catalogue entry?", where only options,
 * abilities and Skills can, and this answers "what is on this model?", where a
 * shield and a two-handed axe are the whole question. The Shocktrooper's Shock
 * Charge turns on exactly those two.
 *
 * Injuries are included because the catalogues gate on them — `Lost Arm [26]`
 * is a condition name in the Court's entries — and they are as much a fact
 * about the model as its armour is.
 */
export function modelSelections(unit: {
  equippedWeapons?: { name: string }[];
  equippedArmour?: { name: string }[];
  equippedEquipment?: { name: string }[];
  specialUpgrades?: { name: string }[];
  injuries?: string[];
  scars?: { name?: string }[];
} | null | undefined): string[] {
  if (!unit) return [];
  return [
    ...(unit.equippedWeapons ?? []).map((w) => w.name),
    ...(unit.equippedArmour ?? []).map((a) => a.name),
    ...(unit.equippedEquipment ?? []).map((e) => e.name),
    ...(unit.specialUpgrades ?? []).map((o) => o.name),
    ...(unit.injuries ?? []),
    ...(unit.scars ?? []).map((s) => s.name ?? ''),
  ].filter(Boolean);
}
