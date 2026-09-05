import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT, NAME } from '../operator';
import { H2, LI, Mail, P, UL } from '../prose';

export const metadata: Metadata = {
  title: 'About TrenchLine',
  description:
    'What TrenchLine is, who runs it, where its rules data comes from, and how to '
    + 'get in touch. An unofficial, non-commercial companion app for Trench Crusade.',
  alternates: { canonical: '/about' },
};

/**
 * Who and what.
 *
 * The page a stranger reads before deciding whether to type a password into
 * the other one. Everything on it is checkable: the data provenance claim is
 * `scripts/fetch-rules.mjs` and `data-sources/`, the "no trackers" claim is
 * the absence of any analytics dependency in package.json, and the hosting
 * claim is the deployment.
 */
export default function AboutPage() {
  return (
    <article>
      <h1 className="font-gothic text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
        About TrenchLine
      </h1>
      <P>
        TrenchLine is a warband builder, tabletop combat companion and campaign
        tracker for <em>Trench Crusade</em>, the skirmish game by Tuomas
        Pirinen and Mike Franchina. It is a hobby project: one person, no
        company, no advertising, no payments, and nothing for sale.
      </P>

      <H2 id="unofficial">It is unofficial</H2>
      <P>
        TrenchLine is not made, endorsed or reviewed by the creators or
        publishers of <em>Trench Crusade</em>. Every rule, statline and cost it
        displays belongs to them. If anything here disagrees with the published
        rulebooks, the rulebooks are right and this app has a bug — please
        report it.
      </P>
      <P>
        If a rights holder would like something changed or removed, write to{' '}
        <Mail address={CONTACT} /> and it will be done.
      </P>

      <H2 id="data">Where the game data comes from</H2>
      <P>
        None of it is typed in by hand. Statlines, costs, keywords, wargear and
        scenarios are read from the published BattleScribe catalogues and the
        official rulebooks by a build script, pinned to a specific upstream
        commit, and regenerated when the sources change. Where a source says
        nothing, the app shows nothing rather than a plausible guess.
      </P>
      <P>
        This matters more than it sounds. An earlier version of this codebase
        invented values that looked right, and roughly 97% of its statlines
        were wrong. The pipeline exists so that a number on a card can always
        be traced back to a document.
      </P>

      <H2 id="privacy">What it does with you</H2>
      <P>
        Almost nothing. There is no analytics, no advertising, no tracking
        pixel and no third-party script — the fonts are compiled into the site
        rather than fetched from anyone. Your warbands live in your browser
        unless you make an account and choose to sync them. The{' '}
        <Link
          href="/privacy"
          className="text-brand-oxblood-ink underline underline-offset-4 hover:text-brand-gold"
        >
          privacy policy
        </Link>{' '}
        lists every field that is stored, and it is short.
      </P>

      <H2 id="who">Who runs it</H2>
      {NAME ? (
        <P>
          TrenchLine is built and operated by {NAME}, a single hobbyist, in their
          own time.
        </P>
      ) : (
        <P>
          TrenchLine is built and operated by one hobbyist in their own time. It
          is not a business and has no staff. Mail sent to the address below is
          read by that person.
        </P>
      )}
      <UL>
        <LI>
          <strong>Contact:</strong> <Mail address={CONTACT} /> — the same address
          for bug reports, rules corrections, privacy requests and takedowns.
        </LI>
        <LI>
          <strong>Bugs:</strong> there is also a report form inside the app,
          under the account menu. It sends a title, a description and a severity,
          and nothing else.
        </LI>
      </UL>

      <H2 id="honest">Two honest limitations</H2>
      <UL>
        <LI>
          It is a companion, not a rules authority. Play what the book says.
        </LI>
        <LI>
          It is maintained by one person, so a reply may take a few days and a
          feature may take longer than that.
        </LI>
      </UL>
    </article>
  );
}
