/**
 * The contract between the account route, its confirmation sheet and its tests.
 *
 * Not in the route file, and this is a Next.js constraint rather than a
 * preference: a `route.ts` may export the HTTP verbs and a short list of
 * config fields, and nothing else. Exporting a constant from one is a build
 * error — `"CONFIRMATION" is not a valid Route export field` — which `tsc
 * --noEmit` does not report, because the rule belongs to Next's own route type
 * check. The build is the only place it shows up.
 *
 * Sharing it beats keeping a copy in the client anyway: the word the sheet
 * asks you to type and the word the server insists on are now the same
 * literal, so they cannot drift into a form that is impossible to submit.
 */

/**
 * The word the caller types to confirm deleting their account.
 *
 * A typed word rather than a checkbox: this is the one irreversible action in
 * the application, and a click is something a thumb does by accident on a
 * phone. Compared case-sensitively — "delete" is what you type when you are
 * dismissing a dialog, "DELETE" is what you type when you mean it.
 */
export const CONFIRMATION = 'DELETE';

/** What deleting an account would destroy. Rendered before anything is. */
export interface DeletionSummary {
  email: string | null;
  warbands: number;
  /** Campaigns this account ADMINISTERS. These are destroyed with it. */
  administeredCampaigns: { name: string; otherMembers: number }[];
  /** Campaigns this account merely plays in. Only the membership is removed. */
  memberships: number;
  customRules: number;
  /** Reports that stay, unlinked. Named so the summary is not a half-truth. */
  bugReportsKeptAnonymously: number;
}
