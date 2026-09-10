import type { Player } from '../types/models';

/**
 * Free-text search by IGN (Section 5.3) — case-insensitive substring match.
 * An empty/whitespace-only query returns the roster unchanged (no filtering
 * applied), matching the rest of the app's "unfiltered by default" behavior.
 * Pure and side-effect-free so it can be reused (and tested) independently
 * of any component or React state.
 */
export function filterPlayersByIgn(players: Player[], query: string): Player[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return players;

  return players.filter((player) => player.ign.toLowerCase().includes(normalized));
}
