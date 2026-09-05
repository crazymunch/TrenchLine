/**
 * The three documents say what the code does.
 *
 * A privacy policy is the one page in an application that rots silently: it is
 * prose, nothing imports it, and a change to a route handler two directories
 * away can make it false without breaking a single test. That is the failure
 * these guard — not typos.
 *
 * The sharpest of them is the directory projection. `toPublic` in
 * `src/app/api/warbands/route.ts` decides exactly what a published warband
 * shows to the world, and the policy claims to list it in full. Add a field
 * there and this fails until the policy has a phrase for it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CONTACT, NAME, COUNTRY } from '../operator';

const root = path.resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

/**
 * Source with every run of whitespace flattened to one space.
 *
 * A sentence in JSX is wrapped by the formatter wherever the line ran out, so
 * "the number of models in it" is four words, a newline and eight spaces in
 * the file. Matching the raw source would make these assertions depend on
 * where the text happened to wrap, which is a test that fails on a reformat
 * and passes on a lie.
 */
const flat = (source: string) => source.replace(/\s+/g, ' ');

const PRIVACY = flat(read('src/app/(legal)/privacy/page.tsx'));
const TERMS = flat(read('src/app/(legal)/terms/page.tsx'));
const ABOUT = flat(read('src/app/(legal)/about/page.tsx'));
const LAYOUT = flat(read('src/app/(legal)/layout.tsx'));
const LANDING = flat(read('src/components/landing/Landing.tsx'));
const WARBANDS = read('src/app/api/warbands/route.ts');

const DOCUMENTS = { privacy: PRIVACY, terms: TERMS, about: ABOUT };

/**
 * What the policy promises about each field the directory publishes.
 *
 * The key is the property `toPublic` returns; the value is wording that must
 * appear in the privacy policy for it. Deliberately a phrase and not the
 * identifier — a reader of the policy is not reading TypeScript, so a policy
 * that merely contained the word `gloryPoints` would pass a test and tell
 * nobody anything.
 */
const PUBLISHED_FIELDS: Record<string, string> = {
  id: 'the warband name', // the row's identity; nothing personal in it
  name: 'the warband name',
  factionId: 'its faction',
  ducatLimit: 'its ducat limit',
  gloryPoints: 'its glory',
  creatorName: 'your display name',
  modelCount: 'the number of models in it',
  motto: 'its motto',
  createdAt: 'the date it was created',
};

/**
 * The keys `toPublic` actually returns, read out of the route.
 *
 * The end of the object is `\n  };` and not the next `\n}`: `toPublic`'s
 * parameter is an inline type literal, so a brace at column 0 appears in the
 * SIGNATURE, before the body. Slicing to that one yields an empty string, and
 * an empty key list makes every assertion below pass while checking nothing —
 * which is why `it finds them at all` exists.
 */
function publishedKeys(): string[] {
  const start = WARBANDS.indexOf('function toPublic(');
  expect(start, 'toPublic has been renamed — check the directory projection').toBeGreaterThan(-1);
  const open = WARBANDS.indexOf('return {', start);
  expect(open, 'toPublic no longer returns an object literal').toBeGreaterThan(-1);
  const body = WARBANDS.slice(open, WARBANDS.indexOf('\n  };', open));
  return [...body.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
}

describe('the public directory projection', () => {
  it('finds them at all', () => {
    // Guards the guard. Every assertion in this block iterates the projection,
    // so a reader that silently returns nothing turns the block into a
    // no-op — the failure mode this whole file exists to avoid.
    const keys = publishedKeys();
    expect(keys.length).toBeGreaterThan(5);
    expect(keys).toContain('name');
  });

  it('publishes only fields the privacy policy accounts for', () => {
    for (const key of publishedKeys()) {
      const phrase = PUBLISHED_FIELDS[key];
      expect(
        phrase,
        `the directory now publishes \`${key}\` and the privacy policy does not `
        + 'mention it. Add it to /privacy and to PUBLISHED_FIELDS here.',
      ).toBeTruthy();
      expect(PRIVACY, `/privacy no longer describes \`${key}\``).toContain(phrase);
    }
  });

  it('still does not publish an email address', () => {
    expect(publishedKeys()).not.toContain('email');
    // And the policy still says so, which is the sentence people check.
    expect(PRIVACY).toContain('Your email address is not in that list');
  });
});

describe('the documents', () => {
  it('take the contact address from one place', () => {
    for (const [name, source] of Object.entries(DOCUMENTS)) {
      expect(source, `/${name} does not import the contact address`).toContain(
        "from '../operator'");
      expect(source, `/${name} hard-codes an address instead of using CONTACT`)
        .not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
    expect(CONTACT).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it('ship no placeholder text', () => {
    // The failure this guards is a draft going out with the blanks still in
    // it — which on a page about who runs the site is worse than no page.
    for (const [name, source] of Object.entries(DOCUMENTS)) {
      for (const bad of ['TODO', 'FIXME', 'Lorem ipsum', '[your', 'XXX', 'PLACEHOLDER']) {
        expect(source, `/${name} still contains ${bad}`).not.toContain(bad);
      }
    }
  });

  it('read correctly whether or not the operator is named', () => {
    // Both branches must exist: null is a supported state, not a defect.
    expect(ABOUT).toContain('{NAME ?');
    expect(PRIVACY).toContain('{COUNTRY ?');
    expect(TERMS).toContain('{COUNTRY ?');
    // And whichever is configured must be a real value, not an empty string
    // standing in for one.
    if (NAME !== null) expect(NAME.trim().length).toBeGreaterThan(0);
    if (COUNTRY !== null) expect(COUNTRY.trim().length).toBeGreaterThan(0);
  });

  it('name a way to delete an account', () => {
    expect(PRIVACY).toContain('delete');
    expect(LAYOUT).toContain('request to delete your account');
  });
});

describe('reachability', () => {
  it('is linked from the one page a signed-out visitor sees', () => {
    // The whole point. A policy nobody can navigate to is a file, not a page.
    for (const href of ['/about', '/privacy', '/terms']) {
      expect(LANDING, `the landing footer does not link to ${href}`)
        .toContain(`href="${href}"`);
    }
  });

  it('cross-links between the documents', () => {
    expect(PRIVACY).toContain('href="/terms"');
    expect(TERMS).toContain('href="/privacy"');
    expect(ABOUT).toContain('href="/privacy"');
  });
});
