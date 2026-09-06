import { NextRequest, NextResponse } from 'next/server';
import {
  clientMetadata,
  clientFieldsOf,
  metadataOf,
} from '@/lib/api/warbandMetadata';
import { Prisma, WarbandVisibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { abort, badRequest, forbidden, handle } from '@/lib/api/http';
import { currentActor, requireActor } from '@/lib/api/policy';
import { readJson } from '@/lib/api/parse';

/**
 * What the public Warband Directory is allowed to say about a roster.
 *
 * An allowlist, and a separate query — not a broad `include` with sensitive
 * keys deleted afterwards. The directory used to select `user.email` and
 * return the complete roster: every unit, the armoury stash, private notes,
 * lore, patron, the chronicle log, campaign snapshots, the owner's user id,
 * and the sync timestamps. `creatorName` fell back to the owner's **email
 * address** when they had no display name.
 *
 * A projection that starts narrow cannot drift into disclosure; one that
 * starts wide and subtracts does, the first time a field is added to the
 * model and nobody remembers this file exists.
 */
interface PublicWarband {
  id: string;
  name: string;
  factionId: string;
  ducatLimit: number;
  gloryPoints: number;
  /** A display name, or a neutral fallback. NEVER an email address. */
  creatorName: string;
  /** How many models, rather than the models themselves. */
  modelCount: number;
  motto?: string;
  createdAt: string;
}

/** The columns the directory reads. Nothing here is private. */
const PUBLIC_SELECT = {
  id: true, name: true, factionId: true, ducatLimit: true, gloryPoints: true,
  units: true, notes: true, createdAt: true,
  user: { select: { name: true } },
} as const;


function toPublic(wb: {
  id: string; name: string; factionId: string; ducatLimit: number; gloryPoints: number;
  units: unknown; notes: string | null; createdAt: Date; user: { name: string | null } | null;
}): PublicWarband {
  const metadata = metadataOf(wb.notes);
  return {
    id: wb.id,
    name: wb.name,
    factionId: wb.factionId,
    ducatLimit: wb.ducatLimit,
    gloryPoints: wb.gloryPoints,
    // The owner's email was the fallback here. It is not a display name.
    creatorName: wb.user?.name || 'Crusade Commander',
    modelCount: Array.isArray(wb.units) ? wb.units.length : 0,
    motto: typeof metadata.motto === 'string' ? metadata.motto : undefined,
    createdAt: wb.createdAt.toISOString(),
  };
}

/**
 * The row shape the owner query returns, for `toOwn`.
 *
 * Named rather than `Record<string, any>`: the `any` meant nothing checked
 * that the fields read below existed, in the one function whose job is to
 * hand a player their whole roster back.
 */
interface OwnRow {
  id: string;
  name: string;
  factionId: string;
  ducatLimit: number;
  treasuryDucats: number;
  gloryPoints: number;
  units: unknown;
  armoryStash: unknown;
  visibility: string;
  notes: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null } | null;
  campaignMembers: unknown[];
}

/** The full roster, for its owner. Unchanged in shape — this is a restore. */
function toOwn(wb: OwnRow) {
  const metadata = metadataOf(wb.notes);
  return {
    id: wb.id,
    name: wb.name,
    factionId: wb.factionId,
    ducatLimit: wb.ducatLimit,
    treasuryDucats: wb.treasuryDucats,
    gloryPoints: wb.gloryPoints,
    units: wb.units,
    armoryStash: wb.armoryStash,
    visibility: wb.visibility,
    notes: (metadata.rawNotes as string) ?? (wb.notes?.startsWith('{') ? '' : wb.notes ?? ''),
    /*
      Every client-owned field, from the one list. `editedAt` is among them —
      the sync merge compares it and nothing else; see services/sync.ts for why
      `updatedAt` could not do that job.

      Deliberately NOT spread into `toPublic`. That is the directory's
      allowlist and it stays as narrow as it is.
    */
    ...clientFieldsOf(metadata),
    creatorId: wb.userId,
    creatorName: wb.user?.name || 'Crusade Commander',
    campaignMembers: wb.campaignMembers,
    createdAt: wb.createdAt.toISOString(),
    updatedAt: wb.updatedAt.toISOString(),
  };
}

/** A page of the directory. Bounded, because one request should not grow with the table. */
const DEFAULT_PAGE = 24;
const MAX_PAGE = 60;

export async function GET(req: NextRequest) {
  return handle('warbands.GET', async () => {
    const { searchParams } = new URL(req.url);
    const actor = await currentActor();

    /*
      `all=true` is the public Warband Directory.

      Two things changed. It is a DIFFERENT QUERY now, not the same one with a
      wider `where` — the projection is the allowlist above, and the owner's
      email is not in it. And it returns only rosters whose owner chose to
      publish them: `visibility` defaults to PRIVATE and every existing row
      backfilled to PRIVATE, because nobody ever opted in to the old
      behaviour.

      It also no longer widens for an admin. An operator's convenience is not
      a reason for the public projection to carry more than it says it does.
    */
    if (searchParams.get('all') === 'true') {
      const take = Math.min(
        MAX_PAGE,
        Math.max(1, Number(searchParams.get('limit')) || DEFAULT_PAGE),
      );
      const cursor = searchParams.get('cursor');

      const rows = await prisma.warband.findMany({
        where: { visibility: 'PUBLIC' },
        select: PUBLIC_SELECT,
        // Deterministic under equal timestamps, so a cursor cannot skip or
        // repeat a row.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const page = rows.slice(0, take);
      return NextResponse.json({
        warbands: page.map(toPublic),
        nextCursor: rows.length > take ? page[page.length - 1]?.id ?? null : null,
      });
    }

    /*
      Otherwise: the caller's own rosters. A signed-out caller owns none.

      The admin ownership MUTATION that used to run here is gone. Every admin
      GET reassigned any row whose id or name matched a seed substring —
      `Al-Qarn`, `Bayt al-Nahas` — so a read changed data, and a real user's
      similarly named roster was silently claimed. A one-time repair belongs in
      a migration that names exact ids, logs what it touched and can be run dry.
    */
    if (!actor) return NextResponse.json({ warbands: [] });

    const warbands = await prisma.warband.findMany({
      where: { userId: actor.userId },
      include: {
        user: { select: { id: true, name: true } },
        campaignMembers: {
          select: {
            campaignId: true, glory: true, rating: true,
            wins: true, losses: true, draws: true, treasury: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ warbands: warbands.map(toOwn) });
  });
}

export async function POST(req: NextRequest) {
  return handle('warbands.POST', async () => {
    /*
      `requireActor()`, not the session read this used to do.

      Two holes closed at once, and both were in the identity rather than in
      the ownership check below.

      **A revoked session was resurrected by address.** The `jwt` callback
      revokes a session by deleting `token.sub` when `User.sessionEpoch` no
      longer matches — that is what makes a password reset actually remove
      whoever else was in the account. But `session.user.email` survives that,
      and this handler used to `upsert` a user from the email when the id was
      missing. So the revocation removed the identity and the next request
      minted it back, and could mint an account that had never existed.

      **A demoted administrator was still an administrator.** `isAdmin` came
      from `isUserAdmin(email)` — the legacy `TRENCHLINE_ADMIN_EMAILS` list —
      so an explicit revocation in `User.role` did nothing here. That made the
      persisted grant decorative on the two routes that write and delete other
      people's rosters. `adminRole.ts` is the one place that decides, and
      `requireActor()` is how a route asks it.

      `GET` above was migrated when `policy.ts` was written; these two were
      not, which is the worst state for a file to be in because it reads as
      finished.
    */
    const actor = await requireActor();
    /*
      Through the bounded reader, not `req.json()`.

      This route was the last write path where a caller chose the size of the
      work: `units` and `armoryStash` are Json columns with no ceiling of their
      own, so a roster body was bounded by the host and nothing else.
      `readJson` measures before it parses — `content-length` first, then the
      text it actually received, because the header is a claim rather than a
      fact — and refuses past `MAX_BODY_BYTES`.

      NOT `readAndParse` with a schema, and that is deliberate. The body
      carries client-owned fields on purpose: `clientMetadata` reads them off
      it using the single list in `CLIENT_OWNED`, which is what makes adding
      one a one-line change rather than an edit in two files that drift. A
      `.strict()` schema here would have to repeat that list and would reject
      every field the next version of the client sends. The cap is the property
      that was missing; the pass-through is a design, not an oversight.
    */
    const body = await readJson(req) as Record<string, unknown>;

    /*
      The columns this route writes. The CLIENT-OWNED fields are deliberately
      absent: `clientMetadata` reads those off `body` using the single list in
      CLIENT_OWNED, so adding one there makes it round-trip with no second edit
      here. Listing them twice is the drift that lost six of them.
    */
    const { id, ducatLimit, treasuryDucats, gloryPoints, units, armoryStash } = body;

    /*
      Typed, because `req.json()` returned `any` and these five went into
      Prisma unchecked.

      That is the same shape of defect the `types/diff.ts` sweep found: `any`
      let a value of the wrong kind reach a column and surface later as data
      nobody could account for. `name` and `factionId` are columns of type
      String, `visibility` is an enum, and until now a client could have sent
      a number or an object for any of them — the guard below tested
      truthiness, which an object passes.
    */
    const name = typeof body.name === 'string' ? body.name : undefined;
    const factionId = typeof body.factionId === 'string' ? body.factionId : undefined;
    const visibility = body.visibility === undefined
      ? undefined
      : typeof body.visibility === 'string' ? body.visibility : null;

    if (!name || !factionId) {
      return NextResponse.json({ error: 'Missing required fields: name and factionId are required' }, { status: 400 });
    }

    /*
      Whether this roster appears in the public Warband Directory.

      Only ever what the owner sends, and only one of three values — an
      unrecognised value is a rejection rather than something that reaches the
      column. Left out of the request entirely, the row keeps whatever it has;
      a new row gets the schema's PRIVATE default, because publishing is a
      choice somebody makes and not one made for them.
    */
    const VISIBILITIES = ['PRIVATE', 'UNLISTED', 'PUBLIC'];
    // `null` here means "sent, but not a string" — rejected by the same branch
    // as an unrecognised string, since neither is one of the three values.
    if (visibility !== undefined && (visibility === null || !VISIBILITIES.includes(visibility))) {
      return NextResponse.json(
        { error: `visibility must be one of ${VISIBILITIES.join(', ')}.` }, { status: 400 });
    }

    /*
      Signing in is what enables the cloud. Without it the app is local-only,
      which is a supported way to use it — not a reason to invent an owner.

      This used to upsert a shared `commander@trenchline.org` account and file
      every anonymous warband under it, so unrelated visitors accumulated in one
      bucket and, with the old GET, read each other's rosters back out.
    */
    const warbandId = typeof id === 'string' && id ? id : `wb-${Date.now()}`;

    // Check existing warband ownership if updating
    const existingWarband = await prisma.warband.findUnique({
      where: { id: warbandId }
    });

    if (existingWarband && existingWarband.userId && existingWarband.userId !== actor.userId && !actor.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only edit and update your own warbands.' },
        { status: 403 }
      );
    }

    /*
      Client-owned fields ride in the `notes` JSON, and `editedAt` is one of
      them.

      It was briefly a real column. That is arguably the tidier schema, but it
      made the deploy require a `prisma db push` performed at exactly the right
      moment: Prisma selects every column the schema declares, so between
      shipping the code and running the migration, every GET here would 500 and
      sync would be dead rather than degraded. A schema change that breaks the
      app if a human forgets a step is a worse trade than a JSON field.

      It also belongs with the fields already here. `editedAt` is the client's
      statement about the client's copy — like `snapshots` and `chronicleLog`,
      not like `ducatLimit`. Nothing server-side queries or sorts by it: the
      merge runs on the device against the full fetched list.

      If it ever needs to be indexed, add the column then and backfill from
      here. Doing it now buys nothing and costs a migration window.
    */
    /*
      The two Json columns, narrowed to what they are.

      A roster's models and stash are arrays; anything else is a client that
      does not agree with this one about the shape, and writing it would put a
      value in the column that every reader then has to guard against.
      Undefined leaves the column alone, which is what an update that does not
      mention them should do.
    */
    const unitsJson = Array.isArray(units) ? units as Prisma.InputJsonValue : undefined;
    const stashJson = Array.isArray(armoryStash) ? armoryStash as Prisma.InputJsonValue : undefined;

    const metadataPayload = clientMetadata(body);

    const warband = await prisma.warband.upsert({
      where: { id: warbandId },
      update: {
        name,
        factionId,
        /*
          `Number(x) || 700` turned a deliberate 0 into 700 — a player who set
          an unlimited-budget roster to 0 got the default back. A number that
          parses is used; only a value that does not parse falls back.
        */
        ducatLimit: Number.isFinite(Number(ducatLimit)) ? Number(ducatLimit) : 700,
        treasuryDucats: Number.isFinite(Number(treasuryDucats)) ? Number(treasuryDucats) : 0,
        gloryPoints: Number.isFinite(Number(gloryPoints)) ? Number(gloryPoints) : 0,
        units: unitsJson ?? [],
        armoryStash: stashJson ?? [],
        notes: metadataPayload,
        ...(visibility === undefined ? {} : { visibility: visibility as WarbandVisibility }),
        userId: existingWarband ? existingWarband.userId : actor.userId,
      },
      create: {
        id: warbandId,
        name,
        factionId,
        ducatLimit: Number.isFinite(Number(ducatLimit)) ? Number(ducatLimit) : 700,
        treasuryDucats: Number.isFinite(Number(treasuryDucats)) ? Number(treasuryDucats) : 0,
        gloryPoints: Number.isFinite(Number(gloryPoints)) ? Number(gloryPoints) : 0,
        units: unitsJson ?? [],
        armoryStash: stashJson ?? [],
        notes: metadataPayload,
        // Absent on create means the schema's PRIVATE default applies.
        ...(visibility === undefined ? {} : { visibility: visibility as WarbandVisibility }),
        userId: actor.userId,
      },
    });

    return NextResponse.json({ warband });
  });
}

export async function DELETE(req: NextRequest) {
  return handle('warbands.DELETE', async () => {
    // `requireActor()` for the reasons set out on POST above. This handler
    // carried the same two holes: it resolved a revoked session's identity by
    // looking the address up, and it read admin from the legacy email list.
    const actor = await requireActor();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return abort(badRequest('Name the warband to delete.'));

    /*
      A warband that is not there is a delete that already happened. Answering
      404 would make a client that retried a dropped request report a failure
      for work that is done — and this is exactly the request most likely to be
      retried, because it is sent when a phone is putting a roster away.
    */
    const existing = await prisma.warband.findUnique({
      where: { id }, select: { id: true, userId: true },
    });
    if (!existing) return NextResponse.json({ success: true, deletedId: id });

    if (existing.userId && existing.userId !== actor.userId && !actor.isAdmin) {
      return abort(forbidden('You can only delete your own warbands.'));
    }

    await prisma.warband.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  });
}
