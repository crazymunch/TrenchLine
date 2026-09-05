import React from 'react';
import { Landing } from '@/components/landing/Landing';
import { landingPreviews } from '@/components/landing/previews';

/**
 * The front door, as a server component.
 *
 * This file exists only to keep `trenchline.generated.ts` — 2.7 MB of
 * catalogue — out of the bundle a first-time visitor downloads before they
 * have decided whether they want the app. The previews are read from the
 * dataset here, on the build machine, and the two dozen strings they need
 * cross into `Landing` as props.
 *
 * `Landing` is the client component: it holds the markup and the signed-in
 * redirect, which needs `useSession`. The split is why `/` stays a static
 * document rather than becoming a dynamic route.
 */
export default function Home() {
  return <Landing previews={landingPreviews()} />;
}
