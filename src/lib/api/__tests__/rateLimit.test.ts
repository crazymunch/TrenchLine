/**
 * The rate-limit contract.
 *
 * Enforcement lives at the EDGE — a process-local map on a multi-instance
 * deployment counts a fraction of the traffic and lets the rest through, and
 * presenting that as protection is the kind of "looks defended, is not" this
 * repository is being audited out of. What these pin is the application's half:
 * the buckets, the keying, and the response the edge configuration has to agree
 * with.
 *
 * The keying is the part with a real trap in it, and it has its own section.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  consume, limitAccountRoute, tooManyRequests, resetRateLimits, clientIp, BUCKETS,
} from '../rateLimit';

const headersFor = (ip: string) => new Headers({ 'x-forwarded-for': ip });

beforeEach(() => {
  resetRateLimits();
  process.env.RATE_LIMIT_BACKEND = 'memory';
});
afterEach(() => { delete process.env.RATE_LIMIT_BACKEND; });

describe('counting', () => {
  it('allows a bucket’s worth and refuses the next', () => {
    const { limit } = BUCKETS.signIn;
    for (let i = 0; i < limit; i += 1) {
      expect(consume('signIn', '1.1.1.1').ok, `request ${i + 1} of ${limit}`).toBe(true);
    }
    expect(consume('signIn', '1.1.1.1').ok).toBe(false);
  });

  it('counts each address separately', () => {
    for (let i = 0; i < BUCKETS.signIn.limit; i += 1) consume('signIn', '1.1.1.1');
    expect(consume('signIn', '1.1.1.1').ok).toBe(false);
    expect(consume('signIn', '2.2.2.2').ok, 'a different caller is unaffected').toBe(true);
  });

  it('counts each bucket separately', () => {
    for (let i = 0; i < BUCKETS.register.limit; i += 1) consume('register', '1.1.1.1');
    expect(consume('register', '1.1.1.1').ok).toBe(false);
    expect(consume('signIn', '1.1.1.1').ok, 'a different surface is unaffected').toBe(true);
  });

  it('forgets a window once it has passed', () => {
    const now = 1_000_000;
    for (let i = 0; i < BUCKETS.signIn.limit; i += 1) consume('signIn', '1.1.1.1', null, now);
    expect(consume('signIn', '1.1.1.1', null, now).ok).toBe(false);

    const later = now + BUCKETS.signIn.windowMs + 1;
    expect(consume('signIn', '1.1.1.1', null, later).ok).toBe(true);
  });

  it('reports a retry that is always at least a second', () => {
    const now = 1_000_000;
    for (let i = 0; i <= BUCKETS.signIn.limit; i += 1) consume('signIn', '1.1.1.1', null, now);
    // A window with milliseconds left still says 1, not 0: a client told to
    // wait zero seconds retries immediately and is refused again.
    const almost = now + BUCKETS.signIn.windowMs - 10;
    const d = consume('signIn', '1.1.1.1', null, almost);
    expect(d.ok).toBe(false);
    expect(d.retryAfter).toBeGreaterThanOrEqual(1);
  });
});

describe('the keying, which is the part with the trap', () => {
  it('never lets one caller exhaust another’s allowance', () => {
    /*
      A bucket keyed only on a caller-supplied address is a weapon: send
      `victim@example.com` enough times and the victim can no longer sign in or
      reset their password. Every account bucket is keyed on the IP AND the
      address, so an attacker fills only their own.
    */
    const attacker = headersFor('9.9.9.9');
    const victim = headersFor('1.1.1.1');
    const address = 'victim@example.org';

    for (let i = 0; i <= BUCKETS.reset.limit; i += 1) limitAccountRoute('reset', attacker, address);
    expect(limitAccountRoute('reset', attacker, address), 'the attacker is stopped').not.toBeNull();
    expect(limitAccountRoute('reset', victim, address), 'the victim is not').toBeNull();
  });

  it('still limits one caller trying many addresses', () => {
    // The IP bucket is what catches enumeration, which the paired bucket alone
    // would miss entirely.
    const attacker = headersFor('9.9.9.9');
    for (let i = 0; i <= BUCKETS.register.limit; i += 1) {
      limitAccountRoute('register', attacker, `person${i}@example.org`);
    }
    expect(limitAccountRoute('register', attacker, 'someone-new@example.org')).not.toBeNull();
  });

  it('keeps no address in the store', () => {
    // A rate-limit store is not a place to keep a list of who has an account.
    consume('reset', '1.1.1.1', 'secret-person@example.org');
    const dumped = JSON.stringify([...(globalThis as never as { __c?: unknown }).__c ?? []]);
    expect(dumped).not.toContain('secret-person');
  });
});

describe('the response', () => {
  it('is a 429 carrying Retry-After in seconds', () => {
    const res = tooManyRequests(42);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
  });

  it('never says less than a second', () => {
    expect(tooManyRequests(0).headers.get('Retry-After')).toBe('1');
  });

  it('says nothing about whether the account exists', async () => {
    // The limiter is a poor place to reintroduce the oracle the account routes
    // just closed.
    const body = await tooManyRequests(1).json();
    expect(JSON.stringify(body)).not.toMatch(/account|address|email|exist/i);
  });
});

describe('the backend switch', () => {
  it('counts nothing when the edge is the enforcement layer', () => {
    process.env.RATE_LIMIT_BACKEND = 'none';
    for (let i = 0; i < BUCKETS.signIn.limit * 3; i += 1) {
      expect(consume('signIn', '1.1.1.1').ok).toBe(true);
    }
  });

  it('throws on a value it does not know, rather than counting nothing', () => {
    /*
      A silent fallback would leave a deployment that believed it had
      configured a limiter with none at all.
    */
    process.env.RATE_LIMIT_BACKEND = 'redis-probably';
    expect(() => consume('signIn', '1.1.1.1')).toThrow(/not a backend/i);
  });
});

describe('reading the caller’s address', () => {
  it('takes the first entry of x-forwarded-for', () => {
    // The client as the nearest trusted proxy saw it; the rest of the list is
    // the proxies themselves.
    expect(clientIp(new Headers({ 'x-forwarded-for': '3.3.3.3, 10.0.0.1, 10.0.0.2' })))
      .toBe('3.3.3.3');
  });

  it('falls back to x-real-ip, then to a constant', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '4.4.4.4' }))).toBe('4.4.4.4');
    // Not skipped: a caller with no headers shares one bucket rather than
    // getting an unlimited one.
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
