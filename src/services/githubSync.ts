import { RuleDiffItem, RuleDiffField } from '../types/diff';
import { UnitProfile } from '../types/rules';
import { parseBattleScribeXml, ParsedCatalogue } from './xmlParser';

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

const GITHUB_REPO = 'Fawkstrot11/TrenchCrusade';
const RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/`;

export const GITHUB_CATALOG_FILES = [
  'New%20Antioch.cat',
  'Trench%20Pilgrims.cat',
  'Heretic%20Legion.cat',
  'Iron%20Sultanate.cat',
  'Black%20Grail.cat',
  'Court%20of%20the%20Seven-Headed%20Serpent.cat',
  'Mercenaries.cat',
  'Equipment.cat',
  'Melee%20Weapons.cat',
  'Ranged%20Weapons.cat',
  'Trench%20Crusade.gst'
];

/**
 * Fetch the most recent upstream commit.
 *
 * Throws on failure. It previously returned a fabricated commit — sha, message
 * and author invented — whenever the API call failed, and presented it to the
 * user as a real upstream sync. Never substitute plausible-looking data for a
 * failed fetch; surface the failure. See docs/AUDIT.md 1.8.
 */
export async function fetchLatestRepoCommit(repo = GITHUB_REPO): Promise<GitHubCommit | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`);
  if (!res.ok) {
    throw new Error(
      `Could not reach the GitHub API (HTTP ${res.status}). ` +
        `Note that api.github.com is unreachable from some networks; ` +
        `raw.githubusercontent.com is used for catalogue files for that reason.`
    );
  }
  const commits = await res.json();
  return commits[0] ?? null;
}

export async function fetchRemoteCatalogFile(fileName: string): Promise<string | null> {
  try {
    const res = await fetch(`${RAW_BASE_URL}${fileName}`);
    if (!res.ok) throw new Error(`Failed to load ${fileName}: ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`Error fetching ${fileName} from GitHub raw:`, err);
    return null;
  }
}

export async function fetchAndParseAllRemoteCatalogs(): Promise<ParsedCatalogue[]> {
  const results: ParsedCatalogue[] = [];
  
  for (const fileName of GITHUB_CATALOG_FILES) {
    const xml = await fetchRemoteCatalogFile(fileName);
    if (xml) {
      try {
        const parsed = parseBattleScribeXml(xml);
        results.push(parsed);
      } catch (e) {
        console.error(`Error parsing XML for ${fileName}:`, e);
      }
    }
  }

  return results;
}

export function generateDiffs(
  baseUnits: UnitProfile[],
  userUnits: UnitProfile[],
  upstreamUnits: UnitProfile[]
): RuleDiffItem[] {
  const diffItems: RuleDiffItem[] = [];

  upstreamUnits.forEach((upstream) => {
    const user = userUnits.find((u) => u.id === upstream.id) || upstream;
    const base = baseUnits.find((u) => u.id === upstream.id) || upstream;

    const fields: RuleDiffField[] = [];

    // Check Base Cost
    if (user.baseCost !== upstream.baseCost || base.baseCost !== upstream.baseCost) {
      fields.push({
        fieldName: 'Ducat Cost',
        originalValue: base.baseCost,
        userValue: user.baseCost,
        upstreamValue: upstream.baseCost,
        status: user.baseCost !== upstream.baseCost ? 'conflict' : 'clean'
      });
    }

    // Check Melee Stat
    if (user.stats.melee !== upstream.stats.melee || base.stats.melee !== upstream.stats.melee) {
      fields.push({
        fieldName: 'Melee Modifier',
        originalValue: base.stats.melee,
        userValue: user.stats.melee,
        upstreamValue: upstream.stats.melee,
        status: user.stats.melee !== upstream.stats.melee ? 'conflict' : 'clean'
      });
    }

    // Check Ranged Stat
    if (user.stats.ranged !== upstream.stats.ranged || base.stats.ranged !== upstream.stats.ranged) {
      fields.push({
        fieldName: 'Ranged Modifier',
        originalValue: base.stats.ranged,
        userValue: user.stats.ranged,
        upstreamValue: upstream.stats.ranged,
        status: user.stats.ranged !== upstream.stats.ranged ? 'conflict' : 'clean'
      });
    }

    // Check Armour Stat
    if (user.stats.armour !== upstream.stats.armour || base.stats.armour !== upstream.stats.armour) {
      fields.push({
        fieldName: 'Armour Stat',
        originalValue: base.stats.armour,
        userValue: user.stats.armour,
        upstreamValue: upstream.stats.armour,
        status: user.stats.armour !== upstream.stats.armour ? 'conflict' : 'clean'
      });
    }

    if (fields.length > 0) {
      diffItems.push({
        id: upstream.id,
        type: 'unit',
        name: upstream.name,
        factionId: upstream.factionId,
        diffFields: fields,
        resolution: 'keep_user'
      });
    }
  });

  return diffItems;
}

/**
 * How far the shipped rules have drifted from upstream.
 *
 * The Customizer used to answer a different question. It fetched upstream's
 * latest commit and printed the SHA and message — true, but useless on its own,
 * because nothing said whether the app was built from that commit or from one
 * six months older. A reader could not tell "we are current" from "we are a
 * release behind" without going and looking.
 *
 * `dataset.meta.baseCommit` is what `rules:fetch` pinned, so the comparison is
 * available and cheap: one call to GitHub's compare API, no re-parsing eleven
 * catalogues in a phone browser.
 *
 * The number that matters is not the commit count. Upstream commits README
 * edits and roster files like anyone else, so "42 commits behind" says nothing
 * about whether the *rules* moved. What matters is which of the pinned
 * catalogue files changed — `dataset.meta.baseFiles`, which is the fetch
 * manifest's own list rather than a copy kept by hand.
 */
export interface UpstreamFreshness {
  /** The commit the shipped dataset was built from. */
  baseCommit: string;
  /** Upstream's current head. */
  headCommit: string;
  /** Commits upstream has that the pinned base does not. */
  commitsBehind: number;
  /** Pinned catalogue files changed since the base commit. */
  catalogueFilesChanged: string[];
  /** Files upstream changed that this dataset does not pin — context, not a prompt. */
  otherFilesChanged: number;
  /** When upstream's head was authored. */
  headDate: string | null;
  /** True when nothing this dataset is built from has moved. */
  current: boolean;
}

/**
 * Compare the pinned commit against upstream's head.
 *
 * Throws on any failure rather than reporting "up to date", which would be the
 * same lie the fabricated commit told: a check that cannot run must say so, or
 * it silently certifies stale rules as current (docs/AUDIT.md 1.8).
 */
export async function compareToUpstream(
  baseCommit: string,
  baseFiles: string[],
  repo = GITHUB_REPO
): Promise<UpstreamFreshness> {
  if (!baseCommit) {
    throw new Error('This ruleset records no base commit, so it cannot be compared to upstream.');
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/compare/${baseCommit}...HEAD`);
  if (!res.ok) {
    throw new Error(
      `Could not compare against ${repo} (HTTP ${res.status}). `
      + 'The rules shipped with this build are unchanged; only the freshness '
      + 'check failed.'
    );
  }

  const body = await res.json() as {
    ahead_by?: number;
    commits?: { sha: string; commit?: { author?: { date?: string } } }[];
    files?: { filename: string }[];
  };

  /*
    GitHub caps `files` at 300 per compare and paginates beyond that. A truncated
    list would under-report changed catalogues, and under-reporting here reads as
    "your rules are fine" — so it is refused rather than trusted.
  */
  const changed = body.files ?? [];
  if (changed.length >= 300) {
    throw new Error(
      `Upstream has changed ${changed.length}+ files since this build, which is `
      + 'more than the compare API returns in one page. Run `npm run rules:crosscheck` '
      + 'rather than trusting a partial answer.'
    );
  }

  const pinned = new Set(baseFiles);
  const changedNames = changed.map((f) => f.filename.split('/').pop() ?? f.filename);
  const catalogueFilesChanged = [...new Set(changedNames.filter((n) => pinned.has(n)))].sort();

  const commits = body.commits ?? [];
  const head = commits[commits.length - 1];

  return {
    baseCommit,
    headCommit: head?.sha ?? baseCommit,
    commitsBehind: body.ahead_by ?? commits.length,
    catalogueFilesChanged,
    otherFilesChanged: changedNames.length - catalogueFilesChanged.length,
    headDate: head?.commit?.author?.date ?? null,
    current: catalogueFilesChanged.length === 0,
  };
}
