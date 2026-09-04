import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { buildArsenal } from '../arsenal';
import type { Dataset } from '@/types/catalogue';

/**
 * Faction-exclusive wargear is described in the OTHER book.
 *
 * `arsenal.ts` read the core rulebook's Battlekit chapter and said so in its
 * own comment — "Null for faction-exclusive Battlekit, which is described in
 * Warbands of Trench Crusade rather than the Battlekit chapter" — and the app
 * printed that sentence to the player where the rules belong. So Alchemist
 * Armour, Engineer Body Armour and Infernal Iron Armour rendered as a name and
 * a blank, and the Wind Amulet's dossier showed no type, no range and no rules
 * at all.
 *
 * The second book is now read the same way. The core chapter still wins a name
 * collision, because it is the primary source and this only fills gaps.
 */
const d = DATASET as unknown as Dataset;
const kit = (name: string) =>
  (d.battlekit ?? []).find((b) => b.name === name);

describe('wargear from Warbands of Trench Crusade', () => {
  it('gives the Wind Amulet the rule that says what it does', () => {
    const w = kit('Wind Amulet');
    expect(w, 'Wind Amulet is not in the dataset at all').toBeTruthy();
    expect(w!.rules.join(' ')).toMatch(/Gusts of Wind/);
    expect(w!.rules.join(' ')).toMatch(/adds 3” to the model’s Movement/);
  });

  it('and its type and range, which the dossier showed as blank', () => {
    expect(kit('Wind Amulet')!.type).toBe('Equipment');
  });

  it('describes the armours that rendered empty', () => {
    for (const name of ['Alchemist Armour', 'Engineer Body Armour', 'Infernal Iron Armour']) {
      expect(kit(name)?.description ?? '', name).not.toHaveLength(0);
    }
  });

  /*
    The control that matters most: a rule must stop at its own entry. The Wind
    Amulet's ran on through the chapter strip and into the Iron Sultanate's
    Elite entries — "…for the rest of the Activation. Variants Starting a New
    Antioch … 1 Yüzbaşı - Cost: 70 👑" — and a rule that keeps going until the
    next diagram reads as though the book says it.
  */
  it('does not run a rule on into the entries printed after it', () => {
    for (const b of d.battlekit ?? []) {
      const text = b.rules.join(' ');
      expect(text, `${b.name} swallowed a Warband entry`).not.toMatch(/-\s*Cost:\s*\d/);
      expect(text, `${b.name} swallowed a statline`).not.toMatch(/Movement\s+Ranged\s+Melee/);
    }
  });

  it('leaves the core chapter as the authority where both describe an item', () => {
    // Trench Shield is in both books; the core chapter's text is the one kept.
    expect(kit('Trench Shield')?.description ?? '').toMatch(/orichalcum/);
  });

  it('reaches the Codex arsenal, not just the dataset', () => {
    const found = buildArsenal(d).find((a) => a.name === 'Wind Amulet');
    expect(found, 'Wind Amulet missing from the arsenal').toBeTruthy();
    expect(found!.description ?? '').not.toHaveLength(0);
  });
});
