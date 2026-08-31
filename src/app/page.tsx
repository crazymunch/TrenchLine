import { redirect } from 'next/navigation';

/**
 * The front door.
 *
 * Everything the app does now lives under a real route in the `(app)` group,
 * so `/` has nothing of its own to render. It sends you to the roster, which
 * then forwards to whichever warband is active — `/roster/wb-al-qarn-rihla`.
 *
 * A redirect rather than a copy of the dashboard: two places rendering the
 * same view is how they drift, and one of them ends up with a URL you cannot
 * share.
 */
export default function Home() {
  redirect('/roster');
}
