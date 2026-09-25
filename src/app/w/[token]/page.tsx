import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Warband } from '@/types/warband';
import { loadSharedWarband } from '@/lib/api/warbandLoader';
import { loadDataset, rulesetForWarband } from '@/lib/serverDataset';
import { rosterSheet } from '@/rules/rosterSheet';
import { rulesetInfo } from '@/rules/rulesets';
import { SharedRosterSheet } from './SharedRosterSheet';

/**
 * A warband at a share link (SH-1).
 *
 * > Trench Companion's share link is the thing people paste into the group
 * > chat. Ours has nothing to paste.
 *
 * `/w/<token>` renders the Roster Sheet from FD-12, read only: no builder
 * controls, no session required, and `noindex`.
 *
 * **Outside `(app)`, on purpose.** The app group's layout carries the
 * navigation rail, the bottom bar, the sync banner and the store — every one of
 * which is a control this page must not have.
 *
 * **404, never an empty sheet.** An unknown token and a cleared one are the
 * same answer, because `loadSharedWarband` returns null for both: "Stop
 * sharing" nulls the column, so the old link matches no row.
 *
 * ## The sheet is projected HERE, on the server
 *
 * Review round 1, finding A, and it was a real disclosure. The first version
 * handed the loader's whole object to a `'use client'` component as a prop —
 * and a client component's props are **serialised into the HTML**. Passing
 * `includePrivate={false}` hid those fields on the page and did nothing at all
 * about them being sent: view-source on a shared roster carried the owner's
 * private notes, every model's notes, quote and lore, the `chronicleLog`, the
 * `snapshots` whose labels name opponents, the `ledger` including the
 * `byUserId` and `byName` of admin entries — **another user's data** — plus
 * `campaignMembers` and `creatorId`, all under a page that said the player's
 * private notes are not shared.
 *
 * So the projection runs on the server and the client is handed the
 * `RosterSheetModel` and nothing else. That model is a **rendering** of the
 * roster: it carries what the printed sheet prints. `rosterSheet.test.ts`
 * asserts that nothing private reaches it, because "we checked once" is not a
 * property a page keeps.
 *
 * **The ruleset is the warband's own** (`rulesetId`, RV-1), not the reader's
 * and not the server's default — a shared roster is the owner's roster, and
 * whichever edition the reader's browser happens to be set to is not a fact
 * about it. Where none is recorded the published default is used and the page
 * says so, because absent means *not recorded*, never *the default*.
 *
 * **Dynamic, never cached.** The token is a capability and the roster behind it
 * changes; a cached render would serve a stale roster and, worse, could serve
 * it after the share was stopped.
 */
export const dynamic = 'force-dynamic';

/**
 * `noindex` in the document as well as in the header.
 *
 * The header (`next.config.mjs`) is the one that matters; this covers a crawler
 * that renders the HTML and reads the tag. What is at stake is somebody's
 * roster in a search index that outlives the share.
 *
 * The title carries the warband's name so a pasted link previews as something
 * recognisable in a chat, and nothing else: no player name, no account, and no
 * description that would put the roster's contents into a link preview.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params;
  const warband = await loadSharedWarband(token);
  return {
    title: warband ? `${warband.name} — Warband Roster Sheet` : 'Roster not found',
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function SharedWarbandPage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const loaded = await loadSharedWarband(token);
  if (!loaded) notFound();

  /*
    The loader's shape is the sync's shape, which is what SH-1 asks for — and it
    is wider than `Warband` by the server-owned fields. Nothing below leaves
    this function except the projection.
  */
  const warband = loaded as unknown as Warband;

  const ruleset = rulesetForWarband(warband);
  const dataset = await loadDataset(ruleset.id);

  /*
    A ruleset the build cannot load is reported, never substituted (rule 2). The
    sheet without one has no Threshold table, no Experience track and no faction
    name, and filling those in from anywhere else is the fabrication this
    project deleted `githubSync.ts` over.
  */
  if (!dataset) {
    return (
      <SharedRosterSheet
        name={warband.name}
        sheet={null}
        rulesetName={rulesetInfo(ruleset.id)?.name ?? ruleset.id}
        rulesetRecorded={ruleset.recorded}
      />
    );
  }

  const sheet = rosterSheet(warband, {
    dataset,
    /* No campaign: this reader has none, and the sheet leaves CAMPAIGN BATTLE
       blank rather than naming one it cannot verify. */
    campaign: null,
    /* The player's own writing is not shared. `presentRoster` applies it, and
       with the projection on the server the fields never leave the process. */
    includePrivate: false,
  });

  return (
    <SharedRosterSheet
      name={warband.name}
      sheet={sheet}
      rulesetName={rulesetInfo(ruleset.id)?.name ?? ruleset.id}
      rulesetRecorded={ruleset.recorded}
    />
  );
}
