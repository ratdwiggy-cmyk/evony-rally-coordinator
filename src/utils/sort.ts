import type { Player, PlayerStatusValue } from '../types/models';

/**
 * Roster sorting (Section 5.1) — a pure, side-effect-free data transform,
 * independent of `filters.ts` and `search.ts` (both untouched by this phase)
 * so it composes on top of whatever list search + filters already produced,
 * exactly as `DEVELOPMENT_STATUS.md`'s "Next development phase" item 2
 * specified: sort runs last, over the already-searched-and-filtered roster.
 *
 * Six sortable dimensions, per this phase's task list: Available first,
 * Recently updated, IGN, Activity, Scouting, and Capability category (a
 * per-boss-category sort — mirroring the spec's "each boss category is its
 * own sort key," Section 5.1). Every comparator below defines a fixed,
 * name-matching "natural" order (e.g. "Available first" truly puts
 * available players first by default), and `direction` is a single uniform
 * reverse toggle applied to whichever comparator is active — there's no
 * separate per-key ascending/descending vocabulary to keep the control
 * surface small and predictable (mirrors `filters.ts`'s preference for a
 * small, uniform state shape over one bespoke shape per group).
 *
 * Stability: every comparator here returns exactly `0` for players that are
 * genuinely tied on the active key (see each function), and this module
 * relies on `Array.prototype.sort`'s guaranteed stability (stable since
 * ES2019 — true of every JS engine this Vite/React app targets) to preserve
 * the incoming, already-searched-and-filtered relative order across those
 * ties. No manual index-tracking is needed to satisfy "stable sorting."
 */

export type SortKey =
  | 'availableFirst'
  | 'recentlyUpdated'
  | 'ign'
  | 'activity'
  | 'scouting'
  | 'capabilityCategory';

export interface SortState {
  key: SortKey;
  /** Uniform reverse toggle applied to whichever comparator `key` selects. */
  direction: 'asc' | 'desc';
  /** A `BossCategory.id`. Only meaningful — and only changes the result —
   * when `key === 'capabilityCategory'`. */
  capabilityCategoryId: string | null;
}

/** The default sort: Available first, ascending (i.e. exactly as named). */
export const DEFAULT_SORT_STATE: SortState = {
  key: 'availableFirst',
  direction: 'asc',
  capabilityCategoryId: null,
};

const STATUS_RANK: Record<PlayerStatusValue, number> = {
  available: 0,
  maybe: 1,
  unavailable: 2,
};

/** Available first, then Maybe, then Unavailable. Ties (same status) → 0,
 * left for the stable sort to resolve via incoming order. */
function compareAvailableFirst(a: Player, b: Player): number {
  return STATUS_RANK[a.status] - STATUS_RANK[b.status];
}

/** Most-recently-updated first by default (`direction: 'asc'`). */
function compareRecentlyUpdated(a: Player, b: Player): number {
  return b.lastUpdated - a.lastUpdated;
}

/** Case-insensitive alphabetical by IGN. */
function compareIgn(a: Player, b: Player): number {
  return a.ign.localeCompare(b.ign, undefined, { sensitivity: 'base' });
}

/** Sorts by the player's self-declared Activity/Notes text (`Player.note` —
 * see `PlayerCard.tsx`'s "Activity / Notes" label for this same field, per
 * `DEVELOPMENT_STATUS.md`). Players with no note declared sort after every
 * player who has one, in both directions — an absent note isn't
 * meaningfully "less than" or "greater than" real text, so it's parked at
 * the end rather than flipped to the front on reverse. */
function compareActivity(a: Player, b: Player): number {
  const aNote = a.note?.trim() ?? '';
  const bNote = b.note?.trim() ?? '';
  if (!aNote && !bNote) return 0;
  if (!aNote) return 1;
  if (!bNote) return -1;
  return aNote.localeCompare(bNote, undefined, { sensitivity: 'base' });
}

/** Scouting players first. */
function compareScouting(a: Player, b: Player): number {
  return Number(b.scouting) - Number(a.scouting);
}

/** Sorts by declared capability *value* for one specific boss category
 * (`Player.capability[categoryId]`). Per `models.ts`, capability values are
 * free-form strings ("Lv5", "Hard 60") that are "purely informational,
 * never parsed/ranked" (Section 4.5) — so this is a plain lexical string
 * compare, never a numeric level parse. Players with no declared capability
 * for the chosen category sort after every player who has one, matching
 * `compareActivity`'s "absence goes last" convention. */
function makeCompareCapabilityCategory(categoryId: string) {
  return (a: Player, b: Player): number => {
    const aValue = a.capability[categoryId]?.trim() ?? '';
    const bValue = b.capability[categoryId]?.trim() ?? '';
    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;
    return aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
  };
}

/**
 * Applies the active sort to `players`. Returns a new array; never mutates
 * the input, consistent with `filterPlayers` / `filterPlayersByIgn`'s same
 * pure-function convention (composed last — see module doc — this should
 * normally be called with the result of those two, not the raw roster).
 *
 * When `sort.key === 'capabilityCategory'` and no `capabilityCategoryId` is
 * selected yet (e.g. the alliance has no boss categories, or none is picked
 * in the UI), the list is returned in its incoming order unchanged — the
 * same "no restriction" fallback convention `filters.ts` uses for an empty
 * selection.
 */
export function sortPlayers(players: Player[], sort: SortState): Player[] {
  let comparator: (a: Player, b: Player) => number;

  switch (sort.key) {
    case 'availableFirst':
      comparator = compareAvailableFirst;
      break;
    case 'recentlyUpdated':
      comparator = compareRecentlyUpdated;
      break;
    case 'ign':
      comparator = compareIgn;
      break;
    case 'activity':
      comparator = compareActivity;
      break;
    case 'scouting':
      comparator = compareScouting;
      break;
    case 'capabilityCategory': {
      if (!sort.capabilityCategoryId) return players.slice();
      comparator = makeCompareCapabilityCategory(sort.capabilityCategoryId);
      break;
    }
    default:
      return players.slice();
  }

  const sign = sort.direction === 'desc' ? -1 : 1;
  return players.slice().sort((a, b) => sign * comparator(a, b));
}
