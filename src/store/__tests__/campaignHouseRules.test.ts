/**
 * A house rule the campaign chooses, and the published rule it relaxes.
 *
 * The Campaign Phase is six steps and the post-battle wizard covered four of
 * them, with no Reinforcements Step at all — so a player who called for
 * reinforcements was still offered the Exploration roll the book takes away
 * for it. The wizard has the step now, and warns rather than blocks: the
 * maintainer's group plays the campaign loosely, and a wizard that refuses to
 * continue is one people abandon halfway.
 *
 * This is the organiser's side of it. A campaign can record that it does NOT
 * give up Exploration and the Quartermaster, and the wizard then presents the
 * choice as the group's own rule rather than as a rule being set aside.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';
import type { Campaign } from '@/types/campaign';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const campaign = () => useStore.getState().campaign;
const set = (v: boolean | undefined) =>
  useStore.getState().setCampaignHouseRule('reinforcementsKeepExploration', v);

describe('a campaign house rule', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      campaign: {
        ...s.campaign,
        id: 'camp-1',
        name: 'Test Crusade',
        houseRules: undefined,
        chronicleLogs: [],
      } as Campaign,
    }));
  });

  it('is absent until the organiser sets one', () => {
    expect(campaign().houseRules).toBeUndefined();
  });

  it('records the rule, and says so in the chronicle', () => {
    expect(set(true)).toBe(true);
    expect(campaign().houseRules?.reinforcementsKeepExploration).toBe(true);
    expect(campaign().chronicleLogs[0].text).toMatch(/House rule set/);
    expect(campaign().chronicleLogs[0].text).toMatch(/Exploration and Quartermaster/);
  });

  it('clears back to absent rather than to false', () => {
    /*
      A campaign that turned a rule on and off again must be indistinguishable
      from one that never touched it — otherwise `houseRules` accumulates
      `false` entries and "this campaign has house rules" stops meaning
      anything.
    */
    set(true);
    expect(set(undefined)).toBe(true);
    expect(campaign().houseRules).toBeUndefined();
    expect(campaign().chronicleLogs[0].text).toMatch(/House rule cleared/);
  });

  it('does not log a change that changes nothing', () => {
    set(true);
    const logs = campaign().chronicleLogs.length;
    expect(set(true)).toBe(true);
    expect(campaign().chronicleLogs).toHaveLength(logs);
  });

  it('refuses where there is no campaign to write to', () => {
    useStore.setState((s) => ({ campaign: { ...s.campaign, id: '' } as Campaign }));
    expect(set(true)).toBe(false);
  });
});
