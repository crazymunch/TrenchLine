/**
 * A value on one side of a three-way rule diff.
 *
 * Every field this diff compares is a scalar off a rule record — a Ducat cost,
 * a dice modifier, an armour value, a name, a keyword list. `any` said "who
 * knows", which is how `updated.baseCost = field.upstreamValue` type-checked
 * while being able to assign a string to a number.
 *
 * `unknown` would be more honest still and is the wrong trade here: it forces
 * a narrowing at every render site, and the render sites only ever call
 * `String(...)` on these. The union types what the producer actually puts in
 * (`githubSync.ts`) and leaves the two numeric writers to narrow.
 */
export type RuleFieldValue = string | number | boolean | string[] | null;

export interface RuleDiffField {
  fieldName: string; // e.g. "baseCost", "stats.melee", "keywords"
  originalValue: RuleFieldValue;
  userValue: RuleFieldValue;
  upstreamValue: RuleFieldValue;
  resolvedValue?: RuleFieldValue;
  status: 'clean' | 'conflict' | 'resolved';
}

export interface RuleDiffItem {
  id: string;
  type: 'unit' | 'weapon' | 'armour' | 'equipment';
  name: string;
  factionId?: string;
  diffFields: RuleDiffField[];
  resolution: 'keep_user' | 'accept_upstream' | 'custom';
}

export interface SyncSession {
  repoUrl: string;
  branch: string;
  latestCommitSha: string;
  latestCommitMessage: string;
  syncedAt: string;
  pendingDiffs: RuleDiffItem[];
}
