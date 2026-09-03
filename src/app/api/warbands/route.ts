import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handle } from '@/lib/api/http';
import { currentActor } from '@/lib/api/policy';

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

/** Read the client-owned metadata that rides inside `notes`. */
function metadataOf(notes: string | null): Record<string, unknown> {
  const raw = notes ?? '';
  if (!raw.startsWith('{') || !raw.endsWith('}')) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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

/** The full roster, for its owner. Unchanged in shape — this is a restore. */
function toOwn(wb: Record<string, any>) {
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
    lore: metadata.lore,
    motto: metadata.motto,
    patron: metadata.patron,
    chronicleLog: metadata.chronicleLog,
    snapshots: metadata.snapshots,
    creatorId: wb.userId,
    creatorName: wb.user?.name || 'Crusade Commander',
    campaignMembers: wb.campaignMembers,
    createdAt: wb.createdAt.toISOString(),
    updatedAt: wb.updatedAt.toISOString(),
    // When the player last changed the roster, as against when the row was
    // last written. The sync merge compares this and nothing else — see
    // services/sync.ts for why `updatedAt` could not do the job.
    editedAt: metadata.editedAt,
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
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isAdmin = isUserAdmin(userEmail);
    const body = await req.json();

    const { 
      id, 
      name, 
      factionId, 
      ducatLimit, 
      treasuryDucats, 
      gloryPoints, 
      units, 
      armoryStash, 
      notes,
      lore,
      motto,
      patron,
      chronicleLog,
      snapshots,
      editedAt,
      visibility
    } = body;

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
    if (visibility !== undefined && !VISIBILITIES.includes(visibility)) {
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
    let effectiveUserId = userId;
    if (!effectiveUserId && userEmail) {
      const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
          email: userEmail,
          name: session?.user?.name || userEmail.split('@')[0],
        }
      });
      effectiveUserId = user.id;
    }

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Sign in to sync a warband to the cloud. Your roster is saved on this device either way.' },
        { status: 401 }
      );
    }

    const warbandId = id || `wb-${Date.now()}`;

    // Check existing warband ownership if updating
    const existingWarband = await prisma.warband.findUnique({
      where: { id: warbandId }
    });

    if (existingWarband && existingWarband.userId && existingWarband.userId !== effectiveUserId && !isAdmin) {
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
    const metadataPayload = JSON.stringify({
      rawNotes: notes || '',
      lore: lore || '',
      motto: motto || '',
      patron: patron || '',
      chronicleLog: chronicleLog || [],
      snapshots: snapshots || [],
      editedAt: editedAt || undefined
    });

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
        units: units || [],
        armoryStash: armoryStash || [],
        notes: metadataPayload,
        ...(visibility === undefined ? {} : { visibility }),
        userId: existingWarband ? existingWarband.userId : effectiveUserId,
      },
      create: {
        id: warbandId,
        name,
        factionId,
        ducatLimit: Number.isFinite(Number(ducatLimit)) ? Number(ducatLimit) : 700,
        treasuryDucats: Number.isFinite(Number(treasuryDucats)) ? Number(treasuryDucats) : 0,
        gloryPoints: Number.isFinite(Number(gloryPoints)) ? Number(gloryPoints) : 0,
        units: units || [],
        armoryStash: armoryStash || [],
        notes: metadataPayload,
        // Absent on create means the schema's PRIVATE default applies.
        ...(visibility === undefined ? {} : { visibility }),
        userId: effectiveUserId,
      },
    });

    return NextResponse.json({ warband });
  } catch (err: any) {
    /*
      Logged, never returned. `err.message` from Prisma names tables, columns
      and constraints, so a caller who can provoke a query error was getting a
      free description of the schema.
    */
    console.error('[api] warbands.POST', err);
    return NextResponse.json({ error: 'Failed to save warband' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isAdmin = isUserAdmin(userEmail);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing warband id parameter' }, { status: 400 });
    }

    // Resolve userId if needed
    if (!userId && userEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in to delete a warband from the cloud.' },
        { status: 401 }
      );
    }

    const existingWarband = await prisma.warband.findUnique({ where: { id } });
    if (!existingWarband) {
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (existingWarband.userId && existingWarband.userId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own warbands.' },
        { status: 403 }
      );
    }

    await prisma.warband.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting warband:', err);
    return NextResponse.json({ error: 'Failed to delete warband' }, { status: 500 });
  }
}
