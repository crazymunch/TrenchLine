'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';
import { GoogleMark } from '../brand/GoogleMark';
import type { LandingPreviews } from './previews';

/**
 * The front door — design 5a, "The Dispatch".
 *
 * ## What was wrong with the last one
 *
 * Not colour. It rendered five sections through one `.map()` with one class
 * string, so all five carried identical weight, border and padding; with the
 * header and the sign-in box that is seven boxes of equal value on one flat
 * ground, and the page had no focal point at all. It also never entered
 * `.sheet`, so the cream half of the design language — the half that makes the
 * app look like a document — never appeared on the page that introduces it.
 *
 * Three things fix that, in order of effect: one loud thing (the photograph),
 * a broken tie (Combat and Campaign lead, with a preview each; Codex takes a
 * band; Roster and Directory drop to an index), and the sheet (two of the
 * three previews are cream).
 *
 * ## What it sells
 *
 * The old copy led on accuracy. Accuracy is table stakes for a roster builder,
 * so it moves to the support of 03 and 04, and the page leads on the two
 * things almost no competing app does: tracking the game in progress and the
 * campaign around it. The section order here is therefore NOT the nav order.
 *
 * ## Who sees it
 *
 * A signed-in visitor does not: they are sent to `/roster`. See the redirect
 * below, which is the whole of that rule and carries its own reasoning.
 *
 * ## Not faction-themed
 *
 * Every colour on this page is a `brand-*` token, fixed across all six themes.
 * The page renders before any warband is active, so `--color-primary` has no
 * faction to take, and `--accent-paper` is overridden by every theme — a page
 * built on it would greet a visitor in whichever faction they last looked at.
 */

/** The query flag that suppresses the signed-in redirect. */
const STAY = 'stay';

/** Where the sign-in lands. The same place the redirect sends a session. */
const AFTER_SIGN_IN = '/roster';

const LEAD = [
  {
    n: '01',
    label: 'Tabletop Combat',
    href: '/play',
    title: 'It plays the game with you',
    blurb:
      'A one-handed HUD for the table: turn order, wounds, blood markers and '
      + 'a keyword lookup, sized for a phone propped against the terrain. Tap '
      + 'a keyword, get the rule — no reaching for the book mid-activation.',
  },
  {
    n: '02',
    label: 'Crusade Campaign',
    href: '/campaign',
    title: 'And remembers what happened',
    blurb:
      'Territory taken and lost, every match logged, injuries and advances '
      + 'carried forward, and a chronicle your group can read. Run the app’s '
      + 'own theatres or the Carcass Front on its 32 published zones.',
  },
] as const;

const INDEX = [
  {
    n: '04',
    href: '/roster',
    title: 'Warband Roster',
    blurb:
      'Costs and carrying limits checked against the Armoury Tables as you go '
      + '— and when something is forbidden you are shown the sentence that '
      + 'forbids it. Ducats and Glory keep their own columns.',
  },
  {
    n: '05',
    href: '/directory',
    title: 'Roster Directory',
    blurb:
      'What the other players in your campaign have fielded, and what they '
      + 'will be carrying when they meet you.',
  },
] as const;

/** What signing in adds. Short, and all of it true today. */
const ACCOUNT_GIVES = [
  'Warbands saved to you, not to this browser',
  'Campaigns shared with the players in them',
  'Your roster visible in the campaign directory',
];

/**
 * The nav, in selling order rather than app order, so it matches the page.
 *
 * `hidden lg:flex`: on a phone this page IS the navigation — every one of
 * these is a full-width card or row below the fold — and five 12px mono links
 * in a 56px bar are each about 29px tall, under the 44px floor
 * (docs/MOBILE.md §3) that `e2e/home.spec.ts` measures on every link.
 */
const NAV = [
  ['Play', '/play'],
  ['Campaign', '/campaign'],
  ['Codex', '/codex'],
  ['Roster', '/roster'],
  ['Directory', '/directory'],
] as const;

const price = (n: number, suffix: string) =>
  (n > 0 ? `${n} ${suffix}` : '—');

/**
 * Google's own button, squared.
 *
 * Google publishes both a rectangular and a pill button, so square corners are
 * within the brand guidelines — and `globals.css` strips every radius in the
 * app, so a pill here would be the only round corner on the site. What is NOT
 * negotiable is the mark: not recoloured, not redrawn, not replaced with a
 * lucide icon (see `GoogleMark`).
 *
 * It calls the same NextAuth provider `AuthModal` calls. There is no second
 * sign-in form on this page, because two forms is how one of them goes stale
 * against the auth it calls.
 */
const SignInButton: React.FC<{ tone: 'primary' | 'ghost' }> = ({ tone }) => (
  <button
    type="button"
    onClick={() => signIn('google', { callbackUrl: AFTER_SIGN_IN })}
    className={
      tone === 'primary'
        ? 'inline-flex min-h-[48px] w-full items-center justify-center gap-3 '
          + 'bg-theme-text px-5 font-sans text-[15px] font-medium text-theme-base '
          + 'transition-colors hover:bg-white sm:w-auto lg:min-h-[46px] lg:text-sm'
        : 'inline-flex min-h-[44px] items-center gap-2.5 border border-brand-line-2 '
          + 'bg-brand-ground-2 px-3.5 font-sans text-[13px] font-medium text-theme-text '
          + 'transition-colors hover:border-theme-text lg:min-h-[36px]'
    }
  >
    <GoogleMark className="h-[18px] w-[18px]" />
    <span>Sign in with Google</span>
  </button>
);

export const Landing: React.FC<{ previews: LandingPreviews }> = ({ previews }) => {
  const { status } = useSession();
  const router = useRouter();
  const [staying, setStaying] = useState(false);

  useEffect(() => {
    /*
      The signed-in redirect.

      `status` is 'loading' until the session request lands; only
      'authenticated' is a decision. Signed-OUT visitors always get this page,
      including ones with warbands already saved in this browser — local-only
      play is supported and the account strip says so, but it is also the one
      moment where the offer to sign in reaches someone with something to lose.

      In an effect rather than during render, so the page paints first and is
      replaced once the session resolves. That flash is the price of keeping
      `/` a static document: deciding before paint means either reading auth
      state during render, which is the React #418 hydration mismatch this app
      has been bitten by twice, or a `middleware.ts`, which makes `/` an edge
      invocation on every visit — slower for exactly the new visitors the page
      exists for.

      The query is read off `window` rather than through `useSearchParams`,
      which would force this page into a Suspense boundary and out of static
      rendering for the sake of a flag almost nobody sets.
    */
    if (status !== 'authenticated') return;
    if (new URLSearchParams(window.location.search).has(STAY)) {
      setStaying(true);
      return;
    }
    router.replace(AFTER_SIGN_IN);
  }, [status, router]);

  if (status === 'authenticated' && !staying) {
    /*
      Not the front door. By here the answer is known and the navigation is
      queued — one frame of a landing page on the way past reads as a sign-out.
    */
    return (
      <main className="flex min-h-dvh items-center justify-center bg-theme-base p-6">
        <p className="font-mono text-sm text-theme-muted" role="status">
          Taking you to your warbands&hellip;
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-theme-base text-theme-text">

      {/* ---------------------------------------------------------- header */}
      <header className="flex h-14 items-center justify-between border-b border-theme-border px-4 lg:h-[58px] lg:px-16">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-[11px] lg:min-h-0"
          aria-label="TrenchLine, home"
        >
          {/*
            Plain <img>, not next/image: this is an 8 KB SVG at a fixed 32px,
            so there is no srcset to generate and no layout shift to reserve —
            the optimiser would add a request and a wrapper for nothing.
          */}
          <img src="/brand/icon.svg" alt="" width={32} height={32} className="h-8 w-8" />
          {/*
            The wordmark is the mark's partner on a desktop and its competitor
            on a phone: at 375 the two of them plus the sign-in button do not
            fit, and the wordmark is what got clipped. The masthead 40px below
            says TRENCHLINE at 56px, so nothing is lost by dropping it here.
          */}
          <span className="hidden font-gothic text-[17px] font-bold tracking-[0.18em] sm:inline">
            TRENCHLINE
          </span>
        </Link>

        <nav className="hidden items-center lg:flex" aria-label="Sections">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="px-[13px] py-2 font-mono text-xs uppercase tracking-[0.10em] text-theme-muted transition-colors hover:text-theme-text"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-3 flex-shrink-0">
          <SignInButton tone="ghost" />
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative flex min-h-[600px] flex-col justify-end overflow-hidden bg-brand-ground px-4 py-10 lg:h-[600px] lg:justify-center lg:px-16 lg:py-0">
          {/*
            Two baked crops, not one framing scaled.

            `scripts/build-hero-image.mjs` grades and crops the author's
            photograph at build time. The design expresses the desktop framing
            as an absolute offset inside a 1280x600 board — a framing, not a
            layout, and at 375px the same offsets put both models off screen —
            so the phone gets a crop that was checked at 375 instead.

            `fetchPriority` and no lazy attribute: this is the LCP element.
          */}
          <picture>
            <source media="(min-width: 1024px)" srcSet="/brand/hero-wide.webp" />
            <img
              src="/brand/hero-tall.webp"
              alt="Two duellists facing each other across a ruined nave"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>

          {/*
            The scrim, as a gradient rather than baked into the image, so its
            first stop is the same token as the section's ground. Bake it and
            any future change to that colour appears as a seam down the left.

            Vertical on a phone, where the type sits at the bottom of a tall
            crop; the design's 93deg on a desktop, where it sits to the left of
            a wide one.

            The phone stops are placed against the type, not spaced evenly.
            The masthead and lede fill about 420px of the 600px hero, so the
            scrim is 88% opaque at 58% — solid enough behind a 12px gold
            eyebrow — and 12% at the top, where nothing is written and the
            photograph is the whole point.
          
          */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-brand-ground via-brand-ground/88 via-58% to-brand-ground/12 lg:hidden"
          />
          <div
            aria-hidden
            className="absolute inset-0 hidden lg:block"
            style={{
              backgroundImage:
                'linear-gradient(93deg, rgb(var(--brand-ground)) 0%,'
                + ' rgb(var(--brand-ground) / 0.92) 32%,'
                + ' rgb(var(--brand-ground) / 0.34) 58%,'
                + ' rgb(var(--brand-ground) / 0.12) 100%)',
            }}
          />

          <div className="relative max-w-[600px]">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-brand-gold">
              Warband Tracker // Crusade Companion
            </p>
            {/*
              A hard break, not a width. "TRENCH LINE" over two lines is the
              masthead; letting it wrap on its own puts the break wherever the
              viewport happens to fall.
            */}
            <h1 className="mt-4 font-gothic text-[56px] font-bold leading-[0.87] tracking-[-0.04em] sm:text-[72px] lg:text-[100px]">
              TRENCH<br />LINE
            </h1>
            <p className="mt-5 text-base leading-[1.5] text-brand-lede lg:text-xl">
              A warband manager built for Trench Crusade and nothing else. Plenty
              of apps will hold a roster — this one comes to the table with you,
              tracks the game you are playing and the campaign it belongs to, and
              keeps the whole codex a thumb away.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/roster"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 bg-brand-oxblood px-6 font-mono text-[13px] font-medium uppercase tracking-[0.10em] text-white transition-colors hover:bg-brand-oxblood-lit lg:min-h-[46px]"
              >
                <span>Start a warband</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/codex"
                className="inline-flex min-h-[48px] items-center justify-center border border-brand-line-2 bg-brand-ground-2 px-6 font-mono text-[13px] font-medium uppercase tracking-[0.10em] text-theme-text transition-colors hover:border-theme-text lg:min-h-[46px]"
              >
                See the codex
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- 01 / 02 the pair */}
        <section aria-labelledby="lead-heading">
          <h2 id="lead-heading" className="eyebrow px-4 pt-12 lg:px-16 lg:pt-[52px]">
            What almost nothing else does
          </h2>

          <div className="grid grid-cols-1 gap-7 px-4 pb-12 pt-6 lg:grid-cols-2 lg:px-16 lg:pb-[52px]">
            {LEAD.map(({ n, label, href, title, blurb }) => (
              <article key={n} className="flex flex-col border-t-[3px] border-brand-oxblood bg-theme-elevated">
                <div className="p-5 lg:p-6">
                  <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em]">
                    {/*
                      Oxblood as a numeral on the iron ground would be 1.98:1.
                      `brand-oxblood-ink` is the 6.10:1 that says the same
                      thing — see the contrast table in globals.css.
                    */}
                    <span className="font-semibold text-brand-oxblood-ink">{n}</span>
                    <span className="text-theme-muted">{label}</span>
                  </p>
                  <h3 className="mt-3 font-gothic text-[26px] font-bold leading-[1.04] tracking-[-0.02em] lg:text-[32px]">
                    {title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-brand-body lg:text-base">
                    {blurb}
                  </p>
                </div>

                <div className="px-5 lg:px-6">
                  {n === '01'
                    ? <HudPreview warrior={previews.warrior} keyword={previews.keyword} />
                    : <ChroniclePreview territories={previews.territories} />}
                </div>

                <div className="p-5 pt-4 lg:p-6 lg:pt-5">
                  <Link
                    href={href}
                    className="inline-flex min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-[0.10em] text-brand-oxblood-ink transition-colors hover:text-theme-text lg:min-h-0"
                  >
                    <span>{label}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------- 03 the codex band */}
        <section
          aria-labelledby="codex-heading"
          className="grid grid-cols-1 border-y border-theme-border lg:grid-cols-[440px_1fr]"
        >
          <div className="px-4 py-10 lg:border-r lg:border-theme-border lg:py-12 lg:pl-16 lg:pr-11">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em]">
              <span className="font-semibold text-brand-oxblood-ink">03</span>
              <span className="text-theme-muted">Rules Codex</span>
            </p>
            <h2
              id="codex-heading"
              className="mt-3 font-gothic text-[26px] font-bold leading-[1.03] tracking-[-0.02em] lg:text-[34px]"
            >
              The whole book, searchable
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-brand-body lg:text-base">
              The arsenal, the scenarios with their deployment maps, Patrons,
              Injuries and the campaign tables. Read from the published
              catalogues rather than retyped — and anything the sources do not
              state is left blank.
            </p>
            <Link
              href="/codex"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-[0.10em] text-brand-oxblood-ink transition-colors hover:text-theme-text lg:min-h-0"
            >
              <span>Rules Codex</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/*
            The armoury panel bleeds off the right edge on a desktop: no right
            border, no right padding. That is the point of it — it says there
            is more of this than fits. On a phone it is a plain full-width
            panel, because there is no room for a gesture about width.
          */}
          <div className="bg-brand-ground-2 px-4 py-8 lg:py-9 lg:pl-10 lg:pr-0">
            <ArmouryPreview armoury={previews.armoury} />
          </div>
        </section>

        {/* -------------------------------------------------- 04 / 05 the index */}
        <section aria-labelledby="index-heading">
          <h2 id="index-heading" className="eyebrow px-4 pt-12 lg:px-16">
            And the table stakes, done properly
          </h2>

          <ul className="grid grid-cols-1 px-4 pb-10 pt-4 lg:grid-cols-2 lg:gap-x-14 lg:px-16">
            {INDEX.map(({ n, href, title, blurb }) => (
              <li key={n} className="border-t border-theme-border">
                <Link
                  href={href}
                  className="grid min-h-[44px] grid-cols-[34px_1fr] py-5 transition-colors hover:bg-brand-hover lg:grid-cols-[44px_1fr]"
                >
                  <span className="font-mono text-xs text-brand-oxblood-ink">{n}</span>
                  <span>
                    <span className="block font-gothic text-lg font-semibold tracking-[-0.01em] lg:text-xl">
                      {title}
                    </span>
                    <span className="mt-1.5 block text-sm leading-[1.58] text-brand-body lg:text-[15px]">
                      {blurb}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------- account strip */}
        <section
          aria-labelledby="account-heading"
          className="grid grid-cols-1 gap-8 border-t border-theme-border px-4 py-10 lg:grid-cols-[1fr_380px] lg:gap-12 lg:px-16 lg:pb-11 lg:pt-10"
        >
          <div>
            <h2
              id="account-heading"
              className="font-gothic text-[22px] font-bold tracking-[-0.015em] lg:text-[26px]"
            >
              Nothing here needs an account
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-brand-body lg:text-base">
              This browser will keep your warband, offline included. An account
              keeps it when the browser forgets — and it is what puts your
              roster in front of the other players in your campaign.
            </p>
            <ul className="mt-4 space-y-2">
              {ACCOUNT_GIVES.map((line) => (
                <li key={line} className="flex items-start gap-2.5 font-mono text-[13px] text-brand-body">
                  <span aria-hidden className="mt-px text-status-legal">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:self-end">
            <SignInButton tone="primary" />
          </div>
        </section>

        {/* ---------------------------------------------------------- footer */}
        <footer className="flex flex-col gap-5 border-t border-theme-border px-4 pb-8 pt-7 lg:flex-row lg:gap-10 lg:px-16">
          <img
            src="/brand/icon.svg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 flex-shrink-0 opacity-75"
          />
          <div className="max-w-[760px]">
            <p className="text-[13px] leading-[1.65] text-theme-muted">
              TrenchLine is an unofficial companion. Trench Crusade is the work of
              its creators. The rules and statlines here are read from the
              published catalogues and rulebooks rather than reproduced by hand,
              and anything the sources do not state is left blank.
            </p>
            {/*
              Who runs it, what it keeps, and the rules of the road.

              Not decoration and not compliance theatre: a site with a password
              field, a Google button and no answer to "who are you" is the exact
              shape Safe Browsing flags, which is what happened here. These are
              the answer, and they have to be reachable from the one page a
              signed-out visitor sees. Stacked on a phone, in a row from `sm:`,
              with 44px targets either way.
            */}
            <nav
              aria-label="Site information"
              className="mt-5 flex flex-col gap-1 font-mono text-[12px] uppercase tracking-[0.14em] sm:flex-row sm:gap-7"
            >
              <Link href="/about" className="inline-flex min-h-[44px] items-center text-theme-muted hover:text-brand-gold">
                About
              </Link>
              <Link href="/privacy" className="inline-flex min-h-[44px] items-center text-theme-muted hover:text-brand-gold">
                Privacy
              </Link>
              <Link href="/terms" className="inline-flex min-h-[44px] items-center text-theme-muted hover:text-brand-gold">
                Terms
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
};

/**
 * 01: an iron mini-HUD.
 *
 * The keyword and its text are the glossary's, verbatim — see `previews.ts`
 * for why this one and not the one the design asked for.
 */
const HudPreview: React.FC<Pick<LandingPreviews, 'warrior' | 'keyword'>> = ({ warrior, keyword }) => (
  <div className="border border-theme-border bg-theme-base p-4" aria-hidden>
    <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em]">
      <span className="text-theme-muted">Round 3 · Your activation</span>
      <span className="text-brand-gold">2 of 5 left</span>
    </div>

    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="font-gothic text-[15px] font-semibold">{warrior}</span>
      <span className="flex items-center gap-1.5">
        <span className="h-[13px] w-[13px] bg-brand-oxblood" />
        <span className="h-[13px] w-[13px] bg-brand-oxblood" />
        <span className="h-[13px] w-[13px] border border-brand-line" />
      </span>
    </div>

    <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
      <span className="border border-brand-line px-2.5 py-1.5 text-theme-muted">Advance</span>
      <span className="border border-brand-line px-2.5 py-1.5 text-theme-muted">Attack</span>
      <span className="border border-brand-oxblood px-2.5 py-1.5 text-brand-oxblood-ink">Rally</span>
    </div>

    <div className="mt-4 border-l-2 border-brand-gold bg-theme-surface p-3">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-brand-gold">
        {keyword.name} · {keyword.type}
      </p>
      <p className="flavour mt-1.5 text-[15px] leading-[1.45] text-brand-body">
        &ldquo;{keyword.description}&rdquo;
      </p>
    </div>
  </div>
);

/**
 * 02: cream.
 *
 * Inside `.sheet`, so `--paper*` and `--ink*` arrive by inheritance and the
 * panel carries no colour of its own. The contrast against the iron chrome is
 * the whole visual idea, and it is also literally how the app is built: the
 * frame is iron, the content is paper.
 *
 * The territory names are published Carcass Front zones. Held and lost are
 * states this panel is illustrating, not a claim about anyone's campaign.
 */
const ChroniclePreview: React.FC<Pick<LandingPreviews, 'territories'>> = ({ territories }) => (
  <div className="sheet border border-theme-border" aria-hidden>
    <p className="border-b border-theme-border bg-theme-elevated px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-theme-muted">
      Carcass Front · Week 5
    </p>
    <ul>
      {territories.map((name, i) => (
        <li
          key={name}
          className={`flex items-center justify-between px-3 py-2.5 font-mono text-[13px] ${
            i % 2 ? 'bg-theme-elevated' : ''
          }`}
        >
          <span className="text-theme-text">{name}</span>
          <span className={i % 2 ? 'text-brand-oxblood' : 'text-status-legal'}>
            {i % 2 ? 'Lost wk 5' : 'Held'}
          </span>
        </li>
      ))}
    </ul>
    <p className="flavour border-t border-theme-border px-3 py-3 text-[15px] leading-[1.48] text-theme-muted">
      They took the causeway before dawn and held it until the tide turned. Two
      of ours will not march again.
    </p>
  </div>
);

/**
 * 03: the armoury, on paper, with the armoury named.
 *
 * Naming the faction is not decoration. Wargear is priced per faction — the
 * same Automatic Rifle is 40 Ducats in one table and 2 Glory in another — and
 * a price column with no armoury over it is the exact error the app's own
 * arsenal was rebuilt to stop making.
 */
const ArmouryPreview: React.FC<Pick<LandingPreviews, 'armoury'>> = ({ armoury }) => (
  <div className="sheet border border-theme-border lg:border-r-0" aria-hidden>
    <p className="border-b border-theme-border bg-theme-elevated px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-theme-muted">
      {armoury.faction} Armoury
    </p>

    {/*
      Its own scroller, so a five-column table never scrolls the page
      sideways on a phone (docs/MOBILE.md — `overflow-x: hidden` on the body
      is never the fix).
    */}
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[340px] border-collapse font-mono text-[13px]">
        <thead>
          <tr className="border-b border-theme-border text-left uppercase tracking-[0.14em] text-theme-muted">
            <th scope="col" className="px-3 py-2 text-xs font-normal">Item</th>
            <th scope="col" className="w-[92px] px-3 py-2 text-xs font-normal">Range</th>
            {/*
              Hidden below `sm:`, not scrolled off it. The point of the panel
              is that one armoury prices in two currencies, and a phone reader
              who has to drag sideways to reach the Ducats and Glory columns
              never sees it. Keywords are the column that can wait.
            */}
            <th scope="col" className="hidden px-3 py-2 text-xs font-normal sm:table-cell">Keywords</th>
            <th scope="col" className="w-[78px] px-3 py-2 text-right text-xs font-normal">Ducats</th>
            <th scope="col" className="w-[68px] px-3 py-2 text-right text-xs font-normal">Glory</th>
          </tr>
        </thead>
        <tbody>
          {armoury.rows.map((row, i) => (
            <tr key={row.name} className={i % 2 ? 'bg-theme-elevated' : ''}>
              <td className="px-3 py-2 text-theme-text">{row.name}</td>
              <td className="px-3 py-2 text-theme-muted">{row.range}</td>
              <td className="hidden px-3 py-2 text-theme-muted sm:table-cell">
                {row.keywords.length ? row.keywords.slice(0, 2).join(', ') : '—'}
              </td>
              <td className={`px-3 py-2 text-right ${row.ducats ? 'text-theme-text' : 'text-theme-muted'}`}>
                {price(row.ducats, 'D')}
              </td>
              {/*
                Oxblood is the Glory colour, so it belongs on a Glory price and
                not on the dash that stands for the absence of one. A red em
                dash reads as a cost.
              */}
              <td className={`px-3 py-2 text-right ${row.glory ? 'text-brand-oxblood' : 'text-theme-muted'}`}>
                {price(row.glory, 'G')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
