// -----------------------------------------------------------------------------
// Automatic expiration — when a player's `availableUntil` (Section 4.1) has
// passed, every viewer's board should treat them as Unavailable, live, with
// no manual refresh. This module is the pure, side-effect-free half of that
// behavior (mirrors `filters.ts` / `sort.ts`'s existing convention); the
// realtime "when do we recompute" half lives in `hooks/useExpirationClock.ts`.
//
// Design note on where the correction lives: `firestore.rules` only ever
// lets a player write their *own* document (Section 13, rule 3) — no
// viewer's client can legally flip another player's stored `status` field.
// So this module never mutates or writes anything; it derives an *effective*
// status for display/filter/sort purposes only. The one place the actual
// stored `status` field gets corrected is `hooks/useAutoExpireOwnStatus.ts`,
// which runs only against the signed-in caller's own record, through the
// same `writePlayerStatus()` path `EditMyStatusModal` already uses — fully
// within the existing rules, no rules change needed.
// -----------------------------------------------------------------------------

import type { Player, PlayerStatusValue } from '../types/models';

/**
 * True when `player`'s declared availability window has ended: they're
 * currently `available` or `maybe`, they set an `availableUntil`, and that
 * timestamp is at or before `now`. An `unavailable` player is never
 * "expired" — there's no window to run out on. Comparison is plain
 * epoch-millis vs. epoch-millis, so it's inherently timezone-safe: no
 * `Date` string parsing, no viewer-local-time math, on either side.
 */
export function isExpired(player: Player, now: number): boolean {
  if (player.status === 'unavailable') return false;
  if (player.availableUntil === null) return false;
  return player.availableUntil <= now;
}

/** The effective status to *display* right now: `unavailable` once expired, otherwise exactly what the player declared. Never touches Firestore. */
export function getEffectiveStatus(player: Player, now: number): PlayerStatusValue {
  return isExpired(player, now) ? 'unavailable' : player.status;
}

/**
 * Pure transform: `players`, with `status` overridden to each player's
 * effective status as of `now`. Every other field (including
 * `availableUntil` itself, so "Available until 9:40 PM" can still be shown
 * even though it's now in the past) is passed through unchanged. Returns a
 * new array; never mutates the input — same convention as `filterPlayers` /
 * `sortPlayers`, so this can be composed in front of either without either
 * of those modules needing to know expiration exists.
 *
 * Callers should feed the *result* of this into search/filter/sort/summary,
 * not the raw roster — every one of those already reads `player.status`
 * generically and needs no expiration-specific change of its own.
 */
export function applyEffectiveStatus(players: Player[], now: number): Player[] {
  return players.map((player) => {
    const effective = getEffectiveStatus(player, now);
    return effective === player.status ? player : { ...player, status: effective };
  });
}

/**
 * The soonest future moment (epoch millis, strictly after `now`) at which
 * some `available`/`maybe` player's `availableUntil` will pass, or `null`
 * if nothing in `players` is due to expire. Used to schedule exactly one
 * precise wake-up rather than polling on an interval — see
 * `useExpirationClock`.
 */
export function nextExpirationTime(players: Player[], now: number): number | null {
  let soonest: number | null = null;
  for (const player of players) {
    if (player.status === 'unavailable') continue;
    if (player.availableUntil === null) continue;
    if (player.availableUntil <= now) continue; // already expired, not "future"
    if (soonest === null || player.availableUntil < soonest) {
      soonest = player.availableUntil;
    }
  }
  return soonest;
}
