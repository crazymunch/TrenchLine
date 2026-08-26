export interface RuleDiffField {
  fieldName: string; // e.g. "baseCost", "stats.melee", "keywords"
  originalValue: any;
  userValue: any;
  upstreamValue: any;
  resolvedValue?: any;
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
