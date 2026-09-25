import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Warband } from '@/types/warband';
import { loadSharedWarband } from '@/lib/api/warbandLoader';
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
 * which is a control this page must not have. Putting the page in the group and
 * hiding them one by one is the version that regains a control the next time
 * somebody adds one to the layout.
 *
 * **404, never an empty sheet.** An unknown token and a cleared one are the
 * same answer, because `loadSharedWarband` returns null for both: "Stop
 * sharing" nulls the column, so the old link matches no row. A page that
 * rendered an empty sheet for a revoked link would tell the reader the roster
 * had been emptied rather than unshared.
 *
 * **Dynamic, never cached.** The token is a capability and the roster behind it
 * changes; a cached render would serve a stale roster and, worse, could serve it
 * after the share was stopped.
 */
export const dynamic = 'force-dynamic';

/**
 * `noindex` in the document as well as in the header.
 *
 * The header is in `next.config.mjs` and is the one that matters; this covers a
 * crawler that renders the HTML and reads the tag. Two mechanisms for one rule,
 * because what is at stake is somebody's roster in a search index that outlives
 * the share.
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
    is wider than `Warband` by three server-owned fields (`visibility`,
    `campaignMembers`, `creatorId`). The sheet reads none of them; the cast says
    so in one place rather than the sheet growing optional fields it will never
    use.
  */
  return <SharedRosterSheet warband={loaded as unknown as Warband} />;
}
