import React from 'react';
import Link from 'next/link';
import { CONTACT, EFFECTIVE } from './operator';
import { Mail } from './prose';

/**
 * The shell the three documents share.
 *
 * ## Why these pages exist at all
 *
 * Google Safe Browsing flagged trenchline.app as a deceptive page. Nothing was
 * compromised — production serves no third-party script, no injected content
 * and no off-origin asset, and that was checked against the deployed HTML.
 * What the site had was the PROFILE of a phishing page: a domain a few weeks
 * old, an email-and-password form, a Google sign-in button beside it, and not
 * one page saying who ran it, what it did with an address, or where to
 * complain. The whole footer was a single disclaimer sentence.
 *
 * These three pages are the missing half of that picture. They are linked from
 * the landing footer, listed in the sitemap, allowed in robots.txt, and they
 * render for a signed-out visitor — which is the only visitor a reviewer is.
 *
 * ## Not inside the app shell
 *
 * A route group of their own, so they get none of `(app)/layout.tsx`: no
 * store hydration, no dataset, no sidebar, no service worker. A document
 * should be readable by someone with no account and no interest in acquiring
 * one, and it should not pull 2.7 MB of catalogue to say so. They are static.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-theme-base">
      {/*
        A masthead, not the app's navbar. The wordmark is a link home because
        the first question a reviewer or a stranger has on a legal page is
        "what is this site", and the answer must be one tap away.
      */}
      <header className="border-b border-theme-border">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-8">
          {/*
            `min-h-[44px]` on every one of these, per docs/MOBILE.md §3. They
            are navigation controls, so the touch floor applies as written —
            `py-2` alone gave 34px and 29px, which is what the check caught.
          */}
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center font-gothic text-[19px] font-bold tracking-[-0.02em] text-theme-text hover:text-brand-gold"
          >
            TRENCHLINE
          </Link>
          <nav className="flex flex-wrap gap-x-5 font-mono text-[12px] uppercase tracking-[0.14em]">
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
      </header>

      <main className="mx-auto max-w-[820px] px-4 pb-16 pt-8 sm:px-8 sm:pt-12">{children}</main>

      <footer className="border-t border-theme-border">
        <div className="mx-auto flex max-w-[820px] flex-col gap-2 px-4 py-8 text-[14px] leading-[1.6] text-theme-muted sm:px-8">
          <p>
            Questions, corrections, or a request to delete your account: <Mail address={CONTACT} />
          </p>
          <p>
            TrenchLine is an unofficial companion. Trench Crusade is the work of its
            creators, and this project is not endorsed by or affiliated with them.
          </p>
          <p className="font-mono text-[12px] uppercase tracking-[0.12em]">
            Last updated {EFFECTIVE}
          </p>
        </div>
      </footer>
    </div>
  );
}
