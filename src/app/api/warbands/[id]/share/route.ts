import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { handle } from '@/lib/api/http';
import { requireActor, requireOwnedWarband } from '@/lib/api/policy';

/**
 * The share token for one warband: read it, mint it, clear it (SH-1).
 *
 * > A nullable, unique `shareToken` column on the synced warband record, set by
 * > a "Share" action in the builder and cleared by "Stop sharing". Random, not
 * > derived from the id.
 *
 * Three handlers, one resource:
 *
 *   `GET`    whether this roster is shared, and the token if it is.
 *   `POST`   share it. Idempotent: an already-shared roster keeps its token, so
 *            a second tap on Share does not invalidate the link somebody has
 *            already pasted into the group chat.
 *   `DELETE` stop sharing. Sets the column to NULL, which makes the old link
 *            match no row at all — see `loadSharedWarband`.
 *
 * **Every handler requires the owner.** The token is a capability: whoever holds
 * it reads the roster with no session, so deciding that the roster has one is a
 * decision only its owner may make. `requireOwnedWarband` decides, and its two
 * refusals carry identical bodies (`http.ts`), so neither describes the roster to
 * a caller who should not see it.
 *
 * **A local-only warband has no row here**, so it 404s — which is the honest
 * answer and the one the builder turns into "sharing needs the warband in the
 * cloud". The refusal is not invented in the client: the client asks and this
 * says no.
 */

/**
 * 192 bits, base64url.
 *
 * Random, never derived from the id, and that is the whole security property of
 * the feature: `warbandCode(id)` is derived from the id and is printed in the
 * builder for anybody to read out, so a token derived the same way would make
 * every roster in the database publicly readable the moment one person shared
 * theirs.
 *
 * 192 bits rather than 128 because the token is the only thing between a URL
 * and somebody's roster, it is never typed by hand, and the extra eight
 * characters cost nothing at all.
 */
const mintToken = () => randomBytes(24).toString('base64url');

/** How the builder and the tests refer to a shared roster. */
const shareBody = (token: string | null) => ({
  shared: token !== null,
  token,
  /*
    The path, not an absolute URL. The origin belongs to whoever is serving the
    page — a preview deployment, a local run, the site — and a server-side guess
    at it is how a share link ends up pointing at the wrong host.
  */
  path: token ? `/w/${token}` : null,
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle('warbands.share.GET', async () => {
    const { id } = await params;
    const actor = await requireActor();
    await requireOwnedWarband(id, actor);

    const row = await prisma.warband.findUnique({
      where: { id }, select: { shareToken: true },
    });
    return NextResponse.json(shareBody(row?.shareToken ?? null));
  });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle('warbands.share.POST', async () => {
    const { id } = await params;
    const actor = await requireActor();
    await requireOwnedWarband(id, actor);

    const existing = await prisma.warband.findUnique({
      where: { id }, select: { shareToken: true },
    });
    /*
      Idempotent. Re-minting on every Share would quietly break a link the
      player had already sent, and they would have no way to know: the old URL
      would 404 with nothing to say why.
    */
    if (existing?.shareToken) return NextResponse.json(shareBody(existing.shareToken));

    const updated = await prisma.warband.update({
      where: { id },
      data: { shareToken: mintToken() },
      select: { shareToken: true },
    });
    return NextResponse.json(shareBody(updated.shareToken));
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle('warbands.share.DELETE', async () => {
    const { id } = await params;
    const actor = await requireActor();
    await requireOwnedWarband(id, actor);

    await prisma.warband.update({ where: { id }, data: { shareToken: null } });
    return NextResponse.json(shareBody(null));
  });
}
