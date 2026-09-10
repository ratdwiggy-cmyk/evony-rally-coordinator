import type { Player, PlayerStatusValue } from '../types/models';

/**
 * Roster filtering (Section 5.2) — a pure, side-effect-free data transform,
 * independent of `search.ts` (Section 5.3, untouched by this phase) so the
 * two can be composed by whoever owns the derived list (`StatusBoard.tsx`)
 * without either module knowing the other exists.
 *
 * Semantics, per spec: **AND across filter groups, OR within a group** —
 * e.g. Looking For: Hydra OR Cerberus, AND Status: Available. An empty
 * selection within a group means "no restriction from this group" (matches
 * everyone), consistent with the rest of the app's "unfiltered by default"
 * behavior (see `filterPlayersByIgn`'s same convention for an empty query).
 */

/** One selectable value per filter group. All arrays are option/category ids
 * (matching `LookingForOption.id` / `BossCategory.id`), never display labels. */
export interface FilterState {
  /** Status filter (Section 4.1: Available / Maybe / Unavailable). OR within this group. */
  status: PlayerStatusValue[];
  /** Scouting filter (Section 4). A simple on/off — there's only one boolean field to filter on. */
  scouting: boolean;
  /** "Can Lead" filter — boss-category ids the player has declared they can lead. OR within this group. */
  canLead: string[];
  /** "Looking For" filter — tag ids the player has declared they're looking for. OR within this group. */
  lookingFor: string[];
  /** Boss Category filter — shows players with *any* declared capability in the selected
   * category/categories (Section 5.2), i.e. matched against `player.capability`'s keys, not `canLead`. */
  bossCategory: string[];
}

/** The "nothing selected" state — every group unrestricted, matching the full roster. */
export const EMPTY_FILTER_STATE: FilterState = {
  status: [],
  scouting: false,
  canLead: [],
  lookingFor: [],
  bossCategory: [],
};

/** True if at least one filter group is currently restricting the roster. */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.status.length > 0 ||
    filters.scouting ||
    filters.canLead.length > 0 ||
    filters.lookingFor.length > 0 ||
    filters.bossCategory.length > 0
  );
}

/** Total number of individual selections across every group — drives the
 * "N active" badge in `FilterBar`. */
export function activeFilterCount(filters: FilterState): number {
  return (
    filters.status.length +
    (filters.scouting ? 1 : 0) +
    filters.canLead.length +
    filters.lookingFor.length +
    filters.bossCategory.length
  );
}

/** OR-within-group helper: true when `selected` is empty (no restriction) or
 * at least one selected id is present in `declared`. */
function matchesAnySelected(selected: string[], declared: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((id) => declared.includes(id));
}

/**
 * Applies every active filter group to `players`, AND-ed together. Pure and
 * side-effect-free (no React, no Firestore) so it's reusable/testable
 * independently, mirroring `filterPlayersByIgn`. An all-empty `filters`
 * returns the input roster unchanged.
 */
export function filterPlayers(players: Player[], filters: FilterState): Player[] {
  if (!hasActiveFilters(filters)) return players;

  return players.filter((player) => {
    if (filters.status.length > 0 && !filters.status.includes(player.status)) {
      return false;
    }
    if (filters.scouting && !player.scouting) {
      return false;
    }
    if (!matchesAnySelected(filters.canLead, player.canLead)) {
      return false;
    }
    if (!matchesAnySelected(filters.lookingFor, player.lookingFor)) {
      return false;
    }
    if (filters.bossCategory.length > 0) {
      const declaredCapabilityCategories = Object.keys(player.capability);
      if (!filters.bossCategory.some((id) => declaredCapabilityCategories.includes(id))) {
        return false;
      }
    }
    return true;
  });
}
