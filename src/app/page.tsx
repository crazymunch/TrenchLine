'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Shield, Swords, Flag, Users, BookOpen, ArrowRight, LogIn, Check,
} from 'lucide-react';

/**
 * The front door.
 *
 * `/` used to `redirect('/roster')`, so the app had no front door at all: a
 * visitor's first screen was a warband builder with no warband in it, and
 * nothing anywhere said what TrenchLine is or what else it does. The five
 * sections were reachable only from a nav bar you had to already understand.
 *
 * Deliberately NOT reading saved warbands. This page sits outside the `(app)`
 * group and so outside the shell that calls `hydrateStore`, and the store is
 * created at import time on the client — reading `localStorage` here would
 * make the first client render disagree with HTML built at deploy time, which
 * is React #418 and a bug this app has already been bitten by twice. "Warband
 * Roster" goes straight to whichever warband is active, which is the same
 * answer without the mismatch.
 */

const SECTIONS = [
  {
    href: '/roster',
    label: 'Warband Roster',
    icon: Shield,
    blurb:
      'Build a warband against the published Armoury Tables. Costs, carrying '
      + 'limits and recruitment rules are checked as you go, quoting the '
      + 'sentence that forbids a thing rather than just refusing it.',
  },
  {
    href: '/play',
    label: 'Tabletop Combat',
    icon: Swords,
    blurb:
      'A one-handed HUD for the table: turn order, wounds, blood markers and '
      + 'a rules lookup, sized for a phone beside the terrain.',
  },
  {
    href: '/campaign',
    label: 'Crusade Campaign',
    icon: Flag,
    blurb:
      'Run a campaign — territories, match results and a chronicle. Play the '
      + 'app’s own theatres, or the Carcass Front Campaign on its 32 '
      + 'published zones.',
  },
  {
    href: '/directory',
    label: 'Roster Directory',
    icon: Users,
    blurb:
      'The warbands other players in your campaign have fielded, and what '
      + 'they are carrying.',
  },
  {
    href: '/codex',
    label: 'Rules Codex',
    icon: BookOpen,
    blurb:
      'The arsenal, the scenarios with their deployment maps, Patrons, '
      + 'Injuries and the campaign tables — searchable.',
  },
];

/** What signing in adds. Deliberately short, and all of it true today. */
const SIGNED_IN_GIVES = [
  'Your warbands saved to your account, not just this browser',
  'Campaigns shared with the other players in them',
  'Your roster visible in a campaign’s directory',
];

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="min-h-dvh bg-theme-base text-theme-text">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-16">

        <header className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-theme-primary">
            Trench Crusade
          </p>
          <h1 className="font-gothic text-4xl font-bold leading-tight tracking-wide text-theme-text sm:text-5xl lg:text-6xl">
            TrenchLine
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-theme-muted sm:text-lg">
            A warband builder and campaign companion, built for the table. Every
            statline, cost and rule is derived from the published catalogues and
            rulebooks &mdash; nothing here is typed in by hand.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/roster"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-theme-primary bg-theme-primary px-5 py-3 font-mono text-sm font-bold uppercase tracking-wide text-theme-base transition-colors hover:bg-theme-primary-hover"
            >
              <Shield className="h-4 w-4" />
              <span>Build a warband</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/codex"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-theme-border bg-theme-surface px-5 py-3 font-mono text-sm font-bold uppercase tracking-wide text-theme-text transition-colors hover:border-theme-primary"
            >
              <BookOpen className="h-4 w-4" />
              <span>Browse the rules</span>
            </Link>
          </div>
        </header>

        <section className="mt-12 lg:mt-16" aria-labelledby="sections-heading">
          <h2
            id="sections-heading"
            className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-theme-muted"
          >
            Everything in here
          </h2>
          {/*
            One column on a phone, two from `sm:`. Written out rather than
            interpolated: a class name built from a variable never reaches the
            compiled stylesheet (docs/MOBILE.md).
          */}
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SECTIONS.map(({ href, label, icon: Icon, blurb }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex h-full min-h-[44px] flex-col gap-2 rounded border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary"
                >
                  <span className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wide text-theme-primary">
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </span>
                  <span className="text-sm leading-relaxed text-theme-muted">
                    {blurb}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-10 rounded border border-theme-border bg-theme-surface p-5 lg:mt-14"
          aria-labelledby="account-heading"
        >
          {/*
            `status` is checked before `session`, so the signed-out prompt is
            not shown for the moment it takes the session to resolve — a
            "Sign in" that flashes at someone already signed in reads as having
            been logged out.
          */}
          {status === 'loading' ? (
            <p className="font-mono text-sm text-theme-muted">Checking your session&hellip;</p>
          ) : session ? (
            <>
              <h2 id="account-heading" className="font-mono text-sm font-bold uppercase tracking-wide text-theme-primary">
                Signed in{session.user?.name ? ` as ${session.user.name}` : ''}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-theme-muted">
                Your warbands are saved to your account and travel with you between
                devices.
              </p>
            </>
          ) : (
            <>
              <h2 id="account-heading" className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wide text-theme-primary">
                <LogIn className="h-4 w-4" />
                Sign in to keep your warbands
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-theme-muted">
                You do not need an account to build a warband &mdash; everything works
                in this browser, offline included. An account adds:
              </p>
              <ul className="mt-3 space-y-1.5">
                {SIGNED_IN_GIVES.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-theme-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-theme-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {/*
                Into the app, where the sign-in sheet lives, rather than a
                second copy of it here. Two sign-in forms is how one of them
                ends up out of date with the auth it calls.
              */}
              <Link
                href="/roster"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-theme-primary px-5 py-3 font-mono text-sm font-bold uppercase tracking-wide text-theme-primary transition-colors hover:bg-theme-primary hover:text-theme-base"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in</span>
              </Link>
            </>
          )}
        </section>

        <footer className="mt-12 border-t border-theme-border pt-6">
          <p className="text-xs leading-relaxed text-theme-muted">
            TrenchLine is an unofficial companion. Trench Crusade is the work of
            its creators; the rules and statlines here are read from the
            published catalogues and rulebooks rather than reproduced by hand,
            and anything the sources do not state is left blank rather than
            filled in.
          </p>
        </footer>
      </div>
    </main>
  );
}
