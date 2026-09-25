/**
 * The `.ros` generator, checked against the `.ros` NewRecruit wrote.
 *
 * `data-sources/fixtures/newrecruit/` holds the same thirteen-model Iron
 * Sultanate campaign warband twice — as JSON and as `.ros`. So: rebuild that
 * warband as TrenchLine would hold it, write it back out with this generator,
 * and hold the two files against each other. Every selection this exporter
 * emits has a counterpart in NewRecruit's file, and every attribute that
 * decides identity has to match it.
 *
 * That is a stronger test than validating against a schema. A schema says the
 * file is well-formed; this says it names the same warband.
 *
 * ## Why the warband is rebuilt here rather than imported
 *
 * The obvious route is `importNewRecruitRoster`, and it does not work, for
 * reasons that are the importer's rather than this module's. It matches models
 * by NAME, and a roster's `name` is not the catalogue's name — modifiers rename
 * entries, so the Sultanate's `Azeb` (`0e7e-9167-f044-9493`) is written as
 * `Kavass`, and its substring fallback binds `Favoured Homunculus` to whichever
 * faction's `Homunculus` comes first in the list. Three of eleven models come
 * back unresolvable and `unmatched` is nevertheless empty.
 *
 * Running this exporter over that import is what found it. Rebuilding from the
 * file's own `entryId`s — which are unambiguous — tests the exporter against
 * the warband rather than against the importer's reading of it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { DATASET } from '@/data/generated/trenchline.generated';
import LAYER from '@/data/generated/trenchline.rosterpaths.json';
import {
  toRos, rosReport, instanceId, xmlAttr, forceCatalogue, catalogueEntryFor,
  type CatalogueUnit,
} from '../rosterRos';
import { decodePath, type RosterPathLayer } from '../rosterPaths';
import type { Warband, ActiveUnit } from '@/types/warband';

const layer = LAYER as unknown as RosterPathLayer;
/** The dataset rows a model resolves against — id, name and entry id. */
const UNITS: CatalogueUnit[] = DATASET.units.map(
  (u) => ({ id: u.id, name: u.name, entryId: u.entryId }));
const ROS_FIXTURE = 'data-sources/fixtures/newrecruit/al-qarn-rihla-august.ros';

/* ------------------------------------------------- reading the fixture --- */

interface RosSelection {
  id: string;
  name: string;
  type: string;
  from: string;
  entryId: string;
  entryGroupId?: string;
  group?: string;
  ducats: number;
  glory: number;
  customName?: string;
  children: RosSelection[];
}

/**
 * The fixture's selection tree.
 *
 * Hand-rolled rather than run through `fast-xml-parser` so the test depends on
 * the bytes in the file and not on a parser's opinion of them.
 */
function readRos(path: string): RosSelection[] {
  const xml = fs.readFileSync(path, 'utf8');
  const roots: RosSelection[] = [];
  const stack: RosSelection[] = [];
  const token = /<(\/?)(selection|selections|cost)\b([^>]*?)(\/?)>/g;
  for (const m of xml.matchAll(token)) {
    const [, closing, tag, body, selfClosing] = m;
    const at = (k: string) => {
      const raw = body.match(new RegExp(`(?:^|\\s)${k}="([^"]*)"`))?.[1];
      /* Unescape, because the file is escaped. Reading `Skill &amp; Expertise`
         as a literal is how a comparison against a name silently never matches. */
      return raw?.replace(/&(amp|lt|gt|quot|apos);/g,
        (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[e]);
    };
    if (tag === 'cost') {
      const holder = stack[stack.length - 1];
      if (!holder) continue;
      const value = Number(at('value') ?? 0);
      if (at('name') === 'Ducats') holder.ducats += value;
      if (at('name') === 'Glory Points') holder.glory += value;
      continue;
    }
    if (tag === 'selections') continue;
    if (closing) { stack.pop(); continue; }
    const sel: RosSelection = {
      id: at('id') ?? '',
      name: at('name') ?? '',
      type: at('type') ?? '',
      from: at('from') ?? '',
      entryId: at('entryId') ?? '',
      entryGroupId: at('entryGroupId'),
      group: at('group'),
      ducats: 0,
      glory: 0,
      customName: at('customName'),
      children: [],
    };
    (stack[stack.length - 1]?.children ?? roots).push(sel);
    if (!selfClosing) stack.push(sel);
  }
  return roots;
}

const flatten = (xs: RosSelection[]): RosSelection[] =>
  xs.flatMap((s) => [s, ...flatten(s.children)]);

/**
 * Rebuild the warband as TrenchLine would hold it, resolving each model by the
 * entry id the file carries.
 *
 * `carries` decides what counts as gear — anything the roster-path layer can
 * name under that model. What it cannot name is exactly the interesting part,
 * and it is checked separately rather than quietly dropped here.
 */
function warbandFromRos(): { warband: Warband; unnameable: string[] } {
  const tree = readRos(ROS_FIXTURE);
  const unnameable: string[] = [];
  const units: ActiveUnit[] = [];

  const modelsOf = (xs: RosSelection[]): RosSelection[] =>
    xs.flatMap((s) => (s.type === 'model' ? [s] : modelsOf(s.children)));

  for (const sel of modelsOf(tree)) {
    const entryId = sel.entryId.split('::').pop()!;
    const row = UNITS.find((u) => u.entryId === entryId);
    const paths = layer.units.find((u) => u.entryId === entryId);
    if (!row || !paths) continue;

    const named = new Set(Object.keys(paths.placements.flatMap(
      (p) => Object.entries(p.carries)).reduce<Record<string, unknown>>(
      (acc, [k, v]) => ({ ...acc, [k]: v }), {})));

    const gear: { name: string; cost: number; gloryCost: number }[] = [];
    for (const child of flatten(sel.children)) {
      if (child.type === 'model' || child.type === 'unit') continue;
      if (!named.has(child.name)) { unnameable.push(`${sel.name} / ${child.name}`); continue; }
      gear.push({ name: child.name, cost: child.ducats, gloryCost: child.glory });
    }

    const profile = DATASET.units.find((u) => u.entryId === entryId)!;
    units.push({
      id: sel.id,
      customName: sel.customName ?? sel.name,
      baseProfileId: row.id,
      /*
        The snapshot carries the name the ROSTER rendered, not the catalogue's,
        because that is what a model imported from somebody else's file holds —
        `Kavass` for `Azeb`. Keeping it here is what makes the exporter's
        override of it observable rather than a no-op.
      */
      profileSnapshot: { ...profile, name: sel.name } as never,
      equippedWeapons: gear as never,
      equippedArmour: [],
      equippedEquipment: [],
      specialUpgrades: [],
      xp: 0,
      advancements: [],
      injuries: [],
      isDead: false,
      totalCost: sel.ducats,
    } as unknown as ActiveUnit);
  }

  return {
    warband: { id: 'al-qarn-rihla', name: 'Al-Qarn Rihla', units } as unknown as Warband,
    unnameable,
  };
}

/** Every `<selection>` in an XML string, as its attributes. */
const selectionsOf = (xml: string) => {
  const out: Record<string, string>[] = [];
  for (const m of xml.matchAll(/<selection\s([^>]*?)\/?>/g)) {
    const at: Record<string, string> = {};
    for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) at[a[1]] = a[2];
    if (at.entryId) out.push(at);
  }
  return out;
};

/* ------------------------------------------------------------- the file --- */

describe('the fixture this is checked against', () => {
  it('is a real warband with models, gear and both currencies', () => {
    const tree = readRos(ROS_FIXTURE);
    const all = flatten(tree);
    expect(all.length).toBe(95);
    expect(all.filter((s) => s.type === 'model').length).toBeGreaterThanOrEqual(12);
    expect(all.filter((s) => s.glory > 0).length).toBeGreaterThan(0);
  });

  it('rebuilds into a warband whose models the layer can name', () => {
    const { warband } = warbandFromRos();
    expect(warband.units.length).toBeGreaterThanOrEqual(10);
  });
});

describe('writing the file', () => {
  const { warband } = warbandFromRos();
  const { xml, report } = toRos(layer, warband, UNITS);

  it('produces a well-formed document with the header a roster needs', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.battlescribe.net/schema/rosterSchema"');
    expect(xml).toContain('gameSystemId="sys-4f3d-c5c9-7df1-ad01"');
    expect(xml).toContain('battleScribeVersion="2.03"');
    expect(xml.trimEnd().endsWith('</roster>')).toBe(true);
    // Every tag opened is closed: a count mismatch is a file nothing parses.
    expect((xml.match(/<selection\s/g) ?? []).length)
      .toBe((xml.match(/<\/selection>/g) ?? []).length);
  });

  it('writes the system’s revision, not a catalogue’s stale one', () => {
    /*
      All eleven catalogues declare a `gameSystemRevision` that is not the
      system's — they claim 1, 4, 6, 8, 10, 11, 13 and 16 against a system on
      17. NewRecruit writes 17, and so does this.
    */
    const mine = xml.match(/gameSystemRevision="(\d+)"/)![1];
    expect(mine).toBe(String(layer.system.revision));
    expect(fs.readFileSync(ROS_FIXTURE, 'utf8')).toContain(`gameSystemRevision="${mine}"`);
    expect(layer.catalogues.every((c) => c.gameSystemRevision !== layer.system.revision)).toBe(true);
  });

  it('declares the force and catalogue NewRecruit declared', () => {
    const theirs = fs.readFileSync(ROS_FIXTURE, 'utf8');
    const force = (s: string) => s.match(/<force\s([^>]*)>/)![1];
    const at = (s: string, k: string) => s.match(new RegExp(`${k}="([^"]*)"`))?.[1];
    for (const key of ['entryId', 'catalogueId', 'catalogueName', 'catalogueRevision']) {
      expect([key, at(force(xml), key)]).toEqual([key, at(force(theirs), key)]);
    }
  });

  it('never disagrees with NewRecruit on a selection it also writes', () => {
    /*
      The assertion the whole package rests on. For every selection this
      exporter emits, find the one NewRecruit wrote with the same `entryId` and
      require all four identity attributes to match. A wrong one produces a file
      that opens and is quietly not this warband.
    */
    const theirs = new Map(
      selectionsOf(fs.readFileSync(ROS_FIXTURE, 'utf8')).map((s) => [s.entryId, s]));
    const wrong: string[] = [];
    let compared = 0;
    for (const s of selectionsOf(xml)) {
      const t = theirs.get(s.entryId);
      if (!t) continue;
      compared += 1;
      for (const key of ['entryGroupId', 'group', 'from', 'type'] as const) {
        if ((s[key] ?? undefined) !== (t[key] ?? undefined)) {
          wrong.push(`${s.name}: ${key} ours=${s[key]} theirs=${t[key]}`);
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(compared).toBeGreaterThanOrEqual(30);
  });

  it('writes the catalogue’s name for a model, not the roster’s rendered one', () => {
    /*
      A roster's `name` is what modifiers made of it. `Azeb` is written by
      NewRecruit as `Kavass`, and a promoted one as `Favoured Kavass`, all three
      being entry `0e7e-9167-f044-9493`. This exporter does not evaluate rename
      modifiers, so it writes the catalogue's name and puts the player's own
      name in `customName`, where it belongs.
    */
    const azeb = selectionsOf(xml).filter((s) => s.entryId === '0e7e-9167-f044-9493');
    expect(azeb.length).toBeGreaterThan(0);
    for (const s of azeb) expect(s.name).toBe('Azeb');
    expect(azeb.map((s) => s.customName)).toContain('Nasir the Inaccurate');
  });

  it('gives every selection an instance id that is not a catalogue id', () => {
    /*
      A roster's own ids must not collide with the catalogue's, or an importer
      resolves a selection to itself. Catalogue ids are four hyphenated hex
      quads; these are not.
    */
    const ids = selectionsOf(xml).map((s) => s.id);
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).not.toMatch(/^[0-9a-f]{4}(-[0-9a-f]{4}){3}$/);
  });

  it('writes the same bytes for the same warband', () => {
    // Derived ids, not random ones: a re-export is a re-export and not a new
    // roster, and a test cannot compare against noise.
    expect(toRos(layer, warbandFromRos().warband, UNITS).xml).toBe(xml);
  });

  it('prices a selection in Glory as well as in Ducats', () => {
    /*
      Trench Crusade has two currencies, and an item's `cost` field carries only
      the first — 32 armoury rows are priced in Glory, and reading `cost` alone
      writes every one of them into the roster as free.

      Constructed rather than taken from the fixture: the one Glory-priced thing
      in that warband is a `Sniper Scope`, an exploration find the layer
      deliberately cannot name, so the fixture alone cannot exercise this.
    */
    const { warband: base } = warbandFromRos();
    const [model, ...rest] = base.units;
    const carriable = Object.keys(
      layer.units.find((u) => u.entryId === '7c17-5f75-6fd9-73cf')!.placements[0].carries)[0];
    const withGlory = {
      ...model,
      equippedWeapons: [{ name: carriable, cost: 0, gloryCost: 3 }],
    } as unknown as ActiveUnit;
    const out = toRos(layer, { ...base, units: [withGlory, ...rest] }, UNITS).xml;
    expect(out).toMatch(/name="Glory Points"[^/]*value="3"/);
  });

  it('writes no zero-valued cost on a selection', () => {
    // NewRecruit writes none: 61 of its 95 selections carry a costs block at
    // all, and not one of them carries a zero.
    const perSelection = xml.slice(xml.indexOf('<forces>'));
    expect(perSelection).not.toMatch(/<cost[^>]*value="0"/);
  });

  it('nests a model inside the unit entry that wraps it', () => {
    // `Mamluk Faris` is a `unit` entry whose only child is the `model` carrying
    // the profile, and NewRecruit writes both.
    const wrappers = selectionsOf(xml).filter((s) => s.type === 'unit');
    expect(wrappers.length).toBeGreaterThan(0);
    for (const w of wrappers) {
      expect(xml.slice(xml.indexOf(`id="${w.id}"`)).slice(0, 400)).toContain('<selections>');
    }
  });

  it('reports what it deliberately leaves out', () => {
    expect(report.exportable).toBe(true);
    const said = [...report.warnings, ...report.informational].map((w) => w.why).join(' ');
    expect(said).toMatch(/profiles, rules and categories/);
    expect(said).toMatch(/has yet been opened in NewRecruit/);
    expect(said).toMatch(/gameSystemRevision/);
    expect(said).toMatch(/identity from /);
  });
});

/* ------------------------------------------------------------ the gaps --- */

describe('what this warband cannot express, named rather than dropped', () => {
  it('names what the layer cannot, and every one is a class rather than an oversight', () => {
    /*
      Nine selections in a real thirteen-model campaign warband, and not one is
      wargear the layer should have had:

        Ranged Proficiency [7]        campaign advancements — skills and
        Assassinate [4]               injuries the dataset holds in its
        Skill & Expertise [7]         campaign tables, not in an armoury
        Strength of Samson [8]
        Leg Wound [31]
        Lost Arm [26]

        Alchemical Ammuntion (Loaded) a BattleScribe counter: a hidden entry a
                                      modifier increments, which a player
                                      cannot choose

        Sniper Scope                  a Glory Item in `Campaign Rules.cat`'s
                                      own group, won in a campaign rather
                                      than bought from an Armoury

      `docs/ROSTER-PATHS.md` says why each is deliberately outside the layer's
      wargear vocabulary. Pinned as a list rather than a count so that a
      newcomer to it has to be explained rather than absorbed.

      `Fierce Lion` was on this list and is not any more, and its leaving is
      the point of EXP-1's parser change. It was never an oversight of the
      layer: it is a real `selectionEntry` the Lion of Jabir offers for +5
      Ducats, stated as a direct child of the model rather than inside a
      group, and `optionsOf` read only groups — so it was absent from the
      dataset, from the builder, from the legality engine and from this layer
      at once. Fourteen upgrades were in that position across the six faction
      catalogues.
    */
    const { unnameable } = warbandFromRos();
    const names = [...new Set(unnameable.map((u) => u.split(' / ')[1]))].sort();
    expect(names).toEqual([
      'Alchemical Ammuntion (Loaded)',
      'Assassinate [4]',
      'Leg Wound [31]',
      'Lost Arm [26]',
      'Ranged Proficiency [7]',
      'Skill & Expertise [7]',
      'Sniper Scope',
      'Strength of Samson [8]',
    ]);
  });

  it('is FATAL rather than silently short when a model carries one', () => {
    const { warband } = warbandFromRos();
    const [first, ...rest] = warband.units;
    const withScope = {
      ...first,
      equippedWeapons: [
        ...(first.equippedWeapons ?? []),
        { name: 'Sniper Scope', cost: 0, gloryCost: 2 },
      ],
    } as unknown as ActiveUnit;
    const report = rosReport(layer, { ...warband, units: [withScope, ...rest] }, UNITS);
    expect(report.exportable).toBe(false);
    expect(report.fatal.map((f) => f.subject)).toContain('Sniper Scope');
  });
});

/* ----------------------------------------------------------- the report --- */

describe('the compatibility report, before anything is written', () => {
  const { warband } = warbandFromRos();
  const withUnits = (units: ActiveUnit[]): Warband => ({ ...warband, units });

  it('is exportable for a warband every part of which has an identity', () => {
    expect(rosReport(layer, warband, UNITS).fatal).toEqual([]);
    expect(rosReport(layer, warband, UNITS).exportable).toBe(true);
  });

  it('is FATAL on a model with no BattleScribe identity, quoting the reason', () => {
    const leper = DATASET.units.find((u) => u.name === 'Leper-Pilgrim')!;
    const impostor = {
      ...warband.units[0],
      customName: 'Brother Anselm',
      baseProfileId: leper.id,
      profileSnapshot: { ...leper },
      equippedWeapons: [],
    } as unknown as ActiveUnit;
    const report = rosReport(layer, withUnits([impostor]), UNITS);
    expect(report.exportable).toBe(false);
    expect(report.fatal[0].model).toBe('Brother Anselm');
    expect(report.fatal[0].why).toMatch(/minted by a supplement layer/);
  });

  it('refuses to write a file at all when anything is fatal', () => {
    /*
      A backstop, not the primary guard. A caller shows the report and disables
      the download; this makes sure there is no other path to a partial roster,
      because a roster missing a weapon is not this warband and handing it over
      as one is worse than handing over nothing.
    */
    const leper = DATASET.units.find((u) => u.name === 'Leper-Pilgrim')!;
    const impostor = {
      ...warband.units[0], baseProfileId: leper.id, profileSnapshot: { ...leper },
      equippedWeapons: [],
    } as unknown as ActiveUnit;
    expect(() => toRos(layer, withUnits([impostor]), UNITS)).toThrow(/no \.ros written/);
  });

  it('is FATAL on a warband with nothing living in it', () => {
    const report = rosReport(
      layer, withUnits(warband.units.map((u) => ({ ...u, isDead: true }))), UNITS);
    expect(report.exportable).toBe(false);
    expect(report.fatal.map((f) => f.why).join(' ')).toMatch(/no living models/);
  });

  it('says how many dead models it left out rather than dropping them silently', () => {
    const [first, ...rest] = warband.units;
    const report = rosReport(layer, withUnits([{ ...first, isDead: true }, ...rest]), UNITS);
    expect(report.informational.map((i) => i.why).join(' '))
      .toMatch(/1 dead model\(s\) left out/);
  });

  /*
    RC-1. A model killed in a post-battle sequence and held on the roster
    awaiting Re-creation is stored with `isDead` FALSE — that flag is false
    only so the roster keeps the entry its 40 👑 is paid against — and a `.ros`
    is a muster for a game. It was being written into the file as a living
    model, so the owner's opponent would have seen a dead Takwin in the list.
  */
  /*
    WC-1. A Variant grant reaches across the book in a way the catalogues do
    not reach across themselves.

    `Engineer Body Armour` is a New Antioch Armoury row (45 Ducats), and the
    House of Wisdom's *Weapon Collections* lets a Sultanate Warband buy one
    piece of New Antioch Battlekit. No Iron Sultanate entry can name it —
    measured: of the seventeen entries in that catalogue, zero reach it — so
    the export refused the whole roster the moment it was equipped.
  */
  describe('a pick a Variant grant allows and no catalogue can name', () => {
    const granted = (name: string, cost: number) => ({
      name, cost, gloryCost: 0, factionId: 'new-antioch', grantedBy: 'Weapon Collections',
    });
    const carrying = (item: ReturnType<typeof granted>) => {
      const [first, ...rest] = warband.units;
      return withUnits([{
        ...first,
        equippedArmour: [...(first.equippedArmour ?? []), item],
      } as unknown as ActiveUnit, ...rest]);
    };

    it('is a warning naming the item and the rule, not a refusal', () => {
      const wb = carrying(granted('Engineer Body Armour', 45));
      const report = rosReport(layer, wb, UNITS);

      expect(report.exportable).toBe(true);
      expect(report.fatal).toEqual([]);
      const warned = report.warnings.filter((w) => w.subject === 'Engineer Body Armour');
      expect(warned).toHaveLength(1);
      expect(warned[0].model).toBe(warband.units[0].customName);
      // The rule that allows it, and what the file is short by. A player
      // handing this to an opponent has to be able to say both.
      expect(warned[0].why).toMatch(/Weapon Collections/);
      expect(warned[0].why).toMatch(/45 Ducats less/);
    });

    it('writes the file, without that one selection', () => {
      const wb = carrying(granted('Engineer Body Armour', 45));
      const { xml } = toRos(layer, wb, UNITS);

      expect(xml).not.toContain(xmlAttr('Engineer Body Armour'));
      // Everything else this model carries is still in the file.
      expect(xml).toContain(xmlAttr(warband.units[0].customName));
      expect(selectionsOf(xml).length).toBeGreaterThan(warband.units.length);
    });

    it('stays FATAL where no grant is behind it', () => {
      const [first, ...rest] = warband.units;
      const wb = withUnits([{
        ...first,
        equippedArmour: [{ name: 'Engineer Body Armour', cost: 45, gloryCost: 0 }],
      } as unknown as ActiveUnit, ...rest]);
      const report = rosReport(layer, wb, UNITS);

      expect(report.exportable).toBe(false);
      expect(report.fatal.map((f) => f.subject)).toContain('Engineer Body Armour');
    });
  });

  it('leaves out a model awaiting Re-creation, as it leaves out a dead one', () => {
    const [first, ...rest] = warband.units;
    const waiting = {
      ...first,
      awaitingRecreation: {
        ability: 'Re-creation',
        cost: { ducats: 40, glory: 0 },
        deadline: 'quartermaster',
        sinceGame: 3,
      },
    } as unknown as ActiveUnit;
    const report = rosReport(layer, withUnits([waiting, ...rest]), UNITS);

    expect(report.exportable).toBe(true);
    expect(report.informational.map((i) => i.why).join(' '))
      .toMatch(/1 dead model\(s\) left out/);

    const xml = toRos(layer, withUnits([waiting, ...rest]), UNITS);
    expect(xml).not.toContain(xmlAttr(first.customName));
  });
});

/* ----------------------------------------------------------- the pieces --- */

describe('resolving a model to its catalogue entry', () => {
  it('resolves by id where the id is the dataset’s', () => {
    const azeb = DATASET.units.find((u) => u.name === 'Azeb')!;
    const unit = { baseProfileId: azeb.id, profileSnapshot: { name: 'Kavass' } };
    expect(catalogueEntryFor(unit as unknown as ActiveUnit, UNITS)?.entryId)
      .toBe('0e7e-9167-f044-9493');
  });

  it('resolves by name where the id has been re-keyed', () => {
    /*
      Hydration re-keys the catalogue, so a running app's `baseProfileId` is the
      store's id and not the dataset's. The name carries it there.
    */
    const unit = { baseProfileId: 'rekeyed-by-the-store', profileSnapshot: { name: 'Azeb' } };
    expect(catalogueEntryFor(unit as unknown as ActiveUnit, UNITS)?.entryId)
      .toBe('0e7e-9167-f044-9493');
  });

  it('resolves nothing rather than guessing when neither matches', () => {
    const unit = { baseProfileId: 'nope', profileSnapshot: { name: 'Kavass' } };
    expect(catalogueEntryFor(unit as unknown as ActiveUnit, UNITS)).toBeUndefined();
  });
});

describe('deriving the force catalogue', () => {
  it('takes it from the models, not from the faction’s name', () => {
    /*
      Four of the dataset's eight faction names are spelled exactly as a
      catalogue is and four are not — `Heretic Legions` against `Heretic
      Legion`, `Cult of the Black Grail` against `Black Grail`. Matching on the
      name would have been a guess, and wrong half the time.
    */
    const { warband } = warbandFromRos();
    const { catalogueId } = forceCatalogue(layer, warband.units, UNITS);
    expect(catalogueId).toBe('72ab-daa4-80ee-e9a5');
    expect(layer.catalogues.find((c) => c.id === catalogueId)!.name).toBe('Iron Sultanate');
  });
});

describe('the small things that break a file', () => {
  it('escapes all five XML entities in user text', () => {
    // A warband name goes straight into `customName`. Under-escaping produces a
    // file that will not parse; over-escaping always reads back.
    expect(xmlAttr(`Fitz & "Sons" <o'Brien>`))
      .toBe('Fitz &amp; &quot;Sons&quot; &lt;o&apos;Brien&gt;');
  });

  it('escapes a warband name that would otherwise close the tag', () => {
    const { warband } = warbandFromRos();
    const { xml } = toRos(layer, { ...warband, name: 'Al-Qarn "Rihla" & <friends>' }, UNITS);
    expect(xml).toContain('&quot;Rihla&quot;');
    expect(xml).not.toContain('<friends>');
    expect(selectionsOf(xml).length).toBeGreaterThan(10);
  });

  it('derives instance ids that differ for different inputs', () => {
    expect(instanceId('a')).not.toBe(instanceId('b'));
    expect(instanceId('a', 'b')).not.toBe(instanceId('ab'));
    expect(instanceId('a')).toBe(instanceId('a'));
  });

  it('decodes a layer path the same way the file spells it', () => {
    const azeb = layer.units.find((u) => u.entryId === '0e7e-9167-f044-9493')!;
    expect(decodePath(layer, azeb.placements[0].path)).toBe('0e7e-9167-f044-9493');
  });
});
