/**
 * The campaign economy.
 *
 * These numbers persist and compound: a wrong Threshold means a player fields an
 * illegal Force, and a wrong Strongbox is carried for the rest of the campaign
 * and spent from. So the table is tested against the real dataset, not a
 * fixture — a parser change that silently emptied it would otherwise look like
 * "no limit" rather than like a failure.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  forceLimits, startingBudget, reinforcementAllowance,
  strongboxOf, reversible, type LedgerEntry,
  explorationDice, explorationTables, resolveExploration, explorationLedgerEntry,
  hasPlayedAGame, canChangeVariant, explorationBandFor,
} from '../campaign';
import { checkForceLimits } from '../validate';

describe('the Warband Threshold Table', () => {
  it('is derived from the rulebook, not typed in', () => {
    const rows = DATASET.campaign.thresholds;
    expect(rows.length).toBeGreaterThanOrEqual(12);
    // The published values. If the parser drifts, these are what it broke.
    expect(rows[0]).toEqual({ game: 1, threshold: 700, fieldStrength: 10 });
    expect(rows[3]).toEqual({ game: 4, threshold: 1000, fieldStrength: 13 });
    expect(rows[11]).toEqual({ game: 12, threshold: 1800, fieldStrength: 22 });
  });

  it('ascends without gaps', () => {
    const rows = DATASET.campaign.thresholds;
    rows.forEach((r, i) => {
      expect(r.game).toBe(i + 1);
      if (i) {
        expect(r.threshold).toBeGreaterThan(rows[i - 1].threshold);
        expect(r.fieldStrength).toBeGreaterThanOrEqual(rows[i - 1].fieldStrength);
      }
    });
  });

  it('starts every warband on the book’s 700 Ducats', () => {
    expect(startingBudget(DATASET)).toBe(700);
  });
});

describe('forceLimits', () => {
  it('gives the published row for a published game', () => {
    expect(forceLimits(DATASET, 1)).toMatchObject({ threshold: 700, fieldStrength: 10, extrapolated: false });
    expect(forceLimits(DATASET, 4)).toMatchObject({ threshold: 1000, fieldStrength: 13 });
  });

  it('holds at the last row past game 12, and says so', () => {
    // The book stops at 12 and gives no rule beyond it. Extrapolating +100
    // would be inventing game data; holding and flagging lets the UI offer the
    // campaign its own override instead.
    const l = forceLimits(DATASET, 20)!;
    expect(l.threshold).toBe(1800);
    expect(l.fieldStrength).toBe(22);
    expect(l.extrapolated).toBe(true);
  });

  it('treats a nonsense game number as game 1 rather than failing open', () => {
    // The dangerous direction is a missing limit reading as "unlimited".
    expect(forceLimits(DATASET, 0)?.threshold).toBe(700);
    expect(forceLimits(DATASET, -3)?.threshold).toBe(700);
    expect(forceLimits(DATASET, NaN)?.threshold).toBe(700);
  });
});

describe('reinforcementAllowance', () => {
  it('is the Threshold of the next game minus the warband’s total cost', () => {
    // The book's own worked example: total 635, next Threshold 1,000 -> 365.
    expect(reinforcementAllowance(DATASET, 4, 635)).toBe(365);
  });

  it('never goes negative when the warband already exceeds the Threshold', () => {
    expect(reinforcementAllowance(DATASET, 1, 900)).toBe(0);
  });
});

describe('the ledger', () => {
  const e = (p: Partial<LedgerEntry>): LedgerEntry => ({
    id: Math.random().toString(36).slice(2), at: '2026-01-01T00:00:00Z',
    reason: 'quartermaster', ducats: 0, glory: 0, ...p,
  });

  it('is the Strongbox, rather than a stored total', () => {
    const ledger = [
      e({ reason: 'founding', ducats: 700, game: 1 }),
      e({ reason: 'quartermaster', ducats: -635, game: 1 }),
      e({ reason: 'exploration', ducats: 120, game: 2 }),
    ];
    expect(strongboxOf(ledger)).toEqual({ ducats: 185, glory: 0 });
  });

  it('tracks Ducats and Glory apart', () => {
    const ledger = [e({ ducats: 100, glory: 3 }), e({ ducats: -40, glory: -1 })];
    expect(strongboxOf(ledger)).toEqual({ ducats: 60, glory: 2 });
  });

  it('is empty rather than throwing for a warband with no history', () => {
    expect(strongboxOf([])).toEqual({ ducats: 0, glory: 0 });
    expect(strongboxOf(undefined as unknown as LedgerEntry[])).toEqual({ ducats: 0, glory: 0 });
  });

  it('lets a player reverse this game’s purchases but not last game’s', () => {
    const ledger = [
      e({ reason: 'quartermaster', ducats: -50, game: 2 }),
      e({ reason: 'quartermaster', ducats: -30, game: 3 }),
    ];
    const r = reversible(ledger, 3);
    expect(r).toHaveLength(1);
    expect(r[0].ducats).toBe(-30);
  });

  it('never lets a player reverse an admin entry', () => {
    // A catch-up allotment is the group's decision, recorded by whoever runs the
    // campaign. A player undoing it would be editing their own budget, which is
    // the thing the campaign mode exists to prevent.
    const ledger = [
      e({ reason: 'admin-grant', ducats: 300, game: 3, byName: 'Nick' }),
      e({ reason: 'admin-adjust', ducats: -10, game: 3, byName: 'Nick' }),
      e({ reason: 'quartermaster', ducats: -30, game: 3 }),
    ];
    const r = reversible(ledger, 3);
    expect(r).toHaveLength(1);
    expect(r[0].reason).toBe('quartermaster');
  });
});

describe('checkForceLimits', () => {
  const at = (game: number) => forceLimits(DATASET, game)!;

  it('passes a Force inside both caps', () => {
    expect(checkForceLimits(680, 9, at(1))).toEqual([]);
  });

  it('says how much has to sit out, and never calls the roster illegal', () => {
    // The roster is allowed to exceed the Threshold; the Force is not. So this
    // is a warning that names the surplus, not an error telling a player to
    // delete a model they are entitled to own.
    const v = checkForceLimits(820, 9, at(1));
    expect(v).toHaveLength(1);
    expect(v[0].code).toBe('force-over-threshold');
    expect(v[0].severity).toBe('warning');
    expect(v[0].message).toContain('120 Ducats');
  });

  it('counts models against Field Strength separately from cost', () => {
    const v = checkForceLimits(600, 13, at(1));
    expect(v.map((x) => x.code)).toEqual(['force-over-field-strength']);
    expect(v[0].message).toContain('3 must sit');
  });

  it('reports both when both are exceeded', () => {
    const v = checkForceLimits(900, 14, at(1));
    expect(v.map((x) => x.code).sort())
      .toEqual(['force-over-field-strength', 'force-over-threshold']);
  });

  it('says the table ran out rather than pretending game 20 is published', () => {
    const v = checkForceLimits(2000, 9, at(20));
    expect(v[0].rule).toContain('stops at game 12');
  });

  it('cites Field Strength’s two exclusions, which are easy to get wrong', () => {
    const v = checkForceLimits(600, 13, at(1));
    expect(v[0].rule).toContain('Battlekit and Glory Items do not count');
    expect(v[0].rule).toContain('scenario limit');
  });
});

describe('the Exploration Step', () => {
  it('derives all three Location tables from the rulebook', () => {
    const loc = DATASET.campaign.exploration.locations;
    expect(loc.common.length).toBeGreaterThanOrEqual(11);
    expect(loc.rare.length).toBeGreaterThanOrEqual(11);
    expect(loc.legendary.length).toBeGreaterThanOrEqual(11);
    // The published rows. The app's fabricated table had "Empty Trench",
    // "Discarded Ammunition" and "Holy Water Vials" here (AUDIT §1.13).
    expect(loc.common.find((l) => l.roll.from === 4)?.name).toBe('Moonshine Stash');
    expect(loc.common.find((l) => l.roll.from === 5)?.name).toBe('Heavy Weapons Cache');
    expect(loc.rare.find((l) => l.roll.from === 11)?.name).toBe('Pot of Manna');
    expect(loc.legendary.find((l) => l.roll.from === 6)?.name).toBe('Battlefield of Corpses');
  });

  /*
    The Codex described this step from hand-written prose that said "the winner
    of the match rolls on the … Exploration Table" — every player who played
    explores, so it told the loser of every campaign game to skip their income
    — beside three invented bullets naming a "Trench Merchant" offer, a
    "Warband Treasury" and an "Armory Stash". None of those appears in any
    source. This is the sequence the book actually numbers.
  */
  it('derives the five-step Exploration Sequence the book numbers', () => {
    const seq = DATASET.campaign.exploration.sequence;
    expect(seq).toHaveLength(5);
    expect(seq[0]).toBe('Determine the number of Exploration Dice you receive.');
    expect(seq[1]).toBe('Roll the Exploration Dice.');
    expect(seq[3]).toBe('Consult the Exploration Table to see what you have discovered.');
    expect(seq[4]).toMatch(/Collect loot equal to 10 times your Exploration Roll/);
  });

  it('reads the loot multiplier out of that step rather than carrying a 10', () => {
    // The Strongbox's only income, so it is derived like every other number.
    expect(DATASET.campaign.exploration.lootPerPoint).toBe(10);
    expect(DATASET.campaign.exploration.sequence[4])
      .toContain(`${DATASET.campaign.exploration.lootPerPoint} times your Exploration Roll`);
  });

  it('keeps the reward amounts, glyphs and all', () => {
    // "Sell (Any Warband): Add 30 👑 to your Strongbox" — the number is in the
    // prose, so losing the glyph or the text loses the reward.
    const ms = DATASET.campaign.exploration.locations.common.find((l) => l.roll.from === 4)!;
    expect(ms.description).toContain('30 \u{1F451}');
    expect(ms.description).toContain('Strongbox');
  });

  it('carries no page furniture into a description', () => {
    const all = Object.values(DATASET.campaign.exploration.locations).flat();
    const dirty = all.filter((l) => /of 197|Campaign Rules-|Trench Crusade$/.test(l.description));
    expect(dirty.map((l) => l.name)).toEqual([]);
  });

  it('scales the dice with games played', () => {
    expect(explorationDice(DATASET, 1)).toBe(3);
    expect(explorationDice(DATASET, 3)).toBe(4);
    expect(explorationDice(DATASET, 7)).toBe(5);
    expect(explorationDice(DATASET, 40)).toBe(6);   // the 10+ band
  });

  it('opens the right tables, and says when it is the player’s choice', () => {
    expect(explorationTables(DATASET, 1)).toEqual({ tables: ['common'], choose: false });
    expect(explorationTables(DATASET, 4)).toEqual({ tables: ['common', 'rare'], choose: true });
    expect(explorationTables(DATASET, 8)).toEqual({ tables: ['rare'], choose: false });
    expect(explorationTables(DATASET, 12)).toEqual({ tables: ['rare', 'legendary'], choose: true });
  });
});

describe('resolveExploration', () => {
  it('pays loot at ten Ducats a point', () => {
    // The book's worked example: an Exploration Roll of 12 is 120 Ducats.
    expect(resolveExploration(DATASET, 12, 'common')!.loot).toBe(120);
  });

  it('finds the Location when the roll is on the table', () => {
    const r = resolveExploration(DATASET, 4, 'common')!;
    expect(r.location?.name).toBe('Moonshine Stash');
    expect(r.loot).toBe(40);
  });

  it('pays the loot even when the roll is on no row', () => {
    // The rule the D66 model could not express: "If you roll a number that is
    // not included on the Exploration Table, then you discover nothing (but you
    // still use the roll to determine how much Loot you collect)."
    const r = resolveExploration(DATASET, 7, 'common')!;
    expect(r.location).toBeNull();
    expect(r.nothingBecause).toBe('not-on-table');
    expect(r.loot).toBe(70);
  });

  it('treats a repeat discovery as Pillaged, and still pays', () => {
    const r = resolveExploration(DATASET, 4, 'common', ['Moonshine Stash'])!;
    expect(r.location).toBeNull();
    expect(r.nothingBecause).toBe('already-discovered');
    expect(r.loot).toBe(40);
  });

  it('books the loot to the ledger whether or not anything was found', () => {
    const found = explorationLedgerEntry(resolveExploration(DATASET, 4, 'common')!, 2);
    expect(found.reason).toBe('exploration');
    expect(found.ducats).toBe(40);
    expect(found.note).toContain('Moonshine Stash');

    const empty = explorationLedgerEntry(resolveExploration(DATASET, 7, 'common')!, 2);
    expect(empty.ducats).toBe(70);
    expect(empty.note).toContain('no discovery');
  });

  it('produces the same record whichever way the dice were rolled', () => {
    // A physical roll typed in and an in-app roll both arrive here as a number,
    // so neither is second-class in the record.
    const inApp = resolveExploration(DATASET, 9, 'common')!;
    const onTable = resolveExploration(DATASET, 9, 'common')!;
    expect(inApp).toEqual(onTable);
  });
});


describe('when the Variant stops being a choice', () => {
  /*
    A Variant changes what the Warband may recruit. Re-declaring one three games
    in retroactively makes models already on the roster legal or illegal, so it
    is a founding decision — but only for a campaign force. An unrestricted list
    exists to be rebuilt.
  */
  const founding: LedgerEntry[] = [
    { id: 'l1', at: '2026-01-01', reason: 'founding', ducats: 700, glory: 0, game: 1 },
  ];

  it('is open on a freshly mustered Warband', () => {
    const wb = { forceMode: 'campaign' as const, ledger: founding, snapshots: [{ type: 'founding' }] };
    expect(hasPlayedAGame(wb)).toBe(false);
    expect(canChangeVariant(wb)).toBe(true);
  });

  it('closes once a battle has been resolved', () => {
    const wb = {
      forceMode: 'campaign' as const,
      // A Variant that HAS been declared. That is what the lock protects: see
      // the case below for one that never was.
      variantId: 'houseofwisdom',
      ledger: founding,
      snapshots: [{ type: 'founding' }, { type: 'post_battle' }],
    };
    expect(hasPlayedAGame(wb)).toBe(true);
    expect(canChangeVariant(wb)).toBe(false);
  });

  /*
    A Warband with NO Variant may still declare one, however many games it has
    fought. The lock is about changing a declaration, and there is nothing here
    to change.

    This is the state `POST /api/warbands` used to leave every synced Warband
    in: it never persisted `variantId`, so a campaign Warband that had already
    fought lost its Variant and could then never restore it — the app deleted
    the declaration and locked the door on it. A House of Wisdom list came back
    demanding a Yüzbaşı its Variant forbids, with no way to say otherwise.
  */
  it('is open on a Warband that has fought but has no Variant declared', () => {
    const wb = {
      forceMode: 'campaign' as const,
      ledger: founding,
      snapshots: [{ type: 'founding' }, { type: 'post_battle' }],
    };
    expect(hasPlayedAGame(wb), 'the fixture must have fought, or this proves nothing').toBe(true);
    expect(canChangeVariant(wb)).toBe(true);
  });

  it('locks again the moment one is declared', () => {
    const fought = {
      forceMode: 'campaign' as const,
      ledger: founding,
      snapshots: [{ type: 'founding' }, { type: 'post_battle' }],
    };
    expect(canChangeVariant(fought)).toBe(true);
    expect(canChangeVariant({ ...fought, variantId: 'houseofwisdom' })).toBe(false);
  });

  it('closes on Exploration loot, which only happens after a battle', () => {
    const wb = {
      forceMode: 'campaign' as const,
      ledger: [...founding,
        { id: 'l2', at: '2026-01-02', reason: 'exploration' as const, ducats: 90, glory: 0, game: 1 }],
    };
    expect(hasPlayedAGame(wb)).toBe(true);
  });

  it('is not closed by buying things before the first game', () => {
    // The Quartermaster Step is how a Warband is assembled. Spending is not
    // evidence of having fought.
    const wb = {
      forceMode: 'campaign' as const,
      ledger: [...founding,
        { id: 'l2', at: '2026-01-01', reason: 'quartermaster' as const, ducats: -70, glory: 0, game: 1 }],
    };
    expect(hasPlayedAGame(wb)).toBe(false);
    expect(canChangeVariant(wb)).toBe(true);
  });

  it('stays open forever on an unrestricted Warband', () => {
    const wb = {
      forceMode: 'unrestricted' as const,
      snapshots: [{ type: 'post_battle' }],
    };
    expect(hasPlayedAGame(wb)).toBe(true);
    expect(canChangeVariant(wb)).toBe(true);
  });

  it('treats a Warband with no history at all as unfought, not unknown', () => {
    // Imported and legacy Warbands carry neither ledger nor snapshots. Locking
    // them would leave a Variant that can never be set.
    expect(hasPlayedAGame({})).toBe(false);
    expect(canChangeVariant({})).toBe(true);
  });
});

/* ------------------------------------------ the band the wizard actually uses */

describe('the Exploration band for a post-battle step', () => {
  /*
    RR-06. The wizard computed games-played as `campaignGameOf(...) - 1`.
    `currentTurn` is only incremented when the step commits, so while the
    wizard is open it already IS the number of the game just played. Every
    band came out a game late, and loot is ten Ducats per pip.

    The table below is the book's, indexed by the game just played — the state
    the wizard is in when it opens.
  */
  const warband = { campaignId: 'c1' };
  const after = (gameJustPlayed: number) =>
    explorationBandFor(DATASET, warband, { id: 'c1', currentTurn: gameJustPlayed });

  it('counts the game just played as played', () => {
    for (const n of [1, 2, 3, 6, 10]) {
      expect(after(n).gamesPlayed, `after game ${n}`).toBe(n);
    }
  });

  it('matches the book band for band, not a game behind', () => {
    /*
      Each row: after this many games, this many dice. Read off the derived
      table rather than typed — `explorationDice` is already tested against the
      book above, so this asserts the WIRING, which is what was broken.
    */
    for (const n of [1, 2, 3, 4, 5, 6, 8, 10, 12]) {
      expect(after(n).dice, `after game ${n}`).toBe(explorationDice(DATASET, n));
      expect(after(n).tables, `after game ${n}`)
        .toEqual(explorationTables(DATASET, n)?.tables);
    }
  });

  it('is a strictly better deal than the old off-by-one, and differs', () => {
    /*
      Proves the fix is not a no-op. Somewhere in the first ten games the old
      formula and the new one must disagree, or there was nothing to fix.
      Checked as "they differ somewhere" rather than at a hardcoded game, so a
      future band table change does not make this assert a stale boundary.
    */
    const differs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
      (n) => after(n).dice !== explorationDice(DATASET, Math.max(1, n - 1 || 1)),
    );
    expect(differs.length).toBeGreaterThan(0);
  });

  it('reports no band rather than guessing when there is no dataset', () => {
    // Rule 2: the wizard's own `?? 3` fallback is RR-10 and is not this.
    const none = explorationBandFor(null, warband, { id: 'c1', currentTurn: 3 });
    expect(none.dice).toBeNull();
    expect(none.tables).toEqual([]);
  });

  it('treats a warband outside the campaign as its first game', () => {
    expect(explorationBandFor(DATASET, { campaignId: undefined }, undefined).gamesPlayed).toBe(1);
  });
});
