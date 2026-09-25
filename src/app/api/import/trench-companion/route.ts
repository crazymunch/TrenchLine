/**
 * Fetch one Trench Companion warband, on the user's action.
 *
 * CI-1. The browser never calls their host: a page on our origin cannot read
 * a cross-origin JSON response without their CORS headers, and asking them to
 * publish some is not ours to ask. So the request is made here, and **only
 * the warband id is sent** — no session, no cookie, no referrer, nothing
 * about who is importing.
 *
 * Three things this route deliberately does not do, all of them etiquette
 * rather than mechanics (`docs/TRENCH-COMPANION-IMPORT.md`):
 *
 *   - **Nothing is cached.** The response carries `no-store` and the fetch
 *     opts out of Next's data cache. A player who fixes a typo on their share
 *     page and imports again gets what the page says now.
 *   - **Nothing is read in bulk.** One id per request, rate-limited per IP.
 *     Enumerating their warbands is not a thing this endpoint can be turned
 *     into by calling it faster.
 *   - **Nothing is stored.** The envelope is passed straight back; it reaches
 *     our database only if the player presses Import, and then as OUR shapes.
 *
 * Every failure is a failure the user sees, with the upstream status in it
 * (rule 2). There is no cached copy and no partial warband to fall back to:
 * a warband that half-arrived is the one thing worse than one that did not.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handle, badRequest, badGateway } from '@/lib/api/http';
import { readAndParse, text } from '@/lib/api/parse';
import { limitAccountRoute } from '@/lib/api/rateLimit';
import { parseTrenchCompanionRef, trenchCompanionUrl } from '@/services/trenchCompanion';

/** This reads a third-party host per request; it can never be prerendered. */
export const dynamic = 'force-dynamic';

const Body = z.object({
  /** A share link, or a bare warband id. Parsed by `parseTrenchCompanionRef`. */
  ref: text(2_000).trim().min(1),
}).strict();

/**
 * How long their host gets, and how much of an answer we will read.
 *
 * The largest warband measured is 18 KB. Two megabytes is a ceiling on a
 * response we have no control over, not a guess at a realistic size, and the
 * timeout is there so a slow upstream is an error the player can retry rather
 * than a request that hangs until the platform kills it.
 */
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  return handle('import/trench-companion', async () => {
    const limited = limitAccountRoute('companionImport', req.headers);
    if (limited) return limited;

    const { ref } = await readAndParse(req, Body);

    const parsed = parseTrenchCompanionRef(ref);
    if (!parsed.ok) return badRequest(parsed.reason);
    const { id } = parsed;

    let res: Response;
    try {
      res = await fetch(trenchCompanionUrl(id), {
        // Only the id is sent. No credentials, no cookies, no referrer.
        headers: { accept: 'application/json' },
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      /*
        The reason, not a guess at one. A timeout and a DNS failure are
        different things to a player deciding whether to try again, and
        `err.message` from `fetch` names which it was without naming anything
        of ours.
      */
      const why = err instanceof Error ? err.message : String(err);
      return badGateway(`Could not reach Trench Companion: ${why}`);
    }

    if (!res.ok) {
      return badGateway(
        `Trench Companion answered HTTP ${res.status} for warband ${id}. `
        + 'Check the link is right and that the warband is still shared.',
      );
    }

    const body = await res.text();
    if (body.length > MAX_BYTES) {
      return badGateway(
        `Trench Companion returned ${body.length} bytes for warband ${id}, `
        + `which is more than this import will read (${MAX_BYTES}).`,
      );
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(body);
    } catch {
      return badGateway(
        `Trench Companion answered HTTP ${res.status} for warband ${id}, `
        + 'but the body was not JSON.',
      );
    }

    /*
      The envelope's one load-bearing field, checked here so the failure names
      the host rather than surfacing later as a parser error against our own
      importer. `warband_data` is a JSON STRING inside the JSON envelope —
      that is their shape, not a mistake — so it is parsed to prove it is
      readable and then passed back exactly as it arrived.
    */
    const holder = envelope as { warband_data?: unknown } | null;
    const data = holder && typeof holder === 'object' ? holder.warband_data : undefined;
    if (typeof data !== 'string' || !data.trim()) {
      return badGateway(
        `Trench Companion answered HTTP ${res.status} for warband ${id} with no `
        + 'warband_data field. There is nothing to import from that response.',
      );
    }
    try {
      JSON.parse(data);
    } catch {
      return badGateway(
        `Trench Companion answered HTTP ${res.status} for warband ${id}, but its `
        + 'warband_data is not JSON. Nothing was imported.',
      );
    }

    return NextResponse.json(envelope, {
      // Read once, on the user's action. See the header comment.
      headers: { 'Cache-Control': 'no-store' },
    });
  });
}
