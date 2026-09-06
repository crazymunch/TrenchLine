/**
 * How far the shipped rules have drifted from upstream.
 *
 * The Customizer's "Check GitHub Updates" button used to fetch upstream's head
 * and print its SHA and message. True, and unusable: nothing on the screen said
 * which commit the build was pinned to, so a reader could not tell "current"
 * from "a release behind". `dataset.meta.baseCommit` was there the whole time.
 *
 * The tests that matter here are the refusals. A freshness check that answers
 * "up to date" when it could not really tell is the same failure as the
 * fabricated commit this module used to return (docs/AUDIT.md 1.8) — worse, if
 * anything, because a wrong "current" is what stops someone looking.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { compareToUpstream } from '../githubSync';

const BASE = '1b463a8e2eaafc9d6722ae6eeda93e296fb7012b';
const FILES = ['Campaign Rules.cat', 'New Antioch.cat', 'Trench Crusade.gst'];

const reply = (body: unknown, ok = true, status = 200) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: async () => body,
  }));
};

const commits = (n: number) => Array.from({ length: n }, (_, i) => ({
  sha: `sha${i}`,
  commit: { author: { date: '2026-09-01T00:00:00Z' } },
}));

afterEach(() => vi.unstubAllGlobals());

describe('compareToUpstream', () => {
  it('reports current when no pinned catalogue moved', async () => {
    reply({ ahead_by: 12, commits: commits(12), files: [{ filename: 'README.md' }] });

    const f = await compareToUpstream(BASE, FILES);
    expect(f.current).toBe(true);
    expect(f.catalogueFilesChanged).toEqual([]);
    // The commit count is still reported — it is context, not the verdict.
    expect(f.commitsBehind).toBe(12);
    expect(f.otherFilesChanged).toBe(1);
  });

  it('is not fooled into "behind" by upstream commits that miss the rules', async () => {
    // Upstream commits READMEs and roster files like anyone else. Counting
    // commits rather than changed catalogues would cry wolf on every one.
    reply({
      ahead_by: 40,
      commits: commits(40),
      files: [{ filename: 'README.md' }, { filename: 'rosters/someones-list.rosz' }],
    });
    expect((await compareToUpstream(BASE, FILES)).current).toBe(true);
  });

  it('names the pinned catalogues that changed', async () => {
    reply({
      ahead_by: 3,
      commits: commits(3),
      files: [
        { filename: 'New Antioch.cat' },
        { filename: 'Campaign Rules.cat' },
        { filename: 'README.md' },
      ],
    });

    const f = await compareToUpstream(BASE, FILES);
    expect(f.current).toBe(false);
    expect(f.catalogueFilesChanged).toEqual(['Campaign Rules.cat', 'New Antioch.cat']);
    expect(f.otherFilesChanged).toBe(1);
  });

  it('counts Campaign Rules.cat, which the old hand-kept list omitted', async () => {
    // The app's own copy of the file list had drifted from the fetch manifest,
    // so an upstream change to the injury, skill or exploration tables was
    // invisible. The list now comes from `dataset.meta.baseFiles`.
    reply({ ahead_by: 1, commits: commits(1), files: [{ filename: 'Campaign Rules.cat' }] });
    expect((await compareToUpstream(BASE, FILES)).catalogueFilesChanged)
      .toEqual(['Campaign Rules.cat']);
  });

  it('matches on the file name, not the repository path', async () => {
    reply({ ahead_by: 1, commits: commits(1), files: [{ filename: 'catalogues/New Antioch.cat' }] });
    expect((await compareToUpstream(BASE, FILES)).catalogueFilesChanged)
      .toEqual(['New Antioch.cat']);
  });

  it('does not double-count a file touched by several commits', async () => {
    reply({
      ahead_by: 2,
      commits: commits(2),
      files: [{ filename: 'New Antioch.cat' }, { filename: 'New Antioch.cat' }],
    });
    expect((await compareToUpstream(BASE, FILES)).catalogueFilesChanged)
      .toEqual(['New Antioch.cat']);
  });

  /* ------------------------------------------------------------- refusals */

  it('throws rather than reporting current when the API fails', async () => {
    reply({}, false, 503);
    await expect(compareToUpstream(BASE, FILES)).rejects.toThrow(/HTTP 503/);
  });

  it('says the rules themselves are fine when only the check failed', async () => {
    // The distinction a reader needs: a failed check is not a stale ruleset.
    reply({}, false, 403);
    await expect(compareToUpstream(BASE, FILES))
      .rejects.toThrow(/rules shipped with this build are unchanged/);
  });

  it('refuses a truncated file list rather than under-reporting', async () => {
    /*
      GitHub caps `files` at 300 per compare. A truncated list can only ever
      miss changed catalogues, and missing one reads as "your rules are fine" —
      the one wrong answer this check must never give.
    */
    reply({
      ahead_by: 900,
      commits: commits(5),
      files: Array.from({ length: 300 }, (_, i) => ({ filename: `f${i}.txt` })),
    });
    await expect(compareToUpstream(BASE, FILES)).rejects.toThrow(/more than the compare API returns/);
  });

  it('refuses to compare a ruleset that records no base commit', async () => {
    reply({ ahead_by: 0, commits: [], files: [] });
    await expect(compareToUpstream('', FILES)).rejects.toThrow(/records no base commit/);
  });
});
