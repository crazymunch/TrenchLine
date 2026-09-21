/**
 * Write a warband as a BattleScribe / NewRecruit `.ros`.
 *
 * Behind the compatibility report `docs/EXPORT-CODEX-REVIEW.md` E4 asked for:
 * **fatal** on anything with no BattleScribe identity, **warning** on what a
 * roster records that this one deliberately leaves out, **informational** on
 * what was preserved and where it came from. A fatal finding means no file is
 * written at all — a roster missing a model or a weapon is not a roster of this
 * warband, and offering it as one is worse than offering nothing.
 *
 * Identity comes from `rosterPaths.ts`; see `docs/ROSTER-PATHS.md`. Everything
 * this module adds is structure, quantity and price.
 *
 * ## What it deliberately does not write
 *
 * A real NewRecruit export of a thirteen-model warband is 132 KB, and most of
 * that is `<profile>`, `<rule>` and `<category>` elements copied out of the
 * catalogues. Every one is derived: the importing app has the catalogues and
 * regenerates them from the entry each selection points at. Copying them in
 * would mean this module holding a second opinion about statlines, which is
 * exactly the failure `docs/AUDIT.md` records — 97% of the app's statlines
 * wrong because they were written twice.
 *
 * So the file carries identity, quantity and cost, and nothing it would be
 * guessing at. That is a real difference from what NewRecruit writes, it is
 * reported as a warning on every export, and it is **not** yet known to be
 * acceptable to NewRecruit: nobody has opened one of these files. Until
 * somebody does, this is a candidate format and the report says so.
 */
import {
  modelIdentity, resolveSelection,
  type ResolvedSelection, type RosterPathLayer, type Selection,
} from './rosterPaths';
import type { Warband, ActiveUnit } from '../types/warband';
import { takesTheField } from '../rules/recreation';

export type IssueLevel = 'fatal' | 'warning' | 'informational';

export interface RosIssue {
  level: IssueLevel;
  /** The model it concerns, by the name the player gave it. */
  model?: string;
  /** The thing it concerns — a weapon, an upgrade, a piece of metadata. */
  subject?: string;
  why: string;
}

export interface RosReport {
  fatal: RosIssue[];
  warnings: RosIssue[];
  informational: RosIssue[];
  /** True when a file can be written at all. */
  exportable: boolean;
}

export interface RosOptions {
  /** Overrides the catalogue the force declares. Normally derived. */
  catalogueId?: string;
  /** Stamped into `generatedBy`. */
  generatedBy?: string;
}

/**
 * The dataset rows a warband's models can be resolved against — `id`, `name`
 * and the `entryId` that joins to the roster-path layer.
 */
export interface CatalogueUnit {
  id: string;
  name: string;
  entryId?: string;
}

/* ------------------------------------------------------------------ XML --- */

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
};

/**
 * Escape a value for an XML attribute.
 *
 * All five, including `>` and `'` which are legal raw in an attribute. A
 * warband name is user text and goes straight into `customName`; over-escaping
 * is always read back correctly, under-escaping produces a file that will not
 * parse, and the two are not equally bad.
 */
export function xmlAttr(value: string): string {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const attrs = (pairs: Record<string, string | number | undefined>) =>
  Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => ` ${k}="${xmlAttr(String(v))}"`)
    .join('');

/**
 * A roster-instance id, derived rather than random.
 *
 * NewRecruit writes short random strings. Deriving them from the warband
 * instead means exporting the same warband twice produces the same bytes,
 * which is what makes this testable and what stops a re-export looking like a
 * different roster. Distinct from catalogue ids by construction: those are
 * four hyphenated hex quads, and these begin `tl` and carry no hyphen.
 */
export function instanceId(...parts: (string | number)[]): string {
  const seed = parts.join(' ');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i += 1) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + seed.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return `tl${h1.toString(36)}${h2.toString(36)}`;
}

/* --------------------------------------------------------------- report --- */

/** Everything the player chose for one model, by the name a roster records. */
export function chosenNames(unit: ActiveUnit): string[] {
  return [
    ...(unit.equippedWeapons ?? []).map((w) => w.name),
    ...(unit.equippedArmour ?? []).map((a) => a.name),
    ...(unit.equippedEquipment ?? []).map((e) => e.name),
    ...(unit.specialUpgrades ?? []).map((u) => u.name),
  ].filter(Boolean);
}

type Priced = { name: string; cost?: number; gloryCost?: number };

/**
 * Its price, by the same name, for the `<cost>` a roster writes per selection.
 *
 * Both currencies. Trench Crusade prices in Ducats and Glory, and `cost`
 * carries only the first — a Sniper Scope is 2 Glory and 0 Ducats, and reading
 * `cost` alone would write it into the roster as free.
 */
/**
 * The Variant rule that put this item within a Warband's reach, if any.
 *
 * Only the three equipped lists, not `specialUpgrades`: `grantedBy` names an
 * ARMOURY grant — the House of Wisdom's *Weapon Collections*, the Knights of
 * Avarice's *Corrupt Merchants* — and a unit option is not one. Absent means
 * the item is this faction's own, which is the ordinary case.
 */
function grantOf(unit: ActiveUnit, name: string): string | undefined {
  const all = [
    ...(unit.equippedWeapons ?? []), ...(unit.equippedArmour ?? []),
    ...(unit.equippedEquipment ?? []),
  ];
  return all.find((x) => x.name === name)?.grantedBy;
}

/** `50 Ducats`, `2 Glory`, `15 Ducats + 2 Glory` — for a warning that owes a number. */
function shortPrice(price: { ducats: number; glory: number }): string {
  const parts = [
    ...(price.ducats ? [`${price.ducats} Ducats`] : []),
    ...(price.glory ? [`${price.glory} Glory`] : []),
  ];
  return parts.join(' + ') || 'nothing';
}

function priceOf(unit: ActiveUnit, name: string): { ducats: number; glory: number } {
  const all: Priced[] = [
    ...(unit.equippedWeapons ?? []), ...(unit.equippedArmour ?? []),
    ...(unit.equippedEquipment ?? []), ...(unit.specialUpgrades ?? []),
  ] as unknown as Priced[];
  const found = all.find((x) => x.name === name);
  return { ducats: Number(found?.cost ?? 0), glory: Number(found?.gloryCost ?? 0) };
}

/**
 * Which catalogue the force declares, derived from the models rather than from
 * the faction's name.
 *
 * Name matching would have been a guess: four of the dataset's eight factions
 * are spelled exactly as a catalogue is (`Iron Sultanate`), and four are not
 * (`Heretic Legions` against `Heretic Legion`, `Cult of the Black Grail`
 * against `Black Grail`). The models themselves carry the answer.
 */
export function forceCatalogue(
  layer: RosterPathLayer, models: ActiveUnit[], units: CatalogueUnit[]
): { catalogueId?: string; spans: string[] } {
  const counts = new Map<string, number>();
  for (const u of models) {
    const id = pathsFor(layer, u, units)?.placements[0]?.catalogueId;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { catalogueId: ranked[0]?.[0], spans: ranked.map(([id]) => id) };
}

/**
 * The models a `.ros` file is written from.
 *
 * `takesTheField` rather than `!u.isDead`, because a model held on the roster
 * awaiting Re-creation is stored with `isDead` false and is dead all the same
 * — the flag is false only so the roster keeps the entry the payment is made
 * against. A `.ros` is a muster for a game, so it is left out, and counted in
 * the same informational note a dead model gets.
 */
const livingUnits = (warband: Warband) => (warband.units ?? []).filter(takesTheField);

/**
 * The catalogue entry a model is an instance of.
 *
 * By id first and by name second, and both are needed because each covers the
 * other's blind spot.
 *
 * *Id*: a saved warband's `baseProfileId` is the id of the profile it was
 * recruited from. In the running app, hydration re-keys the catalogue — the
 * Amalgam is `e5d5-c4bb-4b99-020d` in the dataset and `036b-eb9f-9b58-fa7e` in
 * a hydrated store — so this misses there and the name carries it.
 *
 * *Name*: a model imported from somebody else's roster carries the name that
 * roster RENDERED, not the catalogue's. Modifiers rename entries: the Iron
 * Sultanate's `Azeb` is written into a NewRecruit file as `Kavass`, and a
 * promoted one as `Favoured Kavass`, all three being entry
 * `0e7e-9167-f044-9493`. So this misses there and the id carries it.
 */
export function catalogueEntryFor(
  unit: ActiveUnit, units: CatalogueUnit[]
): CatalogueUnit | undefined {
  const byId = units.find((u) => u.id === unit.baseProfileId);
  if (byId?.entryId) return byId;
  const name = unit.profileSnapshot?.name;
  return units.find((u) => u.name === name && u.entryId) ?? byId;
}

const pathsFor = (
  layer: RosterPathLayer, unit: ActiveUnit, units: CatalogueUnit[]
) => {
  const entry = catalogueEntryFor(unit, units);
  return entry?.entryId
    ? layer.units.find((x) => x.entryId === entry.entryId)
    : undefined;
};

/**
 * What would stop this warband being written, before anything is written.
 *
 * Matching is by profile NAME, not by `baseProfileId`: hydration re-keys the
 * catalogue, so a saved model's `baseProfileId` is the store's id and not the
 * dataset's. The Amalgam is `e5d5-c4bb-4b99-020d` in the dataset and
 * `036b-eb9f-9b58-fa7e` in a hydrated store, and matching on it silently
 * matched nothing.
 */
export function rosReport(
  layer: RosterPathLayer, warband: Warband, units: CatalogueUnit[], options: RosOptions = {}
): RosReport {
  const fatal: RosIssue[] = [];
  const warnings: RosIssue[] = [];
  const informational: RosIssue[] = [];

  const models = livingUnits(warband);
  const dead = (warband.units ?? []).length - models.length;

  if (!models.length) {
    fatal.push({ level: 'fatal', why: 'the warband has no living models to export' });
  }

  for (const u of models) {
    const profileName = u.profileSnapshot?.name ?? '';
    const named = u.customName || profileName;
    const paths = pathsFor(layer, u, units);
    if (!paths) {
      const entry = catalogueEntryFor(u, units);
      const unmapped = layer.unmapped.find(
        (x) => x.entryId === entry?.entryId || x.name === profileName);
      fatal.push({
        level: 'fatal',
        model: named,
        subject: profileName,
        why: unmapped?.why
          ?? (entry
            ? 'the dataset knows this model but no catalogue root can reach its entry'
            : 'no catalogue entry could be resolved for this model'),
      });
      continue;
    }
    const chosen = chosenNames(u);
    const id = modelIdentity(layer, paths.entryId, chosen);
    for (const name of id?.missing ?? chosen) {
      /*
        WC-1. A Variant grant reaches across the book in a way the catalogues
        do not reach across themselves.

        The House of Wisdom's *Weapon Collections* lets a Warband buy one
        piece of Battlekit from the New Antioch Armoury and one from the
        Trench Pilgrims Armoury, and the book's New Antioch Armoury Table
        stocks Machine Armour at 50 Ducats. The Iron Sultanate catalogue has
        no such selection under any Sultanate model — it has no reason to,
        because the permission is a Variant rule in the Warbands book and not
        a link in that catalogue. So the name resolves to nothing, and the
        owner's roster stopped exporting at all the moment they equipped it.

        Refusing the whole file over one legal item is the wrong trade: the
        other twelve models are exactly what the catalogues can name. It is
        written without the item, and the warning says which item, which rule
        allows it, and what the file is therefore short by — a player handing
        this to an opponent needs to be able to say "and 50 Ducats of Machine
        Armour that NewRecruit has no box for".

        An item with NO grant behind it stays fatal. There the app is naming
        gear the catalogues do not offer that model and no rule says it may,
        which is a roster that is not this warband.
      */
      const grant = grantOf(u, name);
      if (grant) {
        warnings.push({
          level: 'warning',
          model: named,
          subject: name,
          why: `${grant} allows this, and no catalogue selection under this model can `
            + `name it; written without it, so this model costs `
            + `${shortPrice(priceOf(u, name))} less in the file than in TrenchLine`,
        });
        continue;
      }
      fatal.push({
        level: 'fatal',
        model: named,
        subject: name,
        why: 'the catalogues do not offer this to this model, so a roster cannot name it',
      });
    }
    for (const item of id?.items ?? []) {
      if (item.selections.length > 1) {
        warnings.push({
          level: 'warning',
          model: named,
          subject: item.name,
          why: `reachable ${item.selections.length} ways under this model; written as `
            + `the first — ${item.selections[0].group ?? 'taken from the entry'}`,
        });
      }
    }
  }

  const { catalogueId, spans } = forceCatalogue(layer, models, units);
  if (!catalogueId && models.length) {
    fatal.push({ level: 'fatal', why: 'no catalogue could be derived from these models' });
  }
  if (spans.length > 1) {
    const names = spans.map((id) => layer.catalogues.find((c) => c.id === id)?.name ?? id);
    warnings.push({
      level: 'warning',
      why: `models come from ${spans.length} catalogues (${names.join(', ')}); the force `
        + `declares ${names[0]}, where most of them live`,
    });
  }

  /*
    The standing differences from what NewRecruit writes. Reported every time
    rather than documented once: a player about to hand this file to somebody
    else should see them at the moment they export.
  */
  warnings.push({
    level: 'warning',
    why: 'profiles, rules and categories are not written — an importer regenerates them '
      + 'from the catalogues, and copying them here would mean holding a second opinion '
      + 'about statlines',
  });
  warnings.push({
    level: 'warning',
    why: 'no file written by this exporter has yet been opened in NewRecruit; treat it as '
      + 'a candidate format and keep the TrenchLine file as the record',
  });

  if (dead) {
    informational.push({
      level: 'informational',
      why: `${dead} dead model(s) left out — a roster is what takes the field`,
    });
  }
  informational.push({
    level: 'informational',
    why: `gameSystemRevision written as ${layer.system.revision}, the system's own — every `
      + 'catalogue declares a stale one, so none of theirs can be quoted',
  });
  informational.push({
    level: 'informational',
    why: 'no costLimits written: the Threshold is a campaign measure, not a muster '
      + 'budget, and writing it as one would be a claim nobody made',
  });
  informational.push({ level: 'informational', why: `identity from ${layer.base}` });
  if (options.catalogueId && options.catalogueId !== catalogueId) {
    informational.push({
      level: 'informational',
      why: `force catalogue overridden to ${options.catalogueId}`,
    });
  }

  return { fatal, warnings, informational, exportable: fatal.length === 0 };
}

/* ------------------------------------------------------------ generator --- */

const selectionAttrs = (
  id: string, name: string, sel: ResolvedSelection, count: number, customName?: string
) => attrs({
  id,
  name,
  entryId: sel.entryId,
  entryGroupId: sel.entryGroupId,
  number: count,
  type: sel.type,
  from: sel.from,
  group: sel.group,
  customName,
});

const costsBlock = (layer: RosterPathLayer, ducats: number, glory: number, indent: string) => {
  const types = new Map(layer.system.costTypes?.map((c) => [c.name, c.id]) ?? []);
  const rows: string[] = [];
  /* Only non-zero, as a real export does: 61 of the fixture's 95 selections
     carry a costs block at all, and none of them carries a zero. */
  if (ducats) {
    rows.push(`<cost${attrs({ name: 'Ducats', typeId: types.get('Ducats'), value: ducats })}/>`);
  }
  if (glory) {
    rows.push(`<cost${attrs({ name: 'Glory Points', typeId: types.get('Glory Points'), value: glory })}/>`);
  }
  if (!rows.length) return '';
  return `\n${indent}<costs>${rows.map((r) => `\n${indent}  ${r}`).join('')}\n${indent}</costs>`;
};

/**
 * Write the file.
 *
 * Throws on a fatal finding rather than writing a partial roster. A caller
 * should run `rosReport` first and show it; this refuses as a backstop, so
 * there is no path from a fatal finding to a downloaded file.
 */
export function toRos(
  layer: RosterPathLayer, warband: Warband, units: CatalogueUnit[], options: RosOptions = {}
): { xml: string; report: RosReport } {
  const report = rosReport(layer, warband, units, options);
  if (!report.exportable) {
    throw new Error(
      `rosterRos: ${report.fatal.length} fatal finding(s); no .ros written. `
      + report.fatal
        .map((f) => `${f.model ? `${f.model}: ` : ''}${f.subject ?? ''} — ${f.why}`)
        .join('; '));
  }

  const models = livingUnits(warband);
  const catalogueId = options.catalogueId ?? forceCatalogue(layer, models, units).catalogueId!;
  const catalogue = layer.catalogues.find((c) => c.id === catalogueId)!;
  const force = layer.system.forces?.[0];
  const types = new Map(layer.system.costTypes?.map((c) => [c.name, c.id]) ?? []);

  let ducatsTotal = 0;
  let gloryTotal = 0;
  const body: string[] = [];

  for (const u of models) {
    const paths = pathsFor(layer, u, units)!;
    /*
      The catalogue's name for the entry, not the one the model is carrying.

      A model imported from somebody else's roster carries the name that roster
      rendered after modifiers — `Kavass` for `Azeb`. Writing that back would
      put a name in the file that no catalogue entry has, and the player's own
      name for the model is already going into `customName` where it belongs.
    */
    const profileName = paths.name;
    const id = modelIdentity(layer, paths.entryId, chosenNames(u))!;

    const modelDucats = Number(u.profileSnapshot?.baseCost ?? 0);
    const modelGlory = Number(u.profileSnapshot?.gloryCost ?? 0);
    ducatsTotal += modelDucats;
    gloryTotal += modelGlory;

    const kids: string[] = [];
    for (const item of id.items) {
      const price = priceOf(u, item.name);
      ducatsTotal += price.ducats;
      gloryTotal += price.glory;
      /* The FIRST of several routes, and the report says so wherever there is
         more than one. Choosing silently is how an export becomes subtly not
         the warband. */
      const sel = item.selections[0];
      kids.push(
        `        <selection${selectionAttrs(instanceId(u.id, item.name), item.name, sel, 1)}>`
        + `${costsBlock(layer, price.ducats, price.glory, '          ')}\n`
        + '        </selection>');
    }

    const modelXml =
      `      <selection${selectionAttrs(instanceId(u.id), profileName, id.self, 1,
        u.customName && u.customName !== profileName ? u.customName : undefined)}>`
      + (kids.length ? `\n        <selections>\n${kids.join('\n')}\n        </selections>` : '')
      + costsBlock(layer, modelDucats, modelGlory, '        ')
      + '\n      </selection>';

    /*
      A model reached through a wrapper is written inside it, because that is
      what a roster records: `Mamluk Faris` is a `unit` entry whose only child
      is the `model` carrying the profile, and a file with only the inner one
      is not read back the same way.
    */
    body.push(id.parents.reduceRight((inner, parent) =>
      `      <selection${selectionAttrs(
        instanceId(u.id, parent.entryId), parent.name, parent, 1)}>\n`
      + `        <selections>\n${inner.replace(/^/gm, '  ')}\n        </selections>\n`
      + '      </selection>', modelXml));
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + `<roster${attrs({
      id: instanceId(warband.id ?? warband.name ?? 'warband'),
      name: warband.name,
      battleScribeVersion: layer.system.battleScribeVersion,
      generatedBy: options.generatedBy ?? 'TrenchLine',
      gameSystemId: layer.system.id,
      gameSystemName: layer.system.name,
      /* The SYSTEM's revision, not a catalogue's: all eleven declare a stale
         one, so quoting a catalogue would name a revision current for nobody. */
      gameSystemRevision: layer.system.revision,
    })} xmlns="http://www.battlescribe.net/schema/rosterSchema">\n`
    + '  <costs>\n'
    + `    <cost${attrs({ name: 'Ducats', typeId: types.get('Ducats'), value: ducatsTotal })}/>\n`
    + `    <cost${attrs({ name: 'Glory Points', typeId: types.get('Glory Points'), value: gloryTotal })}/>\n`
    + '  </costs>\n'
    + '  <forces>\n'
    + `    <force${attrs({
      id: instanceId(warband.id ?? warband.name ?? 'warband', 'force'),
      name: force?.name ?? 'Warband',
      entryId: force?.id,
      catalogueId: catalogue.id,
      catalogueRevision: catalogue.revision,
      catalogueName: catalogue.name,
      customName: warband.name,
    })}>\n`
    + `      <selections>\n${body.map((b) => b.replace(/^/gm, '  ')).join('\n')}\n      </selections>\n`
    + '    </force>\n'
    + '  </forces>\n'
    + '</roster>\n';

  return { xml, report };
}

/** Decoded identity for one selection, for callers that want to show it. */
export function describeSelection(layer: RosterPathLayer, sel: Selection): ResolvedSelection {
  return resolveSelection(layer, sel);
}
