/**
 * The rewards a roster says it holds.
 *
 * The importer dropped the whole `Campaign Rules > Enabled` subtree with the
 * rest of the Configuration nodes, so a Warband that had earned the Book of
 * Golems, a Ransacked Alchemist Workshop and a Reroll imported as though it
 * had earned nothing — and nothing downstream could tell a Golem from an
 * ordinary Homunculus.
 *
 * Driven against BOTH of the owner's exports, because the pair is the
 * evidence: the September file carries one reward the August file does not,
 * and it is the one that explains the other difference between them.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { readCampaignRules, importNewRecruitRoster } from '../newRecruitImporter';
import type { Dataset } from '@/types/catalogue';

const read = (name: string) => JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'data-sources/fixtures/newrecruit', name), 'utf8'));

const AUGUST = readCampaignRules(read('al-qarn-rihla-august.json'));
const SEPTEMBER = readCampaignRules(read('al-qarn-rihla-september.json'));

describe('the August export', () => {
  it('names the rewards the Warband held', () => {
    expect(AUGUST).toEqual(
      ['Book of Golems', 'Sublime Gate', 'Unleveraged Glory', 'Reroll']);
  });

  /* The Patron, which FD-15 makes a required field. */
  it('carries the Patron among them', () => {
    expect(AUGUST).toContain('Sublime Gate');
  });
});

describe('the September export', () => {
  it('holds everything August did', () => {
    for (const r of AUGUST) expect(SEPTEMBER).toContain(r);
  });

  /*
    And exactly one more. The Ransacked Alchemist Workshop is the reward that
    removed the Jabirean Alchemist's `Leg Wound [31]` between the two files —
    so the subtree explains the roster diff rather than merely accompanying it.
  */
  it('adds the Ransacked Alchemist Workshop, and nothing else', () => {
    const added = SEPTEMBER.filter((r) => !AUGUST.includes(r));
    expect(added).toEqual(['Ransacked Alchemist Workshop']);
  });
});

describe('a roster with no such subtree', () => {
  it('reports none rather than guessing', () => {
    expect(readCampaignRules({})).toEqual([]);
    expect(readCampaignRules(null)).toEqual([]);
    expect(readCampaignRules({ roster: { selections: [] } })).toEqual([]);
  });
});

/**
 * And through the `.ros` path, which reaches it by a different route.
 *
 * `parseNewRecruitXml` converts the document and hands it to the JSON parser
 * rather than walking it again, so the subtree is read once, there. This
 * asserts that the delegation actually carries it — the first version of this
 * change read it a second time in the XML path, and the second read was dead
 * code that lint caught and this test would not have.
 */
describe('the same roster as `.ros`', () => {
  const D = DATASET as unknown as Dataset;
  const KNOWN = recruitable(D, 'iron-sultanate',
    (D.armouries ?? []).map((a: { factionId: string }) => a.factionId)).units;

  it('reports the same rewards as the JSON export', () => {
    const ros = fs.readFileSync(path.join(
      process.cwd(), 'data-sources/fixtures/newrecruit/al-qarn-rihla-august.ros'), 'utf8');
    const res = importNewRecruitRoster(ros, KNOWN as never);
    expect(res.campaignRules).toEqual(AUGUST);
  });
});
