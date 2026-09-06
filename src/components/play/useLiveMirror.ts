'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { storage, type LiveMatchSummary } from '../../services/storage';
import { boardChanged, parseBoard, type LiveBoard } from '../../services/liveMatch';

/**
 * The two ends of the live mirror: one device pushing, others polling.
 *
 * LIVE-1. The loops live in hooks rather than in the store because they are
 * lifecycles, not state: they start when a screen is open and must stop when
 * it is not. A `setInterval` owned by a Zustand slice outlives the component
 * that wanted it, and the failure — a background tab writing to somebody's
 * match forever — is exactly the kind that never shows up in testing.
 */

/**
 * How often either end talks to the server.
 *
 * Two seconds is chosen against the game, not against the network. A player
 * takes several seconds to resolve an activation, so a watcher two seconds
 * behind is watching the same moment; at ten they are reading history, and at
 * half a second the writes cost more than the freshness is worth.
 */
const INTERVAL_MS = 2_000;

interface HostState {
  matchId: string | null;
  revision: number;
  /** Shown, never swallowed: a mirror that has silently stopped is a lie. */
  error: string | null;
  pushing: boolean;
}

/**
 * Push this device's board, coalesced.
 *
 * `board` is expected to be rebuilt on every render — `boardFrom` is cheap —
 * and this decides whether it is worth sending. Two guards, and they do
 * different jobs: `boardChanged` stops a write when nothing a watcher can see
 * has moved, and the interval stops a burst when a player is stepping wounds
 * down one tap at a time.
 */
export function useLiveHost(
  enabled: boolean,
  campaignId: string | undefined,
  board: LiveBoard | null,
): HostState & { stop: () => Promise<void> } {
  const [state, setState] = useState<HostState>({
    matchId: null, revision: 0, error: null, pushing: false,
  });

  /* Refs, not state: the loop reads these and must not restart when they
     change — a `board` in the dependency array would tear down and rebuild the
     interval on every wound stepped. */
  const boardRef = useRef<LiveBoard | null>(board);
  const sentRef = useRef<LiveBoard | null>(null);
  const matchRef = useRef<string | null>(null);
  boardRef.current = board;

  useEffect(() => {
    if (!enabled || !campaignId) return;

    /*
      Minted once, before the first request, and kept.

      Same reason a campaign's cloud id is minted before publishing: the host
      writes before it knows the server heard, so a lost response has to be
      retried under an id this device already holds rather than starting a
      second match.
    */
    if (!matchRef.current) {
      if (typeof crypto?.randomUUID !== 'function') {
        setState((s) => ({ ...s, error: 'This browser cannot mint a match id.' }));
        return;
      }
      matchRef.current = crypto.randomUUID();
      setState((s) => ({ ...s, matchId: matchRef.current }));
    }

    let live = true;
    const tick = async () => {
      const current = boardRef.current;
      const matchId = matchRef.current;
      if (!current || !matchId) return;
      // Nothing a watcher could see has moved. Not a write.
      if (!boardChanged(sentRef.current, current)) return;

      setState((s) => ({ ...s, pushing: true }));
      const res = await storage.pushLiveMatch(matchId, campaignId, current);
      if (!live) return;

      if (!res.ok) {
        /*
          `sentRef` is NOT updated on a failure, so the next tick retries the
          same board rather than treating it as delivered. That is what makes a
          dropped update repair itself — the property the snapshot design buys.
        */
        setState((s) => ({
          ...s,
          pushing: false,
          error: res.reason === 'unauthenticated'
            ? 'Sign in to share this board.'
            : res.detail,
        }));
        return;
      }
      sentRef.current = current;
      setState((s) => ({ ...s, pushing: false, error: null, revision: res.data.revision }));
    };

    void tick();
    const timer = setInterval(() => { void tick(); }, INTERVAL_MS);
    return () => { live = false; clearInterval(timer); };
  }, [enabled, campaignId]);

  /** End the match on the server. The host's to call; the server enforces it. */
  const stop = useCallback(async () => {
    const matchId = matchRef.current;
    matchRef.current = null;
    sentRef.current = null;
    setState({ matchId: null, revision: 0, error: null, pushing: false });
    if (matchId) await storage.endLiveMatch(matchId);
  }, []);

  return { ...state, stop };
}

interface WatchState {
  board: LiveBoard | null;
  revision: number;
  error: string | null;
  /** When a snapshot last arrived, so the UI can say how stale it is. */
  at: string | null;
}

/**
 * Follow somebody else's board.
 *
 * A 304 is the normal answer and a SUCCESS: it means the board has not moved,
 * which over a table where a player is thinking is most of the time. Treating
 * it as an error would put a spinner over a board that is simply still.
 */
export function useLiveWatch(matchId: string | null): WatchState {
  const [state, setState] = useState<WatchState>({
    board: null, revision: 0, error: null, at: null,
  });
  const revisionRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!matchId) {
      revisionRef.current = undefined;
      setState({ board: null, revision: 0, error: null, at: null });
      return;
    }

    let live = true;
    const tick = async () => {
      const res = await storage.pollLiveMatch(matchId, revisionRef.current);
      if (!live) return;

      if (!res.ok) {
        setState((s) => ({
          ...s,
          error: res.reason === 'unauthenticated'
            ? 'You are not in that campaign.'
            : res.detail,
        }));
        return;
      }
      // Still the board we already have. Nothing to draw, nothing to say.
      if (res.data.unchanged) {
        setState((s) => (s.error ? { ...s, error: null } : s));
        return;
      }

      try {
        const board = parseBoard(res.data.state);
        revisionRef.current = res.data.revision;
        setState({
          board, revision: res.data.revision, error: null,
          at: new Date().toISOString(),
        });
      } catch (e) {
        /* A payload that is not a board is reported, not rendered as an empty
           table — a watcher shown "no models" cannot tell that from a wipe. */
        setState((s) => ({ ...s, error: (e as Error).message }));
      }
    };

    void tick();
    const timer = setInterval(() => { void tick(); }, INTERVAL_MS);
    return () => { live = false; clearInterval(timer); };
  }, [matchId]);

  return state;
}

/** What is live in a campaign, refreshed on the same cadence. */
export function useLiveMatches(campaignId: string | undefined): LiveMatchSummary[] {
  const [matches, setMatches] = useState<LiveMatchSummary[]>([]);

  useEffect(() => {
    if (!campaignId) { setMatches([]); return; }
    let live = true;
    const tick = async () => {
      const res = await storage.listLiveMatches(campaignId);
      /* A failed listing leaves the last one on screen rather than blanking
         it: "we could not refresh" and "nobody is playing" are different
         things and must not look the same. */
      if (live && res.ok) setMatches(res.data);
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, INTERVAL_MS * 2);
    return () => { live = false; clearInterval(timer); };
  }, [campaignId]);

  return matches;
}
