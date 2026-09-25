import Link from 'next/link';

/**
 * A share link that names nothing (SH-1).
 *
 * > An unknown or cleared token is a 404, not an empty sheet.
 *
 * Its own `not-found` rather than the app's, because a share link has one
 * specific way of going wrong and the reader can act on being told which: the
 * person who sent it stopped sharing. An empty sheet, or a generic 404 with a
 * link into the builder, both read as "the roster is gone".
 *
 * It says nothing about whether the token ever existed. A page that
 * distinguished "never a roster" from "shared and then stopped" would let
 * anybody with a list of guesses learn which tokens are real.
 */
export default function ShareNotFound() {
  return (
    <main className="min-h-dvh bg-theme-base text-theme-text flex items-center justify-center px-4 py-10">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-gothic text-2xl sm:text-3xl tracking-tight">
          This link does not lead to a roster
        </h1>
        <p className="font-mono text-xs text-theme-muted leading-relaxed">
          Either the link is wrong, or whoever shared it has stopped sharing.
          Ask them for a new one.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[44px] px-4 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-widest"
        >
          TrenchLine
        </Link>
      </div>
    </main>
  );
}
