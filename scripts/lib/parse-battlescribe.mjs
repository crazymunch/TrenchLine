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

  const fromGroup = (g, groupName) => {
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
        cost: costsOf(e),
        // The id of the profile carrying the rules, so the gear post-pass can
        // recognise an option that is really an armoury entry.
        profileId: attr(rules, 'id'),
        description: clean(charMap(rules).Description || charMap(rules).Rules),
        constraints: constraintsOf(e),
        modifiers: modifiersOf(e, nameOf, fieldNameOf, isConstraint),
      });
    }
    // Groups nest: "Vile Corpus" sits inside a wrapper group.
    for (const inner of arr(g?.selectionEntryGroups?.selectionEntryGroup)) {
      fromGroup(inner, clean(attr(inner, 'name')) || groupName);
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

  const fromNode = (n, origin, comment) => {
    for (const m of arr(n?.modifiers?.modifier)) {
      out.push(modifierOf(m, nameOf, fieldNameOf, origin, comment, isConstraint));
    }
    for (const g of arr(n?.modifierGroups?.modifierGroup)) {
      // A group carries its own conditions that gate every modifier inside it,
      // and usually a <comment> naming the rule ("armour adjustments").
      const gate = conditionTreeOf(g, nameOf, attr(g, 'type') ?? 'and');
      const label = clean(g.comment) || comment;
      for (const m of arr(g?.modifiers?.modifier)) {
        const mod = modifierOf(m, nameOf, fieldNameOf, origin, label, isConstraint);
        if (gate) mod.when = mod.when ? { all: [gate, mod.when] } : gate;
        out.push(mod);
      }
      for (const inner of arr(g?.modifierGroups?.modifierGroup)) fromNode(inner, origin, label);
    }
  };

  fromNode(node, 'entry');
  for (const p of arr(node?.profiles?.profile)) {
    fromNode(p, `profile:${clean(attr(p, 'name'))}`);
  }

  // The catalogues routinely state the same rule twice — once on the entry and
  // again on the profile inside it — because BattleScribe needs both to update
  // its own two views. It is one rule, so keep one copy: the entry-level
  // statement, which is the one that survives if the profile is restructured.
  const seen = new Set();
  return out.filter((m) => {
    const { origin, ...rule } = m;
    const k = JSON.stringify(rule);
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

  const fieldNameOf = (id) => fieldNames.get(id) ?? null;
  const nameOf = (id) => {
    const n = byId.get(id);
    return n ? clean(attr(n, 'name')) || null : null;
  };

  const ROLE_NAMES = new Set(['Elite', 'Troop', 'Mercenary', 'Leader', 'Configuration']);

  const factionOf = (file) => path.basename(file, path.extname(file));

  const units = [];
  const weapons = [];
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
          const rules = arr(e?.profiles?.profile)
            .filter((pr) => attr(pr, 'typeName') === 'Ability');
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
            specialRules: arr(e?.profiles?.profile)
              .filter((pr) => attr(pr, 'typeName') === 'Ability')
              .map((pr) => ({
                name: clean(attr(pr, 'name')),
                description: clean(charMap(pr).Description),
              })),
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
    const rules = arr(e?.profiles?.profile)
      .filter((pr) => attr(pr, 'typeName') === 'Ability');
    if (!rules.length) continue;
    variantEntries.push({
      id: attr(e, 'id'),
      name: clean(attr(e, 'name')),
      factionId: path.basename(file, path.extname(file)),
      thirdParty: true,
      specialRules: rules.map((pr) => ({
        name: clean(attr(pr, 'name')),
        description: clean(charMap(pr).Description),
      })),
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
          };
          abilitiesSeen.set(a.id, a);
          return a;
        });

      const constraints = constraintsOf(node);
      const cost = costsOf(node);
      const modifiers = modifiersOf(node, nameOf, fieldNameOf, isConstraint);

      if (unitProfile) {
        const c = charMap(unitProfile);
        const mv = splitMovement(c.Movement);
        const { min, max } = recruitLimits(constraints);
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
          hiddenByDefault: attr(node, 'hidden') === 'true' || undefined,
          name: clean(attr(unitProfile, 'name')),
          factionId: faction,
          roles: cats.filter((x) => ROLE_NAMES.has(x)),
          keywords: cats.filter((x) => !ROLE_NAMES.has(x)).map((k) => k.toUpperCase()),
          stats: {
            movement: mv.movement,
            movementInches: mv.movementInches,
            movementType: mv.movementType,
            ranged: clean(c.Ranged) || '-',
            melee: clean(c.Melee) || '-',
            armour: clean(c.Armour) || '0',
            base: clean(c.Base) || '',
          },
          cost,
          min,
          max,
          abilities,
          options: optionsOf(node, nameOf, fieldNameOf, isConstraint, (id) => byId.get(id)),
          constraints,
          modifiers,
          sourceFile: file,
        });
        return;
      }

      for (const g of gearProfiles) {
        const c = charMap(g);
        weapons.push({
          id: attr(g, 'id'),
          // As with units: the containing selectionEntry, which is what a
          // roster selects and what a model-scoped modifier is attached to.
          entryId: attr(node, 'id'),
          // And as with units, whether the entry is off the list until
          // something reveals it — see the note on the unit field.
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
          type: clean(c.Type) || attr(g, 'typeName'),
          range: clean(c.Range) || '',
          keywords: clean(c.Keywords)
            .split(',')
            .map((k) => clean(k))
            .filter((k) => k && k !== '-'),
          rules: clean(c.Rules) || undefined,
          cost,
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
      !gearProfileIds.has(o.profileId) &&
      !gearNames.has(o.name.toLowerCase()) &&
      // An option with no rules text states no rule; it is a grouping stub.
      o.description.length > 0);
  }

  return {
    units: dedupe(units),
    weapons: dedupe(weapons),
    abilities: [...abilitiesSeen.values()],
    variantEntries,
    links,
    files,
  };
}
