/**
 * One projection, two readers.
 *
 * Codex's `docs/EXPORT-CODEX-REVIEW.md` E1: the presentation formats must not
 * each resolve their own totals, or they drift. And E6, on why that matters
 * more for print than it looks — "a beautiful sheet with the wrong Glory total
 * is a correctness bug".
 *
 * So these assert the numbers, and that the two renderers agree on them.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

import { presentRoster } from '../rosterPresentation';
import { renderPresented } from '../rosterText';
import { RosterPrintSheet } from '@/components/builder/RosterPrintSheet';
import type { ActiveUnit, Warband } from '@/types/warband';

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Brother Anselm',
  profileSnapshot: {
    name: 'Trench Pilgrim',
    category: 'Trooper',
    gloryCost: 2,
    stats: { movement: '6"', ranged: '+0', melee: '+1', armour: '0', keywords: ['FEAR'] },
    innateAbilities: [{ name: 'Zealot', description: 'Add +1 DICE to Melee.' }],
  },
  equippedWeapons: [{ instanceId: 'w', name: 'Flail' }],
  equippedArmour: [],
  equippedEquipment: [],
  xp: 3,
  advancements: ['+1 Melee'],
  skills: [{ name: 'Duellist', category: 'Melee' }],
  injuries: ['Lost an Eye'],
  scars: [{ name: 'Prominent Scar' }],
  isDead: false,
  totalCost: 55,
  lore: 'Walked from Antioch.',
  quote: 'Deus vult.',
  notes: 'my private note',
  ...over,
} as unknown as ActiveUnit);

const warband = (over: Partial<Warband> = {}): Warband => ({
  id: 'w', name: 'The Ninefold Penance', factionId: 'trench-pilgrims',
  ducatLimit: 1000, treasuryDucats: 85, gloryPoints: 4,
  units: [unit()],
  armoryStash: [{ id: 's', name: 'Medi-kit', type: 'Equipment', cost: 10, quantity: 2 }],
  lore: 'Nine years walking.',
  ...over,
} as unknown as Warband);

const ctx = { factionName: 'Trench Pilgrims', variantName: 'Ministry of Pain', rulesetId: 'trenchline' };
const present = (priv = false) => presentRoster(warband(), ctx, { includePrivate: priv });
const printed = (mode: 'plain' | 'pretty', priv = false) =>
  renderToStaticMarkup(React.createElement(RosterPrintSheet, { roster: present(priv), mode }));

describe('the projection', () => {
  it('separates the list cost from what the Warband holds', () => {
    const t = present().totals;
    expect(t.listDucats).toBe(55);
    expect(t.listGlory).toBe(2);      // the model's own Glory cost
    expect(t.gloryHeld).toBe(4);      // the Warband's Glory balance
    expect(t.strongbox).toBe(85);
  });

  it('flattens a model to what a reader sees, and nothing else', () => {
    const [m] = present().models;
    expect(m).toMatchObject({
      name: 'Brother Anselm',
      profileName: 'Trench Pilgrim',
      category: 'Trooper',
      ducats: 55,
      glory: 2,
      dead: false,
      gear: ['Flail'],
      keywords: ['FEAR'],
      xp: 3,
      advancements: ['+1 Melee'],
      skills: ['Duellist'],
      injuries: ['Lost an Eye'],
      scars: ['Prominent Scar'],
    });
    expect(m.abilities).toEqual([{ name: 'Zealot', description: 'Add +1 DICE to Melee.' }]);
  });

  it('applies the privacy choice here, not in each renderer', () => {
    /*
      A second renderer that forgot to check the flag would be a disclosure
      bug, not a formatting one — so the projection simply does not contain
      what was not asked for.
    */
    const closed = present();
    expect(closed.lore).toBeUndefined();
    expect(closed.models[0].lore).toBeUndefined();
    expect(closed.models[0].quote).toBeUndefined();
    expect(closed.models[0].notes).toBeUndefined();

    const open = present(true);
    expect(open.lore).toBe('Nine years walking.');
    expect(open.models[0].quote).toBe('Deus vult.');
  });
});

describe('the two renderers agree', () => {
  it('on every total, because they read the same object', () => {
    const roster = present();
    const text = renderPresented(roster, { preset: 'full', flavour: 'plain' });
    const sheet = printed('pretty');

    for (const [inText, inSheet] of [
      ['List: 55 / 1000 Ducats', 'List 55 / 1000 Ducats'],
      ['Strongbox: 85 Ducats', 'Strongbox 85 Ducats'],
      ['4 Glory held', '4 Glory held'],
    ]) {
      expect(text).toContain(inText);
      expect(sheet).toContain(inSheet);
    }
  });
});

describe('the printed sheet', () => {
  it('puts each model’s name in a table header, which is the pagination policy', () => {
    /*
      Not decoration. `break-inside: avoid` is not a pagination algorithm — a
      model with long rules text can exceed a page on its own — and a repeated
      `<thead>` is the only mechanism CSS gives for "this heading again at the
      top of the next page" (E6).
    */
    const html = printed('pretty');
    expect(html).toContain('<thead>');
    expect(html).toMatch(/<thead><tr><th>Brother Anselm/);
    expect(html).toContain('class="print-model"');
  });

  it('carries the statlines, Keywords and abilities in Pretty', () => {
    const html = printed('pretty');
    expect(html).toContain('MOV 6&quot;');
    expect(html).toContain('FEAR');
    expect(html).toContain('Zealot');
    expect(html).toContain('Add +1 DICE to Melee.');
    expect(html).toContain('Lost an Eye');
  });

  it('leaves them out of Plain, which is one column for a photocopier', () => {
    const html = printed('plain');
    expect(html).toContain('Brother Anselm');
    expect(html).toContain('Flail');
    expect(html).not.toContain('MOV 6');
    expect(html).not.toContain('Zealot');
    expect(html).not.toContain('print-notes');
  });

  it('gives every living model a ruled box to write in', () => {
    // The owner asked for "space for handwritten notes mid game", which is a
    // measurement — 22mm, stated in globals.css rather than left to the layout.
    expect(printed('pretty')).toContain('class="print-notes"');
  });

  it('gives a dead model no notes box, having nothing left to note', () => {
    const roster = presentRoster(warband({ units: [unit({ isDead: true })] }), ctx);
    const html = renderToStaticMarkup(
      React.createElement(RosterPrintSheet, { roster, mode: 'pretty' }));
    expect(html).toContain('· dead');
    expect(html).not.toContain('print-notes');
  });

  it('says which rule gave the Warband a model it did not pay for', () => {
    const roster = presentRoster(
      warband({ units: [unit({ grantedFree: 'Curse on Creation', totalCost: 0 })] }), ctx);
    const html = renderToStaticMarkup(
      React.createElement(RosterPrintSheet, { roster, mode: 'plain' }));
    expect(html).toContain('granted by Curse on Creation');
  });

  it('prints personal writing only when the export asked for it', () => {
    expect(printed('pretty')).not.toContain('Deus vult');
    expect(printed('pretty', true)).toContain('Deus vult');
  });

  it('is text, not an image, so a reader can search and a screen reader can read', () => {
    const html = printed('pretty');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('<img');
  });
});
