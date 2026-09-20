/**
 * A roster as text: three presets, two renderings, one privacy choice.
 *
 * `docs/EXPORT-ARCHITECTURE-BRIEF.md` §4.1 and `docs/EXPORT-CODEX-REVIEW.md`
 * E5. The old version was two string-concatenation functions in a modal, and
 * the things these tests pin are the three it got wrong: it ran the list cost
 * and the Strongbox balance together under one label, it never said which rules
 * or Variant the roster was built under, and it put whatever the player had
 * typed straight into Discord markdown.
 */
import { describe, it, expect } from 'vitest';

import { escapeFor, renderRosterText, rosterTotals } from '../rosterText';
import type { ActiveUnit, Warband } from '@/types/warband';

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Brother Anselm',
  profileSnapshot: {
    name: 'Trench Pilgrim',
    category: 'Trooper',
    stats: { movement: '6"', ranged: '+0', melee: '+1', armour: '0', keywords: ['FEAR'] },
  },
  equippedWeapons: [{ instanceId: 'w', name: 'Flail' }],
  equippedArmour: [],
  equippedEquipment: [{ instanceId: 'e', name: 'Gas Mask' }],
  xp: 3,
  advancements: ['+1 Melee'],
  skills: [{ name: 'Duellist', category: 'Melee' }],
  injuries: ['D66: 33 - Lost an Eye'],
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
  ducatLimit: 1000, treasuryDucats: 85, gloryPoints: 2,
  units: [unit()],
  armoryStash: [{ id: 's', name: 'Medi-kit', type: 'Equipment', cost: 10, quantity: 2 }],
  lore: 'Nine years walking.',
  notes: 'organiser notes',
  ...over,
} as unknown as Warband);

const ctx = { factionName: 'Trench Pilgrims', variantName: 'Ministry of Pain', rulesetId: 'trenchline' };
const text = (over: Partial<Parameters<typeof renderRosterText>[2]> = {}) =>
  renderRosterText(warband(), ctx, { preset: 'full', flavour: 'plain', ...over });

describe('the totals, which used to be one line with one label', () => {
  it('separates what the list COSTS from what the Warband HOLDS', () => {
    /*
      The old header was `Points: 640 / 1000 Ducats | Glory: 3`, where the Glory
      was the Strongbox balance sitting beside a list cost with nothing to tell
      them apart (E5).
    */
    const t = rosterTotals(warband());
    expect(t.listDucats).toBe(55);
    expect(t.strongbox).toBe(85);
    expect(t.gloryHeld).toBe(2);

    const out = text();
    expect(out).toContain('List: 55 / 1000 Ducats');
    expect(out).toContain('Strongbox: 85 Ducats · 2 Glory held');
  });

  it('counts the dead separately from the models on the table', () => {
    /*
      The dead are in `fallen`, not in `units` behind a flag — the Trauma
      Table removes the model from the Roster, and the app now does too. So
      `models` is a plain count of `units` and `dead` is a plain count of
      `fallen`, with no filter in either.
    */
    const w = warband({ units: [unit()], fallen: [unit({ id: 'u2', isDead: true })] });
    expect(rosterTotals(w)).toMatchObject({ models: 1, dead: 1 });
    expect(renderRosterText(w, ctx, { preset: 'summary', flavour: 'plain' }))
      .toContain('1 model · 1 lost to the campaign');
  });

  it('does not count a fallen model’s Ducats towards the list', () => {
    /*
      This is the defect the move fixes, stated as money. A Warband that lost
      a 40-Ducat model used to read as though it still had it, so it looked as
      expensive as one that had lost nothing — and had that much less room to
      recruit a replacement.
    */
    const alive = rosterTotals(warband({ units: [unit()] })).listDucats;
    const bereaved = rosterTotals(
      warband({ units: [unit()], fallen: [unit({ id: 'u2' })] })).listDucats;
    expect(bereaved).toBe(alive);
  });

  it('names the ruleset and the Variant, which legality is meaningless without', () => {
    const out = text();
    expect(out).toContain('Trench Pilgrims · Ministry of Pain');
    expect(out).toContain('Rules: trenchline');
  });
});

describe('the three presets', () => {
  it('Summary is one line a model, and no loadout', () => {
    const out = renderRosterText(warband(), ctx, { preset: 'summary', flavour: 'plain' });
    expect(out).toContain('BROTHER ANSELM — Trench Pilgrim (Trooper) · 55 D');
    expect(out).not.toContain('Flail');
    expect(out).not.toContain('MOV');
  });

  it('Roster adds the loadout and the Arsenal, but no statlines', () => {
    const out = renderRosterText(warband(), ctx, { preset: 'roster', flavour: 'plain' });
    expect(out).toContain('Flail, Gas Mask');
    expect(out).toContain('Medi-kit ×2');
    expect(out).not.toContain('MOV');
    expect(out).not.toContain('Injuries');
  });

  it('Full adds statlines, Keywords and everything the campaign wrote', () => {
    const out = text();
    expect(out).toContain('MOV 6" · RNG +0 · MELEE +1 · ARMOUR 0');
    expect(out).toContain('FEAR');
    expect(out).toContain('3 XP');
    expect(out).toContain('Advancements: +1 Melee');
    expect(out).toContain('Skills: Duellist');
    expect(out).toContain('Injuries: D66: 33 - Lost an Eye');
    expect(out).toContain('Battle Scars: Prominent Scar');
  });
});

describe('lore and notes are a separate choice from detail', () => {
  it('are left out of Full, which asked for rules detail and not disclosure', () => {
    const out = text();
    expect(out).not.toContain('Walked from Antioch');
    expect(out).not.toContain('Deus vult');
    expect(out).not.toContain('my private note');
    expect(out).not.toContain('Nine years walking');
    expect(out).not.toContain('organiser notes');
  });

  it('are included when the player asks for them', () => {
    const out = text({ includePrivate: true });
    expect(out).toContain('Walked from Antioch');
    expect(out).toContain('Deus vult');
    expect(out).toContain('my private note');
    expect(out).toContain('Nine years walking');
  });

  it('stay out even of a Summary that asked for them, having nothing to put them in', () => {
    // Summary carries no per-model detail at all, so the toggle can only reach
    // the warband's own lore — which it does, and nothing else leaks.
    const out = renderRosterText(warband(), ctx,
      { preset: 'summary', flavour: 'plain', includePrivate: true });
    expect(out).toContain('Nine years walking');
    expect(out).not.toContain('Deus vult');
  });
});

describe('Discord is a rendering, not a fourth preset', () => {
  it('carries the same content as plain, marked up', () => {
    const plain = renderRosterText(warband(), ctx, { preset: 'roster', flavour: 'plain' });
    const discord = renderRosterText(warband(), ctx, { preset: 'roster', flavour: 'discord' });
    for (const fact of ['List: 55 / 1000 Ducats', 'Strongbox: 85 Ducats', 'Flail, Gas Mask']) {
      expect(plain).toContain(fact);
      expect(discord).toContain(fact);
    }
    expect(discord).toContain('**Brother Anselm**');
  });

  it('escapes what the player wrote, so one asterisk does not bold the rest', () => {
    /*
      A warband called `**The Ninefold**` used to turn every line after it bold,
      because the old builder concatenated the name straight into markdown.
    */
    const w = warband({ name: '**The Ninefold**', units: [unit({ customName: 'Anselm_the_Bold' })] });
    const out = renderRosterText(w, ctx, { preset: 'summary', flavour: 'discord' });
    expect(out).toContain('\\*\\*The Ninefold\\*\\*');
    expect(out).toContain('Anselm\\_the\\_Bold');
  });

  it('does not let a roster ping a server', () => {
    // A model named `@everyone` pasted into a channel was a mass ping.
    const out = escapeFor('discord', 'Brother @everyone and @here');
    expect(out).not.toMatch(/(^|[^​])@everyone/);
    expect(out).not.toMatch(/(^|[^​])@here/);
    expect(out).toContain('everyone');
  });

  it('leaves plain text exactly as the player wrote it', () => {
    expect(escapeFor('plain', '**bold** @everyone _x_')).toBe('**bold** @everyone _x_');
  });
});

describe('a roster with nothing in it', () => {
  it('renders rather than throwing', () => {
    const empty = { id: 'w', name: '', factionId: '', ducatLimit: 0, treasuryDucats: 0,
      gloryPoints: 0, units: [], armoryStash: [] } as unknown as Warband;
    const out = renderRosterText(empty, {}, { preset: 'full', flavour: 'plain' });
    expect(out).toContain('UNNAMED WARBAND');
    expect(out).toContain('0 models');
  });
});
