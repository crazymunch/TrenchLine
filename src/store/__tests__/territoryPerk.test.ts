/**
 * A territory perk an organiser writes, labelled as theirs.
 *
 * The app ships no perk of its own any more: sixteen invented ones sat in
 * `seed.ts` and in the campaigns API, rendered under the same "Strategic
 * Territory Perk" heading a derived rule would, so a player could not tell the
 * app's invention from the book. Removing them left the campaign hub with no
 * way to have a perk at all — which is honest but less useful than the group
 * writing their own, provided the app says whose rule it is.
 *
 * The one thing that must not happen is a house rule wearing a published
 * label, so the Carcass Front Special Zones — which carry the book's own
 * Outpost Bonus verbatim — refuse the write.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { DEFAULT_WORLD_THEATERS } from '../seed';
import type { TerritoryNode } from '@/types/campaign';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const territories = (): TerritoryNode[] => useStore.getState().campaign.territories;
const find = (id: string) => territories().find((t) => t.id === id);

const PUBLISHED: TerritoryNode = {
  id: 'cf-kurd-dagh',
  name: 'Kurd Dagh',
  type: 'Special Zone',
  perk: 'A Warband holding this Zone may re-roll one Promotion roll after each battle.',
  perkSource: 'published',
  description: 'Scenario played here: Dragon Hunt.',
};

describe('a territory perk the campaign writes', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      campaign: {
        ...s.campaign,
        territories: [...DEFAULT_WORLD_THEATERS.map((t) => ({ ...t })), { ...PUBLISHED }],
        chronicleLogs: [],
      },
    }));
  });

  it('starts empty, because the app publishes none of its own', () => {
    for (const t of DEFAULT_WORLD_THEATERS) {
      expect(t.perk, t.id).toBe('');
      expect(t.perkSource, t.id).toBeUndefined();
    }
  });

  it('is written, and marked as the campaign’s rather than the book’s', () => {
    const target = DEFAULT_WORLD_THEATERS[0].id;
    const wrote = useStore.getState().setTerritoryPerk(
      target, 'The holder may re-roll one Exploration dice after each battle.');

    expect(wrote).toBe(true);
    expect(find(target)?.perk)
      .toBe('The holder may re-roll one Exploration dice after each battle.');
    expect(find(target)?.perkSource).toBe('campaign');
  });

  it('never overwrites a rule the book publishes', () => {
    /*
      The whole point. A Carcass Front Special Zone's Outpost Bonus is printed
      on the fold-out map and carried verbatim; letting a house rule replace it
      would put invented text back under a published label, which is the bug
      the sixteen removed perks were.
    */
    const wrote = useStore.getState().setTerritoryPerk('cf-kurd-dagh', 'Anything at all');

    expect(wrote).toBe(false);
    expect(find('cf-kurd-dagh')?.perk).toBe(PUBLISHED.perk);
    expect(find('cf-kurd-dagh')?.perkSource).toBe('published');
  });

  it('clears the label with the text, not leaving a house rule with nothing in it', () => {
    const target = DEFAULT_WORLD_THEATERS[1].id;
    useStore.getState().setTerritoryPerk(target, 'Something');
    expect(find(target)?.perkSource).toBe('campaign');

    useStore.getState().setTerritoryPerk(target, '   ');
    expect(find(target)?.perk).toBe('');
    expect(find(target)?.perkSource).toBeUndefined();
  });

  it('reports a territory that is not there rather than inventing one', () => {
    expect(useStore.getState().setTerritoryPerk('no-such-territory', 'x')).toBe(false);
    expect(territories()).toHaveLength(DEFAULT_WORLD_THEATERS.length + 1);
  });

  it('records the change in the chronicle, so the group can see who changed what', () => {
    const target = DEFAULT_WORLD_THEATERS[2].id;
    useStore.getState().setTerritoryPerk(target, 'Supply lines run free.');

    const log = useStore.getState().campaign.chronicleLogs[0];
    expect(log.category).toBe('territory');
    expect(log.text).toContain('Supply lines run free.');
    expect(log.text).toContain(DEFAULT_WORLD_THEATERS[2].name);
  });

  it('leaves every other territory alone', () => {
    const target = DEFAULT_WORLD_THEATERS[3].id;
    useStore.getState().setTerritoryPerk(target, 'Only here.');

    const others = territories().filter((t) => t.id !== target);
    expect(others.every((t) => t.perk !== 'Only here.')).toBe(true);
  });
});
