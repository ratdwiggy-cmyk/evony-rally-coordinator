import { useEffect, useState } from 'react';
import { nextExpirationTime } from '../utils/expiration';
import type { Player } from '../types/models';

/**
 * Drives automatic expiration's "realtime, no manual refresh" requirement.
 * Returns the current time (epoch millis) as a piece of React state that
 * updates itself — no polling interval, no per-second re-render. Instead,
 * on every roster change (or after it last fired), this schedules exactly
 * one `setTimeout` for the soonest upcoming `availableUntil` in `players`
 * (via `nextExpirationTime`) and wakes precisely then, which lets the
 * effect re-run and schedule the *next* one — chaining through every future
 * expiration in the current roster with the minimum number of timers.
 *
 * Also resyncs immediately whenever the tab becomes visible again, so a
 * backgrounded/throttled tab (where `setTimeout` can be delayed by the
 * browser) never shows stale "still available" information once the person
 * is actually looking at it again — the "no stale information" requirement.
 *
 * Callers should feed the returned value into `applyEffectiveStatus(players,
 * now)`, not read it for anything else — this hook has no opinion on
 * display, only on when a recompute is due.
 */
export function useExpirationClock(players: Player[]): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const next = nextExpirationTime(players, now);
    if (next === null) return undefined;

    const delay = Math.max(0, next - Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [players, now]);

  useEffect(() => {
    function resync() {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    }
    document.addEventListener('visibilitychange', resync);
    return () => document.removeEventListener('visibilitychange', resync);
  }, []);

  return now;
}
