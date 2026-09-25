/**
 * BattleScribe .cat/.gst -> normalised entities.
 *
 * The catalogues are the base layer of every ruleset (docs/RULESET-MODEL.md §2).
 * They are the only machine-readable source, and they carry the three things
 * the hand-written data could not express: Glory Points as a separate cost,
 * recruitment limits as constraints, and base sizes.
 *
 * Shape notes, from surveying the files:
 *   - profile typeName is one of Unit | Weapon | Battlekit | Ability
 *   - Unit profiles carry Movement / Ranged / Melee / Armour / Base
 *   - Weapon and Battlekit carry Type / Range / Keywords / Rules
 *   - entryLink@targetId points into sharedSelectionEntries, so entries must be
 *     resolved through an id index rather than read positionally
 *   - categoryLink gives both keywords (HEAVY, FEAR) and roles (Elite, Troop)
 *   - constraint gives min/max scoped to roster or parent
 *   - `modifier` is how the catalogues express everything conditional: a
 *     Warband Variant renaming Azeb -> Kavass, armour derived from the armour
 *     you equipped, an option that raises a cost. There are 1,862 of them and
 *     they were previously discarded, which is why the generated data could
 *     not express `Favoured Brazen Bull` at all. See `modifiersOf`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Attribute values are kept verbatim. The default trims them, and the `join`
  // separator on an append/prepend modifier is U+00A0 — a non-breaking space,
  // so trimming silently reduced it to '' and produced "FavouredBrazen Bull".
  // Everything read for display goes through `clean()` anyway.
  trimValues: false,
  // Keep single children as arrays where we always want to iterate.
  isArray: (name) =>
    ['selectionEntry', 'selectionEntryGroup', 'entryLink', 'categoryLink',
     'constraint', 'cost', 'profile', 'characteristic', 'categoryEntry',
     'infoLink', 'costType', 'characteristicType',
     'modifier', 'modifierGroup', 'condition', 'conditionGroup'].includes(name),
});

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const attr = (n, k) => (n ? n[`@_${k}`] : undefined);

/** Depth-first walk over every object node. */
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((c) => walk(c, fn)); return; }
  fn(node);
  for (const k of Object.keys(node)) walk(node[k], fn);
}

const clean = (s) =>
  String(s ?? '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** `6"/Infantry` -> { inches: 6, type: 'Infantry' } */
export function splitMovement(raw) {
  const s = clean(raw).replace(/&quot;/g, '"').replace(/[”″]/g, '"');
  const m = s.match(/^([\d.]+)\s*"?\s*(?:\/\s*(.+))?$/);
  if (!m) return { movement: s, movementInches: null, movementType: null };
  return {
    movement: s,
    movementInches: Number(m[1]),
    movementType: m[2] ? clean(m[2]) : null,
  };
}

const charMap = (profile) => {
  const out = {};
  for (const c of arr(profile?.characteristics?.characteristic)) {
    out[attr(c, 'name')] = clean(c['#text']);
  }
  return out;
};

function costsOf(node) {
  const cost = { ducats: 0, glory: 0 };
  for (const c of arr(node?.costs?.cost)) {
    const name = attr(c, 'name');
    const value = Number(attr(c, 'value') ?? 0);
    if (name === 'Ducats') cost.ducats += value;
    else if (name === 'Glory Points') cost.glory += value;
  }
  return cost;
}

function constraintsOf(node) {
  return arr(node?.constraints?.constraint).map((c) => ({
    // Kept because modifiers address constraints by id: "a House of Wisdom
    // Warband cannot include Janissaries" is a modifier setting the Janissary's
    // roster max to 0, not prose anywhere in the catalogue.
    id: attr(c, 'id'),
    type: attr(c, 'type'),
    value: Number(attr(c, 'value')),
    scope: attr(c, 'scope'),
    includeChildSelections: attr(c, 'includeChildSelections') === 'true',
  }));
}

/* --------------------------------------------------------------- options */

/**
 * A unit's own upgrade choices: the Takwin Homunculus's `Massive Size` and
 * `Additional Arm`, the Black Grail's Strains and Vile Corpus, Goetic Powers,
 * Glory Items.
 *
 * They are `selectionEntry type="upgrade"` carrying an Ability profile, nested
 * in a `selectionEntryGroup` *inline on the unit entry*. The first parser only
 * emitted entries with a Unit, Weapon or Battlekit profile, so an upgrade whose
 * only profile is an Ability produced nothing at all and every one of them was
 * dropped — `options[]` was empty on all 89 units.
 *
 * Only inline groups are read. The unit's `entryLinks` point at the shared
 * Weapons / Armour / Equipment groups, which are already parsed into
 * `weapons`; following them here would staple all 543 gear entries onto every
 * unit.
 */
function optionsOf(node, nameOf, fieldNameOf, isConstraint, resolve) {
  const out = [];
  const seen = new Set();

  /*
    A group's full ancestry, `::`-joined, as BattleScribe writes a group path.

    The leaf alone is not enough. `Alchemical Formulae` has an `Eye Options`
    sub-group holding Hawk Eyes and Hypnotic Eyes, and emitting only the leaf
    made those two stop being Alchemical Formulae anywhere in the app:
    `rules/formulae.ts` decides that by asking whether the group CONTAINS
    `Alchemical Formulae`, and documents the value as looking exactly like
    `Alchemical Formulae::Eye Options` so that "a sub-group counts as its
    parent — an Eye Option is a Formula, and the player buys it from the same
    allowance". No group in the shipped dataset contained `::`, so the one
    sub-group that comment names was the one case the predicate got wrong: an
    imported Hawk Eyes rendered under ordinary gear rather than in the card's
    Alchemical Formula section, and `toRoster` did not hand it to the
    validator as a Formula at all.

    Carried BESIDE the leaf rather than replacing it. `group` is what the
    builder prints as a section heading — a player should read `Eye Options`,
    not `Alchemical Formulae::Eye Options` — and what several exact-match
    readers compare against.
  */
  const fromGroup = (g, groupName, groupPath = groupName) => {
    for (const e of arr(g?.selectionEntries?.selectionEntry)) {
      if (attr(e, 'type') !== 'upgrade') continue;
      // An entry may inline its profile or reach it through an infoLink, and
      // the catalogues use both freely — the Black Grail Strains all link.
      // Resolve links before classifying, or every linked option is invisible.
      const profiles = [
        ...arr(e?.profiles?.profile),
        ...arr(e?.infoLinks?.infoLink)
          .filter((l) => attr(l, 'type') === 'profile')
          .map((l) => resolve(attr(l, 'targetId')))
          .filter(Boolean),
      ];
      const ability = profiles.find((pr) => attr(pr, 'typeName') === 'Ability');

      // Profile type does not separate an option from gear: the catalogues type
      // a Black Grail Strain as `Battlekit`, exactly like a piece of equipment.
      // So take anything that carries rules text and is not a weapon, then drop
      // whatever the pipeline already emits as gear in the post-pass below —
      // "already represented elsewhere" is the reliable test, not the label.
      const rules = ability
        ?? profiles.find((pr) => attr(pr, 'typeName') === 'Battlekit');
      if (!rules) continue;
      if (profiles.some((pr) => ['Weapon', 'Unit'].includes(attr(pr, 'typeName')))) continue;

      if (seen.has(attr(e, 'id'))) continue;
      seen.add(attr(e, 'id'));
      out.push({
        id: attr(e, 'id'),
        name: clean(attr(e, 'name')),
        group: groupName,
        /* Only where it says something the leaf does not, so the dataset does
           not grow a field repeating `group` on every top-level option. */
        ...(groupPath && groupPath !== groupName ? { groupPath } : {}),
        cost: costsOf(e),
        // The id of the profile carrying the rules, so the gear post-pass can
        // recognise an option that is really an armoury entry.
        profileId: attr(rules, 'id'),
        description: clean(charMap(rules).Description || charMap(rules).Rules),
        constraints: constraintsOf(e),
        modifiers: modifiersOf(e, nameOf, fieldNameOf, isConstraint),
      });
    }
    // Groups nest: "Vile Corpus" sits inside a wrapper group. The leaf wins
    // for `group`, and the path keeps what the leaf drops.
    for (const inner of arr(g?.selectionEntryGroups?.selectionEntryGroup)) {
      const name = clean(attr(inner, 'name'));
      fromGroup(inner, name || groupName, name ? [groupPath, name].filter(Boolean).join('::') : groupPath);
    }
  };

  for (const g of arr(node?.selectionEntryGroups?.selectionEntryGroup)) {
    fromGroup(g, clean(attr(g, 'name')));
  }

  // Shared groups reached by entryLink. The Black Grail's Strains and Vile
  // Corpus live here rather than inline, so reading only inline groups missed
  // them entirely. Gear groups resolve to nothing because `fromGroup` skips
  // anything carrying a Weapon or Battlekit profile.
  for (const l of arr(node?.entryLinks?.entryLink)) {
    if (attr(l, 'type') !== 'selectionEntryGroup') continue;
    const g = resolve(attr(l, 'targetId'));
    if (g) fromGroup(g, clean(attr(l, 'name')) || clean(attr(g, 'name')));
  }
  return out;
}

/* --------------------------------------------------------- forced Battlekit */

/**
 * The gear a model always has.
 *
 * The Warbands book states it as a Battlekit line — "A Combat Medic always has
 * Standard Armour, a Gas Mask, a Medi-kit, and a Misericordia" — and the
 * catalogues state it as an `entryLink` carrying a `min="1"` constraint. The
 * parser read neither, so a Combat Medic in the app carried none of that kit
 * and none of the keywords it grants: no NEGATE GAS on a model whose profile
 * says it is wearing a gas mask.
 *
 * It also let the player buy the same item twice. The catalogue hides the
 * Armoury's Gas Mask row from a Combat Medic for exactly that reason; with the
 * forced link dropped, the app had nothing to hide it against and would sell a
 * second one for 5 Ducats.
 *
 * A link with `min="1"` and `max="1"` is the mandatory case and the only one
 * read here: a `min` of 1 on a group that lets you pick between options is a
 * choice, not a fixture, and belongs with `options`.
 */
function forcedKitOf(node, resolve) {
  const out = [];
  const seen = new Set();

  /* Keywords a gear profile grants, from whichever profiles carry them. */
  const keywordsOf = (profiles) => [...new Set(profiles
    .flatMap((pr) => clean(charMap(pr).Keywords).split(','))
    .map((k) => clean(k).toUpperCase())
    .filter((k) => k && k !== '-'))];

  const GEAR = ['Weapon', 'Battlekit'];
  const gearProfilesOf = (e) => arr(e?.profiles?.profile)
    .filter((pr) => GEAR.includes(attr(pr, 'typeName')));

  /*
    Every name this kit entry prints, its own and its children's.

    A forced link names the ENTRY and the roster records the PROFILE, and the
    two are routinely different. "A Sultanate Sapper always has a Shovel"
    (Warbands L4739) links the shared `Shovel` entry in `Equipment.cat`, and
    that entry nests an `Include Weapon Profile?` child whose profile is called
    `Weaponized Shovel` — which is the name NewRecruit writes, so an imported
    Sapper carried an item its own Battlekit did not appear to cover and the
    Armoury Table was asked about it.

    One level of nesting is enough for every case in the catalogues: the child
    exists to hold a profile, not to hold more children.
  */
  const printedNames = (e) => [...new Set([
    clean(attr(e, 'name')),
    ...gearProfilesOf(e).map((pr) => clean(attr(pr, 'name'))),
    ...arr(e?.selectionEntries?.selectionEntry).flatMap((c) => [
      ...gearProfilesOf(c).map((pr) => clean(attr(pr, 'name'))),
    ]),
  ].filter(Boolean))];

  const push = (entry) => {
    if (!entry.id || seen.has(entry.id)) return;
    seen.add(entry.id);
    out.push(entry);
  };

  const minMax = (e) => {
    const cs = arr(e?.constraints?.constraint);
    const min = cs.find((c) => attr(c, 'type') === 'min');
    const max = cs.find((c) => attr(c, 'type') === 'max');
    return { min, max };
  };

  /*
    Shape 1: an entryLink with `min` equal to `max`.

    Shape 2: an entryLink with a `min` and NO `max`. "At least one, and you may
    take more" is still "always has" for the one, and the Mercenaries catalogue
    states the Combat Biologist's Gas Grenades, Gas Mask and Standard Armour
    that way. Requiring a `max` skipped all three and left the model with no
    Battlekit at all.

    The rule the original comment states still holds and is why this reads
    entryLinks and not groups: a `min` on a GROUP that lets you pick between
    options is a choice, not a fixture, and belongs with `options`.
  */
  for (const l of arr(node?.entryLinks?.entryLink)) {
    if (attr(l, 'type') !== 'selectionEntry') continue;
    const { min, max } = minMax(l);
    if (!min || Number(attr(min, 'value')) < 1) continue;
    if (max && Number(attr(max, 'value')) !== Number(attr(min, 'value'))) continue;

    const target = resolve(attr(l, 'targetId'));
    if (!target) continue;
    const profiles = arr(target?.profiles?.profile);

    push({
      id: attr(target, 'id'),
      // What the roster selects, so a modifier scoped to the selection resolves.
      linkId: attr(l, 'id'),
      name: clean(attr(l, 'name')) || clean(attr(target, 'name')),
      quantity: Number(attr(min, 'value')),
      keywords: keywordsOf(profiles),
      /*
        Almost always zero, and that is the catalogue's own accounting rather
        than a free lunch: it prices the model to include the kit. Where it is
        not zero the cost belongs to the model, so it is carried through and
        the cost engine adds it.
      */
      cost: costsOf(target),
      profileId: profiles[0] ? attr(profiles[0], 'id') : undefined,
      profileNames: printedNames(target),
    });
  }

  /*
    Shape 3: a selectionEntry nested inside the model, min = max, carrying a
    Weapon or Battlekit profile of its own. The Sin Eater's Tenderizer Maul and
    the Goetic Warlock's Iron-Clawed Hands are stated this way — no link to
    resolve, the entry simply sits inside the model.
  */
  for (const e of arr(node?.selectionEntries?.selectionEntry)) {
    const { min, max } = minMax(e);
    if (!min || !max) continue;
    if (Number(attr(min, 'value')) < 1) continue;
    if (Number(attr(max, 'value')) !== Number(attr(min, 'value'))) continue;

    const profiles = gearProfilesOf(e);
    if (!profiles.length) continue;

    push({
      id: attr(e, 'id'),
      /* There is no link: the entry IS what the roster selects. */
      linkId: attr(e, 'id'),
      name: clean(attr(e, 'name')) || clean(attr(profiles[0], 'name')),
      quantity: Number(attr(min, 'value')),
      keywords: keywordsOf(profiles),
      cost: costsOf(e),
      profileId: attr(profiles[0], 'id'),
      profileNames: printedNames(e),
    });
  }

  /*
    A Weapon profile on the model ITSELF — the Combat Biologist's Vivisector,
    the Witchburner's Gavel of Justice — is deliberately NOT read here, and
    the reason is worth writing down because it looks like an omission.

    The catalogue uses a model-node Weapon profile for two different things
    and does not distinguish them. Sometimes it is kit the model always has.
    Sometimes it is a reference statline for a weapon the model can produce,
    or choose between. Reading the shape structurally gets the first case
    right and the second case wrong, and the book says which is which:

    - Artillery Witch (Warbands L6560): "always has Infernal Bombs" — the
      model node carries Infernal Bomb, Gas Bomb AND Phosphor Bomb, so the
      structural rule hands her two she does not have.
    - Ecclesiastic Prisoner (L3229): "always has an Iron Capirote" — the
      structural rule gives her Feeble Flailing instead.
    - Heralds of Beelzebub (L7920): "cannot have any other Battlekit apart
      from a Compound Eyes Helmet" — the structural rule adds an Infected
      Proboscis.

    Three wrong out of the handful checked is not a rule, it is a coincidence
    that holds for the Mercenaries. So the Vivisector and the Gavel are stated
    from the book, where "always has" is written down, rather than guessed
    from a shape that means two things.

    What IS fixed here is the price: a gear profile on a model node was
    emitted into `weapons` at the MODEL's cost. See the note at the emit.
  */

  return out;
}

/* ------------------------------------------------------------- modifiers */

/**
 * BattleScribe expresses every conditional rule as a `modifier`: "set the name
 * to Favoured Kavass when this option is selected", "decrement Armour when this
 * armour is equipped", "add 5 Ducats". They hang off entries, off groups, and
 * off the profiles inside an entry, and the field they touch is a
 * characteristicType or costType id rather than a name.
 *
 * Reading them is what lets the app answer "what does this model actually look
 * like once I have equipped it", which is the whole point of a roster builder.
 * They are parsed and preserved here, with their condition tree intact and
 * every id resolved to a readable name; evaluating them against a roster is
 * `src/rules/modifiers.ts`.
 *
 * Nothing is invented: a field or condition this cannot map is kept verbatim
 * under its raw id and reported, never dropped and never guessed.
 */

/** Characteristic/cost name -> the path it occupies on our entities. */
const FIELD_PATHS = {
  Movement: 'stats.movement',
  Ranged: 'stats.ranged',
  Melee: 'stats.melee',
  Armour: 'stats.armour',
  Base: 'stats.base',
  Keywords: 'keywords',
  Range: 'range',
  Type: 'type',
  Rules: 'rules',
  Description: 'description',
  Ducats: 'cost.ducats',
  'Glory Points': 'cost.glory',
};

/** Fields BattleScribe names directly rather than by id. */
const LITERAL_FIELDS = new Set(['name', 'hidden', 'category', 'error', 'warning', 'forces']);

/**
 * The names a `set hidden false` on this entry tests for — the models and
 * options that make it available. Empty when nothing reveals it.
 */
function revealNames(node, nameOf) {
  const out = new Set();
  const walkConds = (n) => {
    if (!n || typeof n !== 'object') return;
    for (const c of arr(n.condition)) {
      const id = attr(c, 'childId');
      const name = id && nameOf(id);
      if (name) out.add(clean(name));
    }
    for (const g of arr(n.conditionGroup)) walkConds(g);
    if (n.conditions) walkConds(n.conditions);
    if (n.conditionGroups) walkConds(n.conditionGroups);
  };
  for (const m of arr(node?.modifiers?.modifier)) {
    if (attr(m, 'field') !== 'hidden' || String(attr(m, 'value')) !== 'false') continue;
    walkConds(m);
  }
  return out.size ? [...out] : undefined;
}

function conditionOf(c, nameOf) {
  const childId = attr(c, 'childId');
  const out = {
    type: attr(c, 'type'),
    value: attr(c, 'value'),
    field: attr(c, 'field'),
    scope: attr(c, 'scope'),
  };
  if (childId) {
    out.childId = childId;
    // A UUID in a rule nobody can read is a rule nobody will maintain.
    const n = nameOf(childId);
    if (n) out.childName = n;
  }
  if (attr(c, 'includeChildSelections') === 'true') out.includeChildSelections = true;
  return out;
}

/** `<conditions>` and `<conditionGroups>` on one node -> a boolean tree. */
function conditionTreeOf(node, nameOf, joiner = 'and') {
  const leaves = arr(node?.conditions?.condition).map((c) => conditionOf(c, nameOf));
  const groups = arr(node?.conditionGroups?.conditionGroup).map((g) =>
    conditionTreeOf(g, nameOf, attr(g, 'type') ?? 'and'));
  const all = [...leaves, ...groups];
  if (!all.length) return null;              // unconditional
  if (all.length === 1 && joiner === 'and') return all[0];
  return { [joiner === 'or' ? 'any' : 'all']: all };
}

function modifierOf(m, nameOf, fieldNameOf, origin, comment, isConstraint) {
  const rawField = attr(m, 'field');

  // A modifier can target a constraint rather than a characteristic, which is
  // how a Warband Variant changes a recruitment limit. BattleScribe writes the
  // constraint's id, sometimes suffixed -min/-max where one entry carries both.
  const asConstraint = String(rawField ?? '').match(/^(.*?)(?:-(min|max))?$/);
  if (asConstraint && isConstraint(asConstraint[1])) {
    const out = {
      op: attr(m, 'type'),
      field: `constraint:${asConstraint[1]}`,
      value: attr(m, 'value'),
      origin,
    };
    if (asConstraint[2]) out.constraintBound = asConstraint[2];
    const when = conditionTreeOf(m, nameOf);
    if (when) out.when = when;
    if (comment) out.comment = comment;
    return out;
  }

  const named = LITERAL_FIELDS.has(rawField) ? rawField : fieldNameOf(rawField);
  const out = {
    op: attr(m, 'type'),
    field: FIELD_PATHS[named] ?? named ?? rawField,
    value: attr(m, 'value'),
    origin,
  };
  // `join` is the separator an append/prepend uses — usually U+00A0, so
  // "Favoured Brazen Bull" keeps its title on the same line as its name.
  const join = attr(m, 'join');
  if (join != null) out.join = join;
  // `scope` on the modifier itself, distinct from the condition's scope.
  const mScope = attr(m, 'scope');
  if (mScope) out.scope = mScope;
  // Keep the raw id whenever we could not name the field, so an unmapped
  // modifier is visibly unmapped rather than silently mislabelled.
  if (!FIELD_PATHS[named] && !LITERAL_FIELDS.has(rawField)) out.rawField = rawField;
  const when = conditionTreeOf(m, nameOf);
  if (when) out.when = when;
  if (comment) out.comment = comment;
  return out;
}

/** Every modifier on an entry, its groups, and the profiles it contains. */
function modifiersOf(node, nameOf, fieldNameOf, isConstraint) {
  const out = [];

  const fromNode = (n, origin, comment, originId) => {
    const stamp = (mod) => (originId ? { ...mod, originId } : mod);
    for (const m of arr(n?.modifiers?.modifier)) {
      out.push(stamp(modifierOf(m, nameOf, fieldNameOf, origin, comment, isConstraint)));
    }
    for (const g of arr(n?.modifierGroups?.modifierGroup)) {
      // A group carries its own conditions that gate every modifier inside it,
      // and usually a <comment> naming the rule ("armour adjustments").
      const gate = conditionTreeOf(g, nameOf, attr(g, 'type') ?? 'and');
      const label = clean(g.comment) || comment;
      for (const m of arr(g?.modifiers?.modifier)) {
        const mod = modifierOf(m, nameOf, fieldNameOf, origin, label, isConstraint);
        if (gate) mod.when = mod.when ? { all: [gate, mod.when] } : gate;
        out.push(stamp(mod));
      }
      for (const inner of arr(g?.modifierGroups?.modifierGroup)) {
        fromNode(inner, origin, label, originId);
      }
    }
  };

  fromNode(node, 'entry');
  for (const p of arr(node?.profiles?.profile)) {
    /*
      `originId` alongside the readable origin, because a NAME is not an
      identity here. The Yoke Fiend states `Hateful` twice — one version for a
      Fang of the Seething Black Warband and one for everybody else, each
      hidden by its own condition — and an origin of `profile:Hateful` applies
      to both, so whichever modifier was read last decided both profiles and
      the ability vanished under every Variant.

      The readable form stays: it is what a reader greps for, and it is what a
      ruleset generated before this carries.
    */
    fromNode(p, `profile:${clean(attr(p, 'name'))}`, undefined, attr(p, 'id'));
  }

  /*
    The catalogues routinely state the same rule twice — once on the entry and
    again on the profile inside it — because BattleScribe needs both to update
    its own two views. It is one rule, so keep one copy: the entry-level
    statement, which is the one that survives if the profile is restructured.

    `hidden` is the exception, and it has to be, because `hidden` does not mean
    one thing wherever it is written (DA-01). On an ENTRY it says whether the
    model is on the recruit list; on a PROFILE it says whether that one ability
    is printed. Discarding the origin made those the same rule, so:

      - four identical "reveal when Remnants of Byzantium" modifiers on the
        Shocktrooper's four hidden abilities collapsed to one, and three of the
        four abilities had nothing left to reveal them;
      - the Stalker's four reveals collapsed into the entry-level reveal that
        unlocks the MODEL, which is a different sentence about a different
        thing.

    Measured on the shipped catalogues: four rules are stated on more than one
    profile and every one of them is `hidden`; thirteen are stated on both an
    entry and a profile, of which one is `hidden` — the Stalker's. Keying
    `hidden` on its origin recovers all five without changing any of the other
    twelve.
  */
  const ORIGIN_SENSITIVE = new Set(['hidden']);
  const seen = new Set();
  return out.filter((m) => {
    const { origin, ...rule } = m;
    const { originId, ...bare } = rule;
    const k = ORIGIN_SENSITIVE.has(m.field)
      ? `${origin}\u0000${originId ?? ''}\u0000${JSON.stringify(bare)}`
      : JSON.stringify(bare);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * min/max for a unit entry. BattleScribe expresses "0-2 Sniper Priests" as a
 * roster-scoped max of 2 (and a min of 1 for required entries like the
 * Lieutenant), so read them off the constraints rather than the name.
 */
function recruitLimits(constraints) {
  const roster = constraints.filter((c) => c.scope === 'roster');
  const min = roster.find((c) => c.type === 'min');
  const max = roster.find((c) => c.type === 'max');
  return { min: min ? min.value : null, max: max ? max.value : null };
}

/**
 * A variant's special rules, including the ones stated by a group rather than
 * by the variant entry itself.
 *
 * The House of Wisdom prints eight special rules and the app carried seven;
 * the Kingdom of Alba Assault Detachment was missing one too. Both were
 * missing for the same reason: most rules are Ability profiles on the variant
 * entry, but a rule the catalogue also models MECHANICALLY gets a group of its
 * own, and its profile goes on the group.
 *
 *   selectionEntry      "The House of Wisdom"
 *     selectionEntryGroup "Weapon Collections"        <- max=1 sub-groups for
 *       profile           "Weapon Collections"           each foreign armoury
 *
 *   selectionEntry      "Kingdom of Alba Assault Detachment"
 *     selectionEntryGroup "Cold Steel Discounts"      <- the discounted entries
 *       profile           "Cold Steel"
 *
 * A reader that looks only at the entry's own profiles cannot see either, and
 * the player was not shown a rule their Warband has.
 *
 * Only DIRECT children of the variant entry are read, and that is the whole
 * condition. A variant entry also contains its armoury, but those groups nest
 * further down — `Ranged (One-Handed)` and the rest are grandchildren — so
 * depth alone separates a rule from a rack of weapons.
 *
 * An earlier version of this also required the group's name to match its
 * profile's, on the theory that it distinguished a group that IS a rule from
 * one that merely contains things. It does not: `Cold Steel` lives under
 * `Cold Steel Discounts`, and the extra condition silently dropped it. Across
 * all 27 variants the direct-child rule adds exactly these two rules and
 * nothing else, which is what `variantSpecialRules.test.ts` pins.
 */
function variantSpecialRules(entry) {
  const abilityProfiles = (node) => arr(node?.profiles?.profile)
    .filter((pr) => attr(pr, 'typeName') === 'Ability');

  const rules = abilityProfiles(entry);

  for (const g of arr(entry?.selectionEntryGroups?.selectionEntryGroup)) {
    rules.push(...abilityProfiles(g));
  }

  return rules.map((pr) => ({
    name: clean(attr(pr, 'name')),
    description: clean(charMap(pr).Description),
  }));
}

export function parseCatalogues(dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.(cat|gst)$/.test(f));

  /** id -> node, so entryLink@targetId can be resolved. */
  const byId = new Map();
  const docs = [];

  for (const file of files) {
    const doc = parser.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    docs.push({ file, doc });
    walk(doc, (n) => {
      const id = attr(n, 'id');
      if (id && !byId.has(id)) byId.set(id, n);
    });
  }

  // Category id -> name, so categoryLinks resolve to readable keywords/roles.
  const categoryNames = new Map();
  for (const { doc } of docs) {
    walk(doc, (n) => {
      if (n.categoryEntries) {
        for (const c of arr(n.categoryEntries.categoryEntry)) {
          categoryNames.set(attr(c, 'id'), attr(c, 'name'));
        }
      }
    });
  }

  // characteristicType / costType id -> name, so a modifier's `field` reads as
  // "Armour" rather than 5de9-d70e-9021-6f71. Derived from the catalogues
  // themselves; nothing here is a hardcoded id.
  const fieldNames = new Map();
  for (const { doc } of docs) {
    walk(doc, (n) => {
      for (const t of arr(n?.characteristicTypes?.characteristicType)) {
        fieldNames.set(attr(t, 'id'), clean(attr(t, 'name')));
      }
      for (const t of arr(n?.costTypes?.costType)) {
        fieldNames.set(attr(t, 'id'), clean(attr(t, 'name')));
      }
    });
  }
  // Characteristics carry their own typeId inline, which covers types declared
  // in a catalogue rather than the game system.
  for (const { doc } of docs) {
    walk(doc, (n) => {
      for (const c of arr(n?.characteristics?.characteristic)) {
        const id = attr(c, 'typeId');
        if (id && !fieldNames.has(id)) fieldNames.set(id, clean(attr(c, 'name')));
      }
      for (const c of arr(n?.costs?.cost)) {
        const id = attr(c, 'typeId');
        if (id && !fieldNames.has(id)) fieldNames.set(id, clean(attr(c, 'name')));
      }
    });
  }

  // Every constraint id in every catalogue, so a modifier targeting one is
  // recognised as changing a limit rather than reported as an unknown field.
  const constraintIds = new Set();
  for (const { doc } of docs) {
    walk(doc, (n) => {
      for (const c of arr(n?.constraints?.constraint)) {
        const id = attr(c, 'id');
        if (id) constraintIds.add(id);
      }
    });
  }
  const isConstraint = (id) => constraintIds.has(id);

  // entryLink id -> the entry it points at. Rosters address a shared entry
  // through a chain of links ("fa41-…::4252-…"), so nothing can be looked up
  // by target id without resolving these first.
  const links = {};
  for (const { doc } of docs) {
    walk(doc, (n) => {
      for (const key of ['entryLink', 'infoLink']) {
        for (const l of arr(n?.[`${key}s`]?.[key])) {
          const id = attr(l, 'id');
          const target = attr(l, 'targetId');
          if (id && target) links[id] = target;
        }
      }
    });
  }

  /*
    Where a shared entry is actually PLACED, and whether that placement is
    hidden.

    A `sharedSelectionEntry` is a definition, not an offer. It appears on a
    list only where an `entryLink` points at it, and **the link carries its own
    `hidden`** — which is the attribute that decides whether a player can pick
    the thing. Reading `hidden` off the definition instead misses the gate
    entirely.

    The Trench Pilgrims Homunculus is the case that found this. Its definition
    is `hidden="false"`, its single `entryLink` is `hidden="true"`, and the
    rulebook says why: a Homunculus is not a Pilgrims recruit, it is what the
    `Book of Golems` Exploration result adds to a Warband mid-campaign. Read
    from the definition it was offered at muster to anyone.

    Only shared entries get this treatment. An entry declared inline is placed
    where it sits, so its own attribute is the whole story.
  */
  const sharedIds = new Set();
  for (const { doc } of docs) {
    walk(doc, (n) => {
      for (const e of arr(n?.sharedSelectionEntries?.selectionEntry)) {
        const id = attr(e, 'id');
        if (id) sharedIds.add(id);
      }
    });
  }

  /** targetId -> every entryLink that places it, across all catalogues. */
  const placements = new Map();
  for (const { doc } of docs) {
    walk(doc, (n) => {
      for (const l of arr(n?.entryLinks?.entryLink)) {
        const target = attr(l, 'targetId');
        if (!target) continue;
        if (!placements.has(target)) placements.set(target, []);
        placements.get(target).push(l);
      }
    });
  }

  /**
   * Whether an entry is off the list until something reveals it.
   *
   * Its own attribute first, then — for a shared definition — the placements.
   * Hidden when every link that places it is hidden.
   *
   * NO placements means "not reached by an entryLink", which is NOT the same
   * as "not available": armoury rows and category links reach entries by other
   * routes, and `[].every()` is `true`, so an early version of this marked Gas
   * Masks, Combat Helmets and Standard Armour hidden — basic kit every warband
   * can buy. An entry this cannot speak about is left alone.
   */
  const hiddenByDefaultOf = (node) => {
    if (attr(node, 'hidden') === 'true') return true;
    const id = attr(node, 'id');
    if (!sharedIds.has(id)) return false;
    const where = placements.get(id) ?? [];
    if (where.length === 0) return false;
    return where.every((l) => attr(l, 'hidden') === 'true');
  };

  const fieldNameOf = (id) => fieldNames.get(id) ?? null;
  const nameOf = (id) => {
    const n = byId.get(id);
    return n ? clean(attr(n, 'name')) || null : null;
  };

  /*
    A model entry may state more than one Unit profile, and only the first of
    them is a recruit (DA-02).

    `Black Grail.cat` L3166 and L3207: the `Grail Thrall` entry holds two
    `upgrade` sub-entries, `Grounded` and `Winged`, each carrying a Unit
    profile — the book prints them as one entry with one cost, "Grail Thralls /
    Fly Thralls". The walk below visits every selectionEntry, so it emitted
    BOTH as units, and the second came out as a 0-Ducat `Winged Thrall` with no
    roles, no keywords and no abilities that `recruitable()` then offered for
    hire beside the 25-Ducat Thrall.

    The same shape holds for the Trench Dog's `Specialization` group, which is
    not a list of recruits either. The rulebook (p.121) is explicit: "When you
    give a Trench Dog to a model, you can give the Trench Dog one of the
    following special abilities at a Cost of +1 ☼" — Guard Dog, Mercy Dog,
    Attack Dog, Martyrdom Dog, Hellhound. The app offered each as a separate
    5-Ducat model.

    So: the first Unit profile under a model entry is the model, and every
    further one is a `secondaryProfile` — the shape `carcass-front-layer.mjs`
    already uses for the Martyr Penitent, and which `recruitable()` filters at
    its own line. They stay in the dataset, for the Codex and for a roster that
    names one.

    Nothing is invented. The statline is the second profile's own, and what the
    sub-entry does not state — its cost, its roles, its keywords, its abilities
    — is filled from the parent entry that does, so the card is the parent's
    card with the second statline rather than a blank.
  */
  const secondaryUnitEntries = new Map();
  /** Entry id of the model -> the statline options its sub-entries offer. */
  const profileOptionsByEntry = new Map();
  for (const { doc } of docs) {
    walk(doc, (node) => {
      if (attr(node, 'type') !== 'model') return;
      const parentId = attr(node, 'id');
      if (!parentId) return;

      /** Sub-entries carrying a Unit profile, in document order. */
      const nested = [];
      const descend = (n, depth) => {
        if (depth > 3) return;
        for (const e of arr(n?.selectionEntries?.selectionEntry)) {
          if (arr(e?.profiles?.profile).some((p) => attr(p, 'typeName') === 'Unit')) {
            nested.push(e);
          }
          descend(e, depth + 1);
        }
        for (const g of arr(n?.selectionEntryGroups?.selectionEntryGroup)) descend(g, depth + 1);
      };
      descend(node, 0);
      if (!nested.length) return;

      const ownUnit = arr(node?.profiles?.profile).some((p) => attr(p, 'typeName') === 'Unit');
      /* With a Unit profile of its own the entry IS the model and every
         sub-entry is secondary; without one the first sub-entry is the model. */
      const secondary = ownUnit ? nested : nested.slice(1);
      /* Every sub-entry under this parent, the primary one included: a
         condition on a secondary profile that names any of them can be decided
         where the profile is emitted. See `resolveAgainstSelf`. */
      const siblings = nested.map((e) => attr(e, 'id')).filter(Boolean);
      for (const e of secondary) {
        const id = attr(e, 'id');
        if (id) secondaryUnitEntries.set(id, { parentId, siblings });
      }

      /*
        And the same sub-entries as OPTIONS on the model they belong to, so the
        second statline can still be fielded.

        Taking them off the recruit list without this made them unreachable:
        `optionsOf` skips any sub-entry carrying a Unit profile, so the Grail
        Thrall offered no way to be a Fly Thrall and the Trench Dog no way to be
        a Guard Dog — the app had removed the wrong half of the entry. The book
        offers exactly this choice: "Grail Thralls / Fly Thralls" is one entry
        with two statlines, and p.121 gives a Trench Dog one of five special
        abilities for +1 ☼.

        Priced from the sub-entry's own `cost`, which is what the catalogue
        charges for the swap — 5 Ducats for a New Antioch dog, 1 Glory for a
        Mercenaries one, nothing for Winged.

        The option is attached to whichever entry emits the MODEL: the parent
        where it holds the Unit profile itself (the Trench Dogs), and the first
        sub-entry where it does not (the Thrall, whose model is emitted from
        `Grounded`).
      */
      const primaryId = ownUnit ? parentId : attr(nested[0], 'id');
      if (primaryId && secondary.length) {
        /* The group each sub-entry sits in, for the heading the builder prints
           — `Thrall Type`, `Specialization`. Found by looking for the entry
           rather than assumed, because the shape differs between the two. */
        const groupOf = new Map();
        const mapGroups = (n, name, depth) => {
          if (depth > 3) return;
          for (const e of arr(n?.selectionEntries?.selectionEntry)) {
            if (name) groupOf.set(attr(e, 'id'), name);
            mapGroups(e, name, depth + 1);
          }
          for (const g of arr(n?.selectionEntryGroups?.selectionEntryGroup)) {
            mapGroups(g, clean(attr(g, 'name')) || name, depth + 1);
          }
        };
        mapGroups(node, '', 0);

        profileOptionsByEntry.set(primaryId, secondary.map((e) => {
          const up = arr(e?.profiles?.profile).find((p) => attr(p, 'typeName') === 'Unit');
          return {
            id: attr(e, 'id'),
            name: clean(attr(e, 'name')),
            group: groupOf.get(attr(e, 'id')) || '',
            cost: costsOf(e),
            /*
              The statline this option swaps in. It is the whole point of the
              option — an entry with two Unit profiles is one model that can be
              either — and it is what lets the card and Play Mode's reference
              sheet show a Fly Thrall's 6"/Flying rather than the Thrall's 5".
            */
            unitProfileId: attr(up, 'id'),
            description: '',
            constraints: constraintsOf(e),
          };
        }));
      }
    });
  }

  const ROLE_NAMES = new Set(['Elite', 'Troop', 'Mercenary', 'Leader', 'Configuration']);

  const factionOf = (file) => path.basename(file, path.extname(file));

  const units = [];
  const nameKeyOf = (n) => String(n ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const weapons = [];
  /*
    Loadout bundles: a selectionEntry with NO profile of its own that links
    two or more items, granting them under a name of its own.

    `Polearm and Shield` is the case — it links the `Polearm` (Weapon) and
    `Shield` (Battlekit) profiles from the shared .gst and defines neither
    itself. A roster holding that name matched nothing and was reported as
    "not in this ruleset", which excludes it from every legality check while
    telling the player their list is only provisional.

    The distinction that makes this safe is OWN versus LINKED. An earlier
    attempt keyed on "the entry name differs from its profile's name" and
    produced `Automatic Pistol -> Stolen: Automatic Pistol` and `Melee ->
    Knight Companion of the Bladed Fly` — aliases that would redirect ordinary
    wargear to another entry entirely. A bundle is narrower and checkable: it
    contributes no profile itself, and hands out several.
  */
  const bundles = new Map();
  /** The profiles a bundle hands out, keyed by name — see the emit below. */
  const bundleProfiles = new Map();
  /*
    BattleScribe's own bookkeeping entries, which are not wargear.

    `Alchemical Ammuntion (Loaded)` is a hidden selectionEntry with a roster
    max of ZERO that a modifier increments by one for each `Alchemical
    Ammunition` on the roster. It exists to make BattleScribe count purchases;
    it has no cost, no profile and no rules, and a player cannot choose it. But
    a roster carrying one matched nothing in the dataset and was reported under
    "NOT IN THIS RULESET" — the worst shape for a miss, because it tells the
    player their list is provisional over a thing that is not an item.

    Identified by that signature and not by the `(Loaded)` in the name: the
    same shape without it is `Dog's Friend`, counting one marker per `Man's
    Best Friend`. Reading the name instead would also have to cope with the
    catalogue spelling four of them `Ammuntion`, which is its own typo.
  */
  const counters = new Map();
  const abilitiesSeen = new Map();

  // The authoritative list of Warband Variants: the children of each faction's
  // "Warband Variant" group. Reading them here rather than inferring from
  // modifier conditions matters — a roster-scope condition can name a unit, a
  // campaign setting or one of the Court's seven sins, none of which are
  // variants, and inferring produced 44 "variants" for 14 real ones.
  //
  // Their special rules come with them, as Ability profiles carrying the full
  // published text — the same rules the Warbands PDF states as prose.
  const variantEntries = [];

  /*
    Third-party variants, found by the group that holds them rather than by
    where that group hangs.

    Five factions nest "Third Party" under `Warband Variant > Variant
    Selection`. The Court of the Seven-Headed Serpent has no "Warband Variant"
    entry at all — its Fang of the Seething Black sits under
    `Seven Deadly Sins > Chosen Sin > Third Party`. Keying on the variant
    ancestry therefore finds five of six. The group's own name is the signal
    that holds everywhere, so that is what this keys on.
  */
  const thirdPartyVariantIds = new Set();
  const thirdPartyVariantNodes = [];
  for (const { file, doc } of docs) {
    walk(doc, (n) => {
      for (const g of arr(n?.selectionEntryGroups?.selectionEntryGroup)) {
        if (clean(attr(g, 'name')) !== 'Third Party') continue;
        const inner = (node) => {
          for (const e of arr(node?.selectionEntries?.selectionEntry)) {
            const id = attr(e, 'id');
            if (!id || thirdPartyVariantIds.has(id)) continue;
            thirdPartyVariantIds.add(id);
            thirdPartyVariantNodes.push({ e, file });
          }
          for (const sub of arr(node?.selectionEntryGroups?.selectionEntryGroup)) inner(sub);
        };
        inner(g);
      }
    });
  }

  for (const { file, doc } of docs) {
    walk(doc, (n) => {
      // "Warband Variant" is a selectionEntry, not a group: the variants are
      // selectionEntries nested in the groups beneath it.
      for (const holder of arr(n?.selectionEntries?.selectionEntry)) {
        if (clean(attr(holder, 'name')) !== 'Warband Variant') continue;
        /*
          The variants are the entries beneath "Warband Variant", but they are
          not all at the same depth: each faction nests a **"Third Party"**
          group inside "Variant Selection", holding the unofficial variants
          (Cadaver Corps, Children of Yggdrasil, Nomads of Al-Badia, …). Reading
          one group level deep found the official ones and silently dropped all
          six of those — and the units they gate then had nothing to be gated
          on, so they were offered unconditionally.

          So: descend groups to any depth, but never into a variant's own
          `selectionEntries` (that is its equipment list, and walking it returns
          the armoury as "variants"). `underThirdParty` carries down whether any
          enclosing group is the third-party one.
        */
        const kids = [];
        const collect = (node, underThirdParty) => {
          for (const e of arr(node?.selectionEntries?.selectionEntry)) {
            kids.push({ e, thirdParty: underThirdParty });
          }
          for (const g of arr(node?.selectionEntryGroups?.selectionEntryGroup)) {
            collect(g, underThirdParty || clean(attr(g, 'name')) === 'Third Party');
          }
        };
        collect(holder, false);

        for (const { e, thirdParty } of kids) {
          if (attr(e, 'id') === attr(holder, 'id')) continue;
          // A Warband Variant states its special rules as Ability profiles.
          // An entry with none is something else that happens to sit here.
          const rules = variantSpecialRules(e);
          if (!rules.length) continue;
          variantEntries.push({
            id: attr(e, 'id'),
            name: clean(attr(e, 'name')),
            factionId: path.basename(file, path.extname(file)),
            /*
              Unofficial: condoned by Factory Fortress but written by other
              people. Carried so the app can hide it unless the Warband opts
              in, rather than showing it as published material.
            */
            thirdParty: (thirdParty || thirdPartyVariantIds.has(attr(e, 'id'))) || undefined,
            specialRules: rules,
          });
        }
      }
    });
  }
  /*
    Then any third-party variant the "Warband Variant" walk could not reach —
    the Court's Fang of the Seething Black, which hangs off Chosen Sin instead.
    Same shape as the others: a variant states its rules as Ability profiles.
  */
  for (const { e, file } of thirdPartyVariantNodes) {
    if (variantEntries.some((v) => v.id === attr(e, 'id'))) continue;
    const rules = variantSpecialRules(e);
    if (!rules.length) continue;
    variantEntries.push({
      id: attr(e, 'id'),
      name: clean(attr(e, 'name')),
      factionId: path.basename(file, path.extname(file)),
      thirdParty: true,
      specialRules: rules,
    });
  }

  // The same variant is reachable more than once through links.
  {
    const seen = new Set();
    for (let i = variantEntries.length - 1; i >= 0; i--) {
      const id = variantEntries[i].id;
      if (seen.has(id)) variantEntries.splice(i, 1);
      else seen.add(id);
    }
  }

  for (const { file, doc } of docs) {
    const faction = factionOf(file);

    walk(doc, (node) => {
      /*
        A counter, in the sense above: hidden, costless, profileless, capped at
        zero across the roster, and incremented once per something else the
        roster holds — which is the entry it is counting.
      */
      const revealedBy = arr(node?.modifiers?.modifier).find(
        (m) => attr(m, 'type') === 'set' && attr(m, 'field') === 'hidden'
            && String(attr(m, 'value')) === 'false');
      const counting = revealedBy
        && arr(revealedBy?.conditions?.condition).find((c) => attr(c, 'childId'));
      const zeroRoster = arr(node?.constraints?.constraint).find(
        (c) => attr(c, 'type') === 'max' && attr(c, 'scope') === 'roster'
            && Number(attr(c, 'value')) === 0);
      const tallies = zeroRoster && arr(node?.modifiers?.modifier).some(
        (m) => attr(m, 'type') === 'increment' && attr(m, 'field') === attr(zeroRoster, 'id')
            && arr(m?.repeats?.repeat).length);
      if (attr(node, 'hidden') === 'true' && counting && tallies
          && !costsOf(node).ducats && !costsOf(node).glory
          && !arr(node?.profiles?.profile).length
          && !arr(node?.infoLinks?.infoLink).some((l) => attr(l, 'type') === 'profile')) {
        const counted = byId.get(attr(counting, 'childId'));
        const nm = clean(attr(node, 'name'));
        if (counted && nm) {
          counters.set(nm, { name: nm, forName: clean(attr(counted, 'name')) });
        }
      }


      // An entry may inline its profile or reach it through an infoLink, and the
      // catalogues use both freely for gear as well as for options: the
      // Sultanate's Jezzail, Siege Jezzail, Wind Amulet, Alchemist Armour and
      // Titan Zulfiqar all link. Reading only inline profiles skipped every one
      // of them, so the rulebook priced them in the Armoury Table and the
      // pipeline had no profile to attach — 14 of 41 Iron Sultanate rows came
      // through with weaponId null, and a warband carrying one reported it as
      // "not in this ruleset".
      // Only Weapon-typed links are pulled in. Resolving Battlekit links here
      // too would be wrong, because the post-pass below lets gear win over a
      // unit option, and a Black Grail Strain is a Battlekit reached by link —
      // so it would stop being an option on the units allowed to take it and
      // become equipment anyone can buy, losing the restriction entirely.
      // Battlekit rows the catalogues only reach by link therefore still have
      // no profile; `fromWarband` prices those from the Armoury Table instead.
      const linkedProfiles = arr(node?.infoLinks?.infoLink)
        .filter((l) => attr(l, 'type') === 'profile')
        .map((l) => byId.get(attr(l, 'targetId')))
        .filter(Boolean)
        .filter((pr) => attr(pr, 'typeName') === 'Weapon');
      const profiles = [...arr(node?.profiles?.profile), ...linkedProfiles];
      if (!profiles.length) return;

      const unitProfile = profiles.find((p) => attr(p, 'typeName') === 'Unit');
      const gearProfiles = profiles.filter((p) =>
        ['Weapon', 'Battlekit'].includes(attr(p, 'typeName')));

      // categoryLinks give both keywords and the Elite/Troop role.
      const cats = arr(node?.categoryLinks?.categoryLink)
        .map((c) => attr(c, 'name') ?? categoryNames.get(attr(c, 'targetId')))
        .filter(Boolean)
        .map(clean);

      const abilities = profiles
        .filter((p) => attr(p, 'typeName') === 'Ability')
        .map((p) => {
          const a = {
            id: attr(p, 'id'),
            name: clean(attr(p, 'name')),
            description: clean(charMap(p).Description),
            /*
              The profile's own `hidden` attribute — whether the ability is on
              the entry at all until something reveals it (DA-01).

              The catalogues mark an Ability `hidden="true"` when a Variant owns
              it and reveal it with a `set hidden=false` modifier naming that
              Variant. `New Antioch.cat` L4207 is the shape: the Shocktrooper's
              Axe Mastery, Shield Bash, Indomitable and Weapon Familiarity are
              all hidden, and all four belong to the Remnants of Byzantium.

              This was never read, so `recruitable()` copied every one of them
              into `innateAbilities` and the card printed a standard New Antioch
              Shocktrooper with four Varangian Guard rules it does not have —
              twenty-eight such profiles on fourteen units. The reveal
              modifiers were already in the dataset; only this half was missing,
              and without it the two cannot be told apart.
            */
            ...(attr(p, 'hidden') === 'true' ? { hidden: true } : {}),
          };
          abilitiesSeen.set(a.id, a);
          return a;
        });

      const constraints = constraintsOf(node);
      const cost = costsOf(node);
      /*
        The entry's own modifiers PLUS those of every link that places it.

        A shared entry is gated on its placement, and the modifier that opens
        the gate is written on the link rather than on the definition. The
        Takwin Homunculus is the case: both of its entryLinks are
        `hidden="true"` and both carry `set hidden false` conditioned on
        `The House of Wisdom`, which is exactly what the rulebook says — the
        Book of Golems adds "a Takwin Homunculus from The House of Wisdom
        Variant Warband in the Iron Sultanate Faction List".

        Read from the definition alone the model is hidden with nothing to
        reveal it, which would make a legitimate House of Wisdom recruit
        unreachable. `variantLocks` reads these to decide which Variant
        unlocks a model, so the reveal has to arrive with them.
      */
      const modifiers = modifiersOf(node, nameOf, fieldNameOf, isConstraint);

      /*
        The unit's modifiers plus its placements'. UNIT ONLY — the gear emit
        below shares this scope and must keep the entry's own list.

        Merged into both, the link conditions leaked into every weapon on the
        entry: the Automatic Pistol picked up a reveal naming the third-party
        toggle, `thirdPartyGate` read that as a gate, and the pistol vanished
        from New Antioch's armoury as unofficial content.
      */
      const unitModifiers = [
        ...modifiers,
        ...(placements.get(attr(node, 'id')) ?? [])
          .flatMap((l) => modifiersOf(l, nameOf, fieldNameOf, isConstraint)),
      ];

      if (unitProfile) {
        const c = charMap(unitProfile);
        const mv = splitMovement(c.Movement);
        const { min, max } = recruitLimits(constraints);

        /*
          A second Unit profile under one model entry is a profile, not a
          recruit (DA-02). See `secondaryUnitEntries` for which and why.

          The parent fills only what the sub-entry does not state. A `Winged`
          sub-entry carries a statline and nothing else, so its cost, roles,
          keywords and abilities are the `Grail Thrall` entry's; a `Guard Dog`
          states its own 5-Ducat upgrade price, and keeps it. Inheriting
          wholesale would overwrite a price the catalogue prints.
        */
        /*
          Where this profile is a second statline under one entry: which entry,
          and which sub-entries share it. A condition naming one of those can be
          decided here rather than carried out as an unanswerable question — see
          `resolveAgainstSelf`.
        */
        const secondaryOf = secondaryUnitEntries.get(attr(node, 'id'));
        const parentId = secondaryOf?.parentId;
        const siblingIds = new Set(secondaryOf?.siblings ?? []);
        const parentNode = parentId ? byId.get(parentId) : null;
        const parentCost = parentNode ? costsOf(parentNode) : null;
        const parentCats = parentNode
          ? arr(parentNode?.categoryLinks?.categoryLink)
              .map((cl) => attr(cl, 'name') ?? categoryNames.get(attr(cl, 'targetId')))
              .filter(Boolean).map(clean)
          : [];
        const parentAbilities = parentNode
          ? arr(parentNode?.profiles?.profile)
              .filter((p) => attr(p, 'typeName') === 'Ability')
              .map((p) => {
                const a = {
                  id: attr(p, 'id'),
                  name: clean(attr(p, 'name')),
                  description: clean(charMap(p).Description),
                  ...(attr(p, 'hidden') === 'true' ? { hidden: true } : {}),
                };
                abilitiesSeen.set(a.id, a);
                return a;
              })
          : [];

        /*
          The parent's per-ability `hidden` modifiers, which have to travel with
          the abilities they are about.

          Copying the abilities alone put a rule on the Fly Thrall that the book
          prints "(Grail Thralls only)": `Undead Fortitude` sits on the parent
          entry with `set hidden=true` when the parent's selection is `Winged`,
          and a Winged Thrall IS that selection. The ability came across and the
          sentence that takes it away did not.

          Each condition naming one of these sub-entries is settled here rather
          than left for the runtime, because it cannot go either way: this
          profile IS its own sub-entry, so a leaf naming it is true and a leaf
          naming a sibling is false. `simplify` folds those in and reports a
          modifier that can never fire, which is then dropped.
        */
        const resolveAgainstSelf = (when, selfId) => {
          const simplify = (w) => {
            if (!w || typeof w !== 'object') return w;
            if (Array.isArray(w.all) || Array.isArray(w.any)) {
              const kind = Array.isArray(w.all) ? 'all' : 'any';
              const parts = [];
              for (const sub of w[kind]) {
                if (sub == null) continue;
                const r = simplify(sub);
                if (r === true) { if (kind === 'any') return true; continue; }
                if (r === false) { if (kind === 'all') return false; continue; }
                parts.push(r);
              }
              if (!parts.length) return kind === 'all';
              return parts.length === 1 ? parts[0] : { [kind]: parts };
            }
            const id = w.childId;
            if (!id || !siblingIds.has(id)) return w;
            /* `atLeast 1` of this selection: true for its own profile. A
               different sub-entry of the same parent is never also selected. */
            return id === selfId;
          };
          return simplify(when);
        };

        const parentAbilityModifiers = parentNode && parentId
          ? modifiersOf(parentNode, nameOf, fieldNameOf, isConstraint)
              /* Only the ones about an ability this profile has just been
                 given. A `hidden` modifier on the parent's Pummel WEAPON
                 profile is about that weapon, and carrying it here would move
                 a rule onto a unit it is not about. */
              .filter((m) => {
                const named = /^profile:(.*)$/.exec(String(m.origin ?? ''));
                if (!named) return false;
                const want = clean(named[1]).toLowerCase();
                return parentAbilities.some((a) => a.name.toLowerCase() === want);
              })
              .map((m) => {
                const when = m.when === undefined
                  ? undefined
                  : resolveAgainstSelf(m.when, attr(node, 'id'));
                if (when === false) return null;       // can never fire here
                const { when: _dropped, ...rest } = m;
                return when === true || when === undefined ? rest : { ...rest, when };
              })
              .filter(Boolean)
          : [];

        const ownRoles = cats.filter((x) => ROLE_NAMES.has(x));
        const ownKeywords = cats.filter((x) => !ROLE_NAMES.has(x)).map((k) => k.toUpperCase());
        const statedCost = cost.ducats || cost.glory;

        units.push({
          id: attr(unitProfile, 'id'),
          // The id of the selectionEntry that contains this profile. Roster
          // exports and modifier conditions both address entries, not
          // profiles, so evaluation needs it.
          entryId: attr(node, 'id'),
          /*
            The entry's own `hidden` attribute — whether it is off the list
            until something reveals it.

            Load-bearing, and not recoverable from the modifiers. A
            `set hidden false` conditioned on a Warband Variant means two
            different things depending on this flag: on a hidden entry it is
            the gate that makes the model available at all (the Technomancer
            exists only inside the Cadaver Corps), and on a visible one it is
            a re-reveal undoing some other variant's `set hidden true` (the
            Janissary is a core Sultanate troop that two variants forbid).
            Reading the reveal without this cannot tell them apart.
          */
          hiddenByDefault: hiddenByDefaultOf(node) || undefined,
          /*
            Not a recruit: a second statline under one entry. `recruitable()`
            filters these out and the Codex keeps them, which is the treatment
            `carcass-front-layer.mjs` already gives the Martyr Penitent.
          */
          ...(parentId ? { secondaryProfile: true, parentEntryId: parentId } : {}),
          name: clean(attr(unitProfile, 'name')),
          /*
            The entry's name, where it differs from the profile's.

            These are routinely different, and the books use the ENTRY name:
            `War Wolf Assault Beast` contains a profile called `War Wolf`,
            and `Anchorite Shrine` one called `Anchorite`. Taking only the
            profile name left the app unable to find, by the name printed in
            the rulebook, a model the rulebook was talking about — which is
            how the Promotions tables came to name four models the dataset
            appeared not to have (FD-06a).

            Absent when the two agree, which is the common case, so its
            presence means "the books may call this model something else".
          */
          entryName: (() => {
            const e = clean(attr(node, 'name'));
            return e && e !== clean(attr(unitProfile, 'name')) ? e : undefined;
          })(),
          factionId: faction,
          roles: parentId && !ownRoles.length
            ? parentCats.filter((x) => ROLE_NAMES.has(x))
            : ownRoles,
          keywords: parentId && !ownKeywords.length
            ? parentCats.filter((x) => !ROLE_NAMES.has(x)).map((k) => k.toUpperCase())
            : ownKeywords,
          stats: {
            movement: mv.movement,
            movementInches: mv.movementInches,
            movementType: mv.movementType,
            ranged: clean(c.Ranged) || '-',
            melee: clean(c.Melee) || '-',
            armour: clean(c.Armour) || '0',
            base: clean(c.Base) || '',
          },
          cost: parentId && !statedCost && parentCost ? parentCost : cost,
          min,
          max,
          abilities: parentId && !abilities.length ? parentAbilities : abilities,
          /*
            Plus the statline options a second Unit profile under this entry
            offers — `Winged`, `Guard Dog` — which `optionsOf` skips because
            they carry a Unit profile. See `profileOptionsByEntry`.
          */
          options: [
            ...optionsOf(node, nameOf, fieldNameOf, isConstraint, (id) => byId.get(id)),
            ...(profileOptionsByEntry.get(attr(node, 'id')) ?? []),
          ],
          /*
            Gear the model always has, which the app must neither omit nor sell
            it a second copy of. See forcedKitOf.
          */
          battlekit: forcedKitOf(node, (id) => byId.get(id)),
          constraints,
          /*
            Plus the parent's per-ability modifiers, where this is a second
            statline under one entry and the abilities came from the parent.
            The ability and the sentence that conditions it are one rule.
          */
          modifiers: parentId && !abilities.length
            ? [...unitModifiers, ...parentAbilityModifiers]
            : unitModifiers,
          sourceFile: file,
        });
        /*
          Falls through to the gear emit below rather than returning.

          A unit entry can carry Weapon profiles of its own — the Mamluk Faris
          defines the Alchemical Jezzail on itself rather than in an armoury —
          and returning here dropped every one of them. A roster holding such a
          weapon then matched nothing and was reported as "not in this
          ruleset", which excludes it from every legality check while telling
          the player their list is only provisional.
        */
      }

      const ownProfiles = arr(node?.profiles?.profile);
      const bundled = arr(node?.infoLinks?.infoLink)
        .filter((l) => attr(l, 'type') === 'profile')
        .map((l) => byId.get(attr(l, 'targetId')))
        .filter(Boolean)
        .filter((pr) => ['Weapon', 'Battlekit'].includes(attr(pr, 'typeName')));
      const bundledNames = [...new Set(bundled.map((pr) => clean(attr(pr, 'name'))))]
        .filter(Boolean);
      const bundleName = clean(attr(node, 'name'));
      if (bundleName && !ownProfiles.length && bundledNames.length >= 2
          && !bundledNames.includes(bundleName)) {
        /*
          The entry's own cost, not the sum of its parts'.

          A loadout is priced as one thing — both of these are free options in
          a Mercenary's `Loadout` group — and pricing the parts separately out
          of the Armoury Table charged a model 7 Ducats for a Polearm the
          catalogue hands it for nothing.
        */
        bundles.set(bundleName, { grants: bundledNames, cost: costsOf(node) });
        /*
          And the profiles themselves, so the chapter can say what they are.

          `Shield` is a generic Battlekit profile in the shared .gst that the
          Battlekit chapter does not name (it prints `Trench Shield`, a
          different entry that also exists) and that nothing emits as a weapon,
          because resolving Battlekit links into the weapon list turns a Black
          Grail Strain into equipment anyone can buy. Granted and then unknown,
          it counted against no limit: a model could carry two.
        */
        for (const pr of bundled) {
          const nm = clean(attr(pr, 'name'));
          if (nm && !bundleProfiles.has(nameKeyOf(nm))) {
            const c = charMap(pr);
            bundleProfiles.set(nameKeyOf(nm), {
              name: nm,
              type: clean(c.Type),
              range: clean(c.Range),
              keywords: clean(c.Keywords).split(',')
                .map((k) => clean(k)).filter((k) => k && k !== '-'),
              description: clean(c.Description || ''),
              rules: clean(c.Rules) && clean(c.Rules) !== '-' ? [clean(c.Rules)] : [],
            });
          }
        }
      }

      for (const g of gearProfiles) {
        const c = charMap(g);
        weapons.push({
          id: attr(g, 'id'),
          // As with units: the containing selectionEntry, which is what a
          // roster selects and what a model-scoped modifier is attached to.
          entryId: attr(node, 'id'),
          /*
            And as with units, whether the entry is off the list until
            something reveals it — see the note on the unit field.

            Read from the ENTRY here, deliberately, and not from the links that
            place it. A weapon is routinely placed by a hidden link revealed
            per-model ("only a model with X may take this"), so the rule that
            gates a unit would mark ordinary wargear gated: applied here it
            made the Automatic Pistol read as third-party and pulled it from
            every faction's armoury. Availability of gear is decided by the
            armoury tables and `unlockedBy` below, not by this flag.
          */
          hiddenByDefault: attr(node, 'hidden') === 'true' || undefined,
          /*
            What qualifies a model to take it, read off the entry's own reveal
            conditions.

            The Armoury Table states these as prose — "Brazen Bull only" — and
            the prose is a shorthand. The catalogue reveals the Titan Zulfiqar
            on a model that is a Brazen Bull **or** has the Gargantuan Size
            Alchemical Formula, and the rulebook agrees: "The Homunculus can use
            1 Weapon that can usually only be taken by a Brazen Bull." Matching
            the prose against the model's name alone rejects that Homunculus.
          */
          unlockedBy: revealNames(node, nameOf),
          name: clean(attr(g, 'name')),
          /*
            The containing entry's name, when it is not the profile's.

            Usually these agree. Where they do not it is often deliberate — a
            `Swiss Guard` entry carrying a `Papal Courage` ability profile — but
            sometimes one of them is a transcription slip in a community
            catalogue, and the profile is the one this ships: the app carried
            the rulebook's "Demonic Aura Grenade" as "Demonic Grenade", so the
            Dispatch's op adding FUMBLE to it found no target and the published
            keyword never reached the app.

            Recorded rather than resolved here, because the books are what
            settle it and this parser does not read them. `reconcileGearNames`
            in rules-build.mjs does.
          */
          entryName: clean(attr(node, 'name')) !== clean(attr(g, 'name'))
            ? clean(attr(node, 'name')) || undefined
            : undefined,
          type: clean(c.Type) || attr(g, 'typeName'),
          range: clean(c.Range) || '',
          keywords: clean(c.Keywords)
            .split(',')
            .map((k) => clean(k))
            .filter((k) => k && k !== '-'),
          rules: clean(c.Rules) || undefined,
          /*
            A gear profile on a MODEL is kit the model always has, and the
            model is priced to include it — so the weapon itself costs
            nothing. `cost` here is the node's, and on a model node that is
            the model's price: read unchanged it put the Gavel of Justice in
            the weapon list at the Witchburner's 6 Glory and the Vivisector at
            the Combat Biologist's 3. Nothing sells them today, but a weapon
            that says it costs what the model costs is wrong data waiting for
            a caller.

            On any other node — an ordinary armoury weapon's own entry — the
            node's cost IS the weapon's, and it is carried through unchanged.
          */
          cost: unitProfile ? { ducats: 0, glory: 0 } : cost,
          constraints,
          modifiers,
          restrictions: [],
          factionId: faction,
          sourceFile: file,
        });
      }
    });
  }

  // Entries are reachable both inline and through sharedSelectionEntries, so the
  // same profile can be visited twice. Keep the first, which carries the
  // constraints from its real container.
  const dedupe = (xs) => {
    const seen = new Map();
    for (const x of xs) if (!seen.has(x.id)) seen.set(x.id, x);
    return [...seen.values()];
  };

  // An upgrade reachable both as a unit option and as an armoury entry is one
  // thing, not two. Gear wins: it is already priced and restriction-checked in
  // `weapons`, and duplicating it would double-count the cost.
  const gearProfileIds = new Set(weapons.map((w) => w.id));
  // Match on name as well: the same piece of armour is declared per faction, so
  // a unit's option can point at a different profile id for the identical item.
  const gearNames = new Set(weapons.map((w) => w.name.toLowerCase()));
  for (const u of units) {
    u.options = u.options.filter((o) =>
      /*
        A statline option is exempt from all three tests. It carries no rules
        text because the rule it states is the statline itself — `Winged` says
        the model is a Fly Thrall — so the grouping-stub test would drop every
        one of them; and its name can collide with a weapon's without being
        that weapon. See `profileOptionsByEntry`.
      */
      o.unitProfileId
      || (!gearProfileIds.has(o.profileId)
        && !gearNames.has(o.name.toLowerCase())
        // An option with no rules text states no rule; it is a grouping stub.
        && o.description.length > 0));
  }

  /*
    Only a bundle whose name resolves to nothing else is worth keeping: if the
    catalogue already has an entry by that name, the roster will find it and
    an alias could only send it somewhere worse.
  */
  const emittedNames = new Set([
    ...weapons.map((w) => nameKeyOf(w.name)),
    ...units.map((u) => nameKeyOf(u.name)),
  ]);

  return {
    units: dedupe(units),
    weapons: dedupe(weapons),
    bundles: [...bundles]
      .filter(([name]) => !emittedNames.has(nameKeyOf(name)))
      .map(([name, b]) => ({ name, grants: b.grants, cost: b.cost })),
    /*
      Only the granted profiles nothing else in the dataset represents. Where
      the catalogue already emits one as a weapon, that record is richer and
      wins; this exists for the handful the weapon emit deliberately skips.
    */
    bundleProfiles: [...bundles]
      .filter(([name]) => !emittedNames.has(nameKeyOf(name)))
      .flatMap(([, b]) => b.grants)
      .map((n) => bundleProfiles.get(nameKeyOf(n)))
      .filter(Boolean)
      .filter((pr) => !emittedNames.has(nameKeyOf(pr.name))),
    /*
      Never a counter whose name is the name of the thing it counts.

      `Satchel Charge` has an entry of this shape counting `Satchel Charge`,
      and a Satchel Charge is a real piece of wargear a model buys and throws.
      Dropping the name would lose the item rather than the bookkeeping.
    */
    counters: [...counters.values()].filter(
      (c) => c.forName && nameKeyOf(c.name) !== nameKeyOf(c.forName)),
    abilities: [...abilitiesSeen.values()],
    variantEntries,
    links,
    files,
  };
}
