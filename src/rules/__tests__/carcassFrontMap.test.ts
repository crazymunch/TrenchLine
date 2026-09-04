/**
 * The three tables printed on the Carcass Front fold-out campaign map.
 *
 * They are on the map and nowhere else, and the book's campaign rules point at
 * all three. `data-sources/carcass-front/SOURCES.json` recorded the map PDF as
 * print material with no rules content, so it was never fetched and the Codex
 * told players it was short a table it could have had all along.
 *
 * Every value asserted below is printed on the map.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';

const d = DATASET as unknown as Dataset;
const map = d.carcassFrontMap;

describe('the Carcass Front campaign map', () => {
  it('read every table, with nothing left unresolved', () => {
    // The whole of the parser's error checking. Two of the three tables are
    // reassembled from an extraction that broke every wrapped cell onto its
    // own line, so "nothing was reported" is the claim worth asserting.
    expect(map?.unreadable).toEqual([]);
  });

  it('reads the Resource glyphs from the book, not from a table written here', () => {
    // "The four Resources are: Favour 👁 … Relics 🏺 … Supplies 📦 …
    // Territories 🌍" — the map prints only the glyph.
    expect(map?.legend).toEqual({
      '👁': 'Favour', '🏺': 'Relics', '📦': 'Supplies', '🌍': 'Territories',
    });
  });

  it('carries all 32 zones with their Resources and scenario', () => {
    expect(map?.zones).toHaveLength(32);
    expect(map?.zones.find((z) => z.name === 'The Vivarium')).toEqual({
      name: 'The Vivarium',
      resources: ['Favour', 'Relics', 'Supplies'],
      scenario: 'Dragon Hunt',
    });
    expect(map?.zones.find((z) => z.name === 'Botfly Valley')).toEqual({
      name: 'Botfly Valley',
      resources: ['Relics'],
      scenario: 'Random Trench Lines Scenario',
    });
  });

  it('carries all ten Special Zone Outpost Bonuses, whole', () => {
    /*
      A zone name that fits its column stays on the row; one that does not is
      set over as many as three lines with the bonus starting after it. Read
      shortest-match-first, `Ruins of Nineveh Novus` became `Ruins of` — which
      is not a zone either, so the row was lost entirely and `Nineveh Novus`
      became the first two words of somebody's bonus text.
    */
    expect(map?.outpostBonuses).toHaveLength(10);
    const nineveh = map?.outpostBonuses.find((b) => b.zone === 'Ruins of Nineveh Novus');
    expect(nineveh?.bonus).toContain('adds one Omen of Leviathan');
    expect(nineveh?.bonus).toContain('add or subtract 1 from your Exploration Roll');

    // The one whose name DID fit its column, so it arrives tab-separated.
    expect(map?.outpostBonuses.find((b) => b.zone === 'Kurd Dagh')?.bonus)
      .toMatch(/^You can re-roll one Promotion roll/);
  });

  it('every bonus names a zone the Zones table lists', () => {
    const zones = new Set(map?.zones.map((z) => z.name));
    for (const b of map?.outpostBonuses ?? []) expect(zones.has(b.zone), b.zone).toBe(true);
  });

  it('reads the D6 charts as six published names per row', () => {
    const g = map?.generator;
    expect(g?.archetypes).toEqual(['No Man’s Land', 'Decimated Ruins', 'Trench Lines']);
    expect(g?.rows.map((r) => r.printed)).toEqual(['1-2', '3-4', '5-6']);
    expect(g?.rows[0].byArchetype['No Man’s Land'])
      .toEqual({ deployment: 'Standard Deployment', victory: 'Sabotage' });
    expect(g?.rows[1].byArchetype['Trench Lines'])
      .toEqual({ deployment: 'Tunnels', victory: 'Breakthrough' });
  });

  it('names a chart cell the way the BOOK spells it, so the two join up', () => {
    /*
      The book prints `Long-Distance Battle`; the map prints `Long Distance
      Battle`. Matched literally, row 5-6 resolved to nothing at all and was
      reported rather than kept. Compared with hyphens and spaces treated
      alike it matches, and what is emitted is the book's spelling — so a
      chart cell and the generator's rules text for that deployment are the
      same string.
    */
    const cell = map?.generator?.rows[2].byArchetype['No Man’s Land'].deployment;
    expect(cell).toBe('Long-Distance Battle');
    const published = (d.scenarioGenerator?.deployment?.rows ?? []).map((r) => r.values[0]);
    expect(published).toContain(cell);
  });

  it('never invents a chart cell: every one is a name the book prints', () => {
    const deployments = new Set((d.scenarioGenerator?.deployment?.rows ?? []).map((r) => r.values[0]));
    const victories = new Set((d.scenarioGenerator?.victory?.rows ?? []).map((r) => r.values[0]));
    for (const row of map?.generator?.rows ?? []) {
      for (const [arch, cell] of Object.entries(row.byArchetype)) {
        expect(deployments.has(cell.deployment), `${row.printed} ${arch}`).toBe(true);
        expect(victories.has(cell.victory), `${row.printed} ${arch}`).toBe(true);
      }
    }
  });
});
