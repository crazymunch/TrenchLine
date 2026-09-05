import React from 'react';

/**
 * The typographic kit the three documents share.
 *
 * Not a markdown renderer and deliberately not one: these are three pages that
 * change a few times a year, and a renderer would add a dependency, a
 * sanitiser and a class of injection bug to save no effort. They are React,
 * so a claim in the text can sit next to the constant it is a claim about.
 *
 * Mobile-first, per CLAUDE.md rule 3: 16px body at 375px so iOS does not zoom,
 * a 66-character measure that a phone never reaches, and `sm:` upward for the
 * desktop rhythm. Every class is a literal — nothing here is composed.
 */

export const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2
    id={id}
    className="mt-10 scroll-mt-24 border-t border-theme-border pt-7 font-gothic text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] sm:mt-12 sm:text-[26px]"
  >
    {children}
  </h2>
);

export const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mt-7 font-mono text-[13px] uppercase tracking-[0.14em] text-brand-gold">
    {children}
  </h3>
);

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-4 text-[16px] leading-[1.65] text-theme-text">{children}</p>
);

export const UL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="mt-4 flex flex-col gap-3">{children}</ul>
);

export const LI: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="border-l-2 border-theme-border pl-4 text-[16px] leading-[1.6] text-theme-text">
    {children}
  </li>
);

/** A term being defined — the left half of a "what we store" row. */
export const Term: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="font-mono text-[13px] uppercase tracking-[0.10em] text-brand-plate">
    {children}
  </strong>
);

/**
 * A mail link.
 *
 * `mailto:` and nothing else. No form, because a contact form on a site that
 * has just been flagged for looking like a phishing page is one more box
 * asking a stranger to type something.
 *
 * Deliberately NOT given the 44px touch floor, and not given `.tap` either.
 * MOBILE.md §3 is about controls; this is a word inside a sentence. Growing it
 * would open the line box around it, and `.tap`'s centred 44px overlay would
 * cover the words either side of it — a hit area that steals taps from the
 * paragraph is worse than a small one. Every discrete control on these pages
 * — the masthead, the nav, the footer links — does carry the floor.
 */
export const Mail: React.FC<{ address: string }> = ({ address }) => (
  <a
    href={`mailto:${address}`}
    className="break-all text-brand-oxblood-ink underline underline-offset-4 hover:text-brand-gold"
  >
    {address}
  </a>
);
