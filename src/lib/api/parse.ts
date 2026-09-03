import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { abort, badRequest, payloadTooLarge } from './http';

/**
 * Parse and validate a request body, or fail the request.
 *
 * Handlers used to call `req.json()` and destructure whatever came back.
 * Warband JSON columns and metadata arrays were persisted directly, custom
 * rule `data` was stored as arbitrary JSON, and the bug-report route spread
 * the body into the object it stored and returned. Nothing checked a type, a
 * length, a range or an unknown key.
 *
 * Two habits made it worse than "unvalidated":
 *
 *   - `Number(value) || default` silently turns a legitimate **0** into the
 *     default, and accepts negatives and `1e308` alike.
 *   - IDs built from `Date.now()` are guessable and collide under concurrency.
 *
 * Everything below is `.strict()` at the object level, so an unknown key is a
 * 400 rather than something that quietly reaches Prisma.
 */

/**
 * The largest body any of these endpoints accepts.
 *
 * A warband roster with a long chronicle is the biggest legitimate payload and
 * is comfortably inside this. The cap exists because nothing else bounds it:
 * the host's own limit is the only other backstop, and it should not be the
 * first one. A real limit belongs at the reverse proxy too — this is the
 * application's own floor, not a substitute for it.
 */
export const MAX_BODY_BYTES = 512 * 1024;

/**
 * Read the body as text first so it can be measured before it is parsed.
 *
 * `req.json()` parses before anyone can object to the size, so a caller
 * choosing the size of the work is exactly the case a cap has to catch.
 */
export async function readJson(req: NextRequest): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) abort(payloadTooLarge());

  let text: string;
  try {
    text = await req.text();
  } catch {
    return abort(badRequest('That request body could not be read.'));
  }

  // Checked again after reading: `content-length` is a claim, not a fact.
  if (text.length > MAX_BODY_BYTES) abort(payloadTooLarge());

  try {
    return JSON.parse(text);
  } catch {
    return abort(badRequest('That request body is not valid JSON.'));
  }
}

/**
 * Validate a parsed body against a schema, or fail with 400.
 *
 * The failure names the fields that were wrong and nothing else — a caller
 * needs to know which field to fix, and does not need the value it sent
 * echoed back to it.
 */
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const fields = [...new Set(
    result.error.issues.map((i) => i.path.join('.') || '(body)'),
  )].slice(0, 10);

  return abort(badRequest(`Invalid request: ${fields.join(', ')}.`));
}

/** Read and validate in one step. */
export async function readAndParse<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  return parseBody(schema, await readJson(req));
}

/* ------------------------------------------------------------ primitives */

/** A cuid, as Prisma generates. Bounded so a lookup key cannot be a novel. */
export const id = () => z.string().min(1).max(64);

/** Free text with a real ceiling. */
export const text = (max: number) => z.string().max(max);

/**
 * A non-negative whole number with an explicit ceiling.
 *
 * `z.number().int()` alone still accepts `Number.MAX_SAFE_INTEGER`, and the
 * old `Number(x) || fallback` accepted anything at all — including turning a
 * deliberate 0 into the fallback, which is how a treasury reset to zero used
 * to come back as 700.
 */
export const count = (max: number) => z.number().int().min(0).max(max);

/** JSON that is allowed to be arbitrary, but not unbounded or infinitely deep. */
export const boundedJson = (maxBytes: number) =>
  z.unknown().refine(
    (v) => {
      try {
        return JSON.stringify(v ?? null).length <= maxBytes;
      } catch {
        // Circular, or a BigInt: not something that can be stored either way.
        return false;
      }
    },
    { message: `must serialise to at most ${maxBytes} bytes` },
  );
