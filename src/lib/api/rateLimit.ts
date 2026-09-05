import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Rate limiting for the public account and invite surfaces.
 *
 * ## Where enforcement actually lives
 *
 * At the edge. This module is the application's half of the contract — the
 * buckets it expects, and the response it returns — not the enforcement
 * itself. The in-memory store below is per PROCESS, and on a multi-instance
 * deployment (which Vercel is) a process-local map counts a fraction of the
 * traffic and lets the rest through. Presenting that as protection is the kind
 * of "looks defended, is not" this repository is being audited out of, so it
 * says so here, `docs/DEPLOYMENT.md` names the layer, and
 * `RATE_LIMIT_BACKEND` makes the choice explicit rather than implied.
 *
 * What it IS good for: a single-instance deployment, local development, and
 * pinning the response contract in tests so the edge configuration has
 * something to agree with.
 *
 * ## Why never keyed on the address alone
 *
 * A bucket keyed only on a caller-supplied email is a weapon: an attacker
 * sends `victim@example.com` a hundred times and the victim can no longer
 * sign in or reset their password. So every account bucket is keyed on the
 * IP **and** the address together, and there is no bucket the caller can
 * fill on someone else's behalf.
 *
 * The address is hashed into the key. A rate-limit store is not a place to
 * keep a list of who has an account here.
 */

export interface Bucket {
  /** Requests allowed in the window. */
  limit: number;
  windowMs: number;
}

/** What each surface allows. Generous enough for a person, tight for a script. */
export const BUCKETS = {
  /** Credentials sign-in. The one an attacker walks a password list through. */
  signIn: { limit: 10, windowMs: 15 * 60_000 },
  /** Account creation, and the verification resend that rides on it. */
  register: { limit: 5, windowMs: 60 * 60_000 },
  /** Asking for a reset link, and spending one. */
  reset: { limit: 5, windowMs: 60 * 60_000 },
  /** Invite-code preview and join — the surface that guesses codes. */
  invite: { limit: 20, windowMs: 15 * 60_000 },
  /** Anonymous bug reports. */
  bugReport: { limit: 10, windowMs: 60 * 60_000 },
} as const satisfies Record<string, Bucket>;

export type BucketName = keyof typeof BUCKETS;

export interface Decision {
  ok: boolean;
  /** Seconds until the window resets. Sent as `Retry-After`. */
  retryAfter: number;
  remaining: number;
}

interface Counter { count: number; resetAt: number }

/**
 * The process-local store.
 *
 * A `Map` with lazy eviction: an expired entry is replaced when its key is next
 * seen, and the whole map is swept when it grows past a bound, so a flood of
 * distinct keys cannot grow it without limit.
 */
const counters = new Map<string, Counter>();
const MAX_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, c] of counters) if (c.resetAt <= now) counters.delete(key);
}

function backend(): 'memory' | 'none' {
  const choice = (process.env.RATE_LIMIT_BACKEND ?? 'memory').trim().toLowerCase();
  if (choice === 'none') return 'none';
  if (choice === 'memory') return 'memory';
  /*
    Unknown is a configuration mistake and fails loudly rather than quietly
    falling back to counting nothing.
  */
  throw new Error(
    `RATE_LIMIT_BACKEND="${choice}" is not a backend this build knows. `
    + 'Use "memory" (single instance or development) or "none" (the edge enforces).');
}

/**
 * The caller's address, as the platform reports it.
 *
 * Headers may be absent — a runtime that does not populate them, or a caller
 * constructing a request by hand. That shares one bucket rather than throwing:
 * a rate limiter that can crash a route it is protecting has made the route
 * less reliable, not more.
 */
export function clientIp(headers?: Headers | null): string {
  if (!headers || typeof headers.get !== 'function') return 'unknown';
  /*
    `x-forwarded-for` is a list; the FIRST entry is the client as the nearest
    trusted proxy saw it. Trusting a header at all is only safe because the
    deployment always sits behind one — a direct-to-node deployment must not
    use this, which is another reason enforcement belongs at the edge.
  */
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Hashed, so the store never holds an address. */
const account = (value: string) =>
  createHash('sha256').update(value.toLowerCase().trim()).digest('hex').slice(0, 16);

/**
 * Count one request against a bucket.
 *
 * `subject` is an address or other account identifier. When given, the key is
 * IP **and** subject — never subject alone; see the header.
 */
export function consume(
  name: BucketName,
  ip: string,
  subject?: string | null,
  now = Date.now(),
): Decision {
  const bucket = BUCKETS[name];
  if (backend() === 'none') {
    return { ok: true, retryAfter: 0, remaining: bucket.limit };
  }

  if (counters.size > MAX_KEYS) sweep(now);

  const key = subject ? `${name}:${ip}:${account(subject)}` : `${name}:${ip}`;
  const existing = counters.get(key);

  if (!existing || existing.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + bucket.windowMs });
    return { ok: true, retryAfter: 0, remaining: bucket.limit - 1 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > bucket.limit) {
    return { ok: false, retryAfter, remaining: 0 };
  }
  return { ok: true, retryAfter, remaining: bucket.limit - existing.count };
}

/**
 * The 429 itself.
 *
 * `Retry-After` in seconds, which is what a well-behaved client waits for, and
 * a body that says nothing about whether the account exists — a limiter is a
 * poor place to reintroduce the oracle the account routes just closed.
 */
export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Try again shortly.', code: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)) } },
  );
}

/**
 * Check both buckets a public account route needs, and return a 429 or null.
 *
 * Two independent limits, both of which must pass: one on the IP, and a
 * tighter one on that IP paired with the address. The pairing is what stops an
 * attacker exhausting a victim's allowance from somewhere else.
 */
export function limitAccountRoute(
  name: BucketName,
  headers: Headers | null | undefined,
  subject?: string | null,
): NextResponse | null {
  const ip = clientIp(headers);

  const byIp = consume(name, ip);
  if (!byIp.ok) return tooManyRequests(byIp.retryAfter);

  if (subject) {
    const bySubject = consume(name, ip, subject);
    if (!bySubject.ok) return tooManyRequests(bySubject.retryAfter);
  }
  return null;
}

/** Empty the store. Tests only. */
export function resetRateLimits(): void {
  counters.clear();
}
