/**
 * The Carcass Front Exploration branch (RR-09, FD-10).
 *
 * `resolveCarcassFrontExploration`, `hasThreeOfAKind` and
 * `carcassFrontResources` have been in `rules/campaign.ts` since the supplement
 * landed and **nothing called any of them**. A Carcass Front campaign ran the
 * rulebook's Exploration Step, which is a different step in four ways:
 *
 *   the pool     3D6, fixed — the rulebook's grows to 6D6 with games played
 *   the loot     the roll × 5 — the rulebook pays × 10
 *   the table    chosen by Resource — the rulebook bands it by rarity
 *   who rolls    only the Aggressor consults a table at all
 *
 * The first two compound: a late-campaign Warband rolled six dice and was paid
 * ten a point, against three dice and five a point. These assert the rates
 * against the shipped dataset, and that the branch the wizard takes is the one
 * the framework names — never the rulebook's tables under a Carcass Front
 * campaign, which is the substitution the whole finding is about.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

import { DATASET } from '@/data/generated/trenchline.generated';
import BASE from '@/data/generated/github-latest.generated';
import type { Dataset } from '@/types/catalogue';
import {
  resolveCarcassFrontExploration, carcassFrontResources, hasThreeOfAKind,
  resolveExploration, explorationDice,
  CARCASS_FRONT_LOOT_PER_POINT, CARCASS_FRONT_STARTING_DICE,
} from '../campaign';
import { frameworkOf } from '../campaignFramework';
import { CarcassFrontExploration } from '@/components/campaign/CarcassFrontExploration';

const dataset = DATASET as unknown as Dataset;
/* `github-latest` is the community catalogues as published: no supplement. */
const withoutSupplement = BASE as unknown as Dataset;

describe('the framework decides which step runs', () => {
  it('names the Carcass Front campaign, and defaults to the classic one', () => {
    expect(frameworkOf({ framework: 'carcass-front' })).toBe('carcass-front');
    expect(frameworkOf({})).toBe('classic');
    expect(frameworkOf(undefined)).toBe('classic');
  });
});

describe('the Carcass Front tables', () => {
  it('are carried by the ruleset that has the supplement, and by no other', () => {
    expect(carcassFrontResources(dataset).length).toBeGreaterThan(0);
    expect(carcassFrontResources(withoutSupplement)).toEqual([]);
  });

  it('are chosen by Resource, not by a rarity band', () => {
    /* The rulebook's three bands are `common`, `rare`, `legendary`. None of
       them is a Resource, which is what makes substituting one step for the
       other silently wrong rather than loudly wrong. */
    const resources = carcassFrontResources(dataset);
    expect(resources).not.toContain('common');
    expect(resources).not.toContain('rare');
    expect(resources).not.toContain('legendary');
  });
});

describe('the rate', () => {
  const roll = 11;

  it('pays the roll times five, where the rulebook pays ten', () => {
    const resource = carcassFrontResources(dataset)[0];
    const cf = resolveCarcassFrontExploration(dataset, { roll, resource })!;
    const classic = resolveExploration(dataset, roll, 'common')!;

    expect(cf.loot).toBe(roll * CARCASS_FRONT_LOOT_PER_POINT);
    expect(classic.loot).toBe(roll * 10);
    expect(cf.loot).toBe(classic.loot / 2);
  });

  /*
    And the pool does not grow. Put together with the rate, a Warband ten games
    into a Carcass Front campaign was rolling the rulebook's larger pool and
    being paid the rulebook's higher rate.
  */
  it('rolls three dice however many games have been played', () => {
    expect(CARCASS_FRONT_STARTING_DICE).toBe(3);
    expect(explorationDice(dataset, 10) ?? 0).toBeGreaterThan(CARCASS_FRONT_STARTING_DICE);
  });
});

describe('who consults a table', () => {
  it('gives the Aggressor a Location from the Resource they name', () => {
    const resource = carcassFrontResources(dataset)[0];
    const out = resolveCarcassFrontExploration(dataset, { roll: 8, resource })!;
    expect(out.resource).toBe(resource);
    expect(out.location).not.toBeNull();
  });

  it('gives the other player the loot and no table', () => {
    const out = resolveCarcassFrontExploration(dataset, { roll: 8, resource: null })!;
    expect(out.resource).toBeNull();
    expect(out.location).toBeNull();
    /* They still collect: the loot is not the Aggressor's alone. */
    expect(out.loot).toBe(8 * CARCASS_FRONT_LOOT_PER_POINT);
  });

  it('reports three of a kind, which is how they find Rudolf’s Folly', () => {
    expect(hasThreeOfAKind([4, 4, 4])).toBe(true);
    expect(hasThreeOfAKind([4, 4, 5])).toBe(false);
    const out = resolveCarcassFrontExploration(
      dataset, { roll: 12, dice: [4, 4, 4], resource: null })!;
    expect(out.rudolfsFolly).toBe(true);
  });

  /* Null, not false: the dice were not recorded, so the question is unanswered
     rather than answered in the negative. */
  it('says nothing about three of a kind when the dice were not kept', () => {
    const out = resolveCarcassFrontExploration(dataset, { roll: 12, resource: null })!;
    expect(out.rudolfsFolly).toBeNull();
  });
});

describe('the panel the wizard renders', () => {
  const render = (d: Dataset) => renderToStaticMarkup(
    React.createElement(CarcassFrontExploration, {
      dataset: d,
      alreadyDiscovered: [],
      onLoot: () => {},
      onDiscovered: () => {},
    }));

  it('states the supplement’s pool and rate, from the dataset', () => {
    const html = render(dataset);
    expect(html).toContain(`${CARCASS_FRONT_STARTING_DICE}D6`);
    expect(html).toContain(`\u00d7 ${CARCASS_FRONT_LOOT_PER_POINT}`);
  });

  it('offers the Resources the supplement prints, and no rarity band', () => {
    const html = render(dataset);
    for (const r of carcassFrontResources(dataset)) expect(html).toContain(r);
    expect(html).not.toContain('Common Table');
    expect(html).not.toContain('Legendary Table');
  });

  /*
    Rule 2, and the reason this panel exists at all: a ruleset without the
    supplement gets a refusal, never the rulebook's tables at the rulebook's
    rate under a Carcass Front campaign.
  */
  it('refuses rather than falling back when the ruleset has no such tables', () => {
    const html = render(withoutSupplement);
    expect(html).toContain('NO CARCASS FRONT TABLES');
    expect(html).not.toContain('Roll Scavenge');
  });
});
