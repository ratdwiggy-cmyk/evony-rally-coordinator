import { useId, useState } from 'react';
import { Button } from '../ui';
import type { SortKey, SortState } from '../../utils/sort';
import { DEFAULT_SORT_STATE } from '../../utils/sort';
import type { BossCategory } from '../../types/models';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'availableFirst', label: 'Available first' },
  { value: 'recentlyUpdated', label: 'Recently updated' },
  { value: 'ign', label: 'IGN' },
  { value: 'activity', label: 'Activity' },
  { value: 'scouting', label: 'Scouting' },
  { value: 'capabilityCategory', label: 'Capability category' },
];

interface SortBarProps {
  sort: SortState;
  onChange: (next: SortState) => void;
  bossCategories: BossCategory[];
}

/**
 * Roster sorting controls (Section 5.1): Available first, Recently updated,
 * IGN, Activity, Scouting, and Capability category — exactly one active at
 * a time (unlike `FilterBar`'s multi-select groups, a roster has exactly
 * one order at once), plus a single reverse-direction toggle that applies
 * uniformly to whichever sort is active (see `utils/sort.ts`'s doc comment
 * for why one uniform toggle instead of a per-key ascending/descending
 * vocabulary).
 *
 * Fully controlled, same pattern as `FilterBar`/`SearchBar`: `StatusBoard.tsx`
 * owns `SortState` so it naturally survives every live roster snapshot
 * update untouched, and this component just reflects whatever `sort` it's
 * given and reports changes via `onChange`. No filtering or search logic
 * here — those stay entirely in `filters.ts`/`search.ts`, untouched by this
 * phase.
 *
 * Reuses the exact toggle-button (`aria-pressed` + variant-swap) pattern
 * `FilterBar` already established, so every chip inherits the same 44px
 * touch-target floor and focus styling with no new UI primitive introduced.
 * The panel collapses via the same "functional, not decorative" header
 * toggle `FilterBar` uses, for the same reason (six sort options plus a
 * conditional boss-category picker shouldn't permanently eat vertical space
 * on a phone screen). Starts expanded; collapse state is local UI-only, not
 * part of `SortState`.
 *
 * When `sort.key === 'capabilityCategory'`, a second chip row lets the user
 * pick *which* boss category to sort by (Section 5.1: "each boss category
 * is its own sort key"). If the alliance has no boss categories declared,
 * that row explains why instead of rendering an empty group — same
 * fallback `FilterBar` already uses for its own Can Lead / Boss Category
 * groups when `bossCategories` is empty.
 */
export function SortBar({ sort, onChange, bossCategories }: SortBarProps) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();

  function selectKey(key: SortKey) {
    if (key === sort.key) return;
    onChange({
      ...sort,
      key,
      // Switching away from Capability category clears the picked
      // category so a stale selection doesn't silently linger unused;
      // switching back to it starts with none picked (same "no
      // restriction yet" convention `capabilityCategoryId: null` already
      // represents in `sortPlayers`).
      capabilityCategoryId: key === 'capabilityCategory' ? sort.capabilityCategoryId : null,
    });
  }

  function selectCapabilityCategory(id: string) {
    onChange({ ...sort, capabilityCategoryId: id });
  }

  function toggleDirection() {
    onChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  }

  function resetToDefault() {
    onChange(DEFAULT_SORT_STATE);
  }

  const isDefault =
    sort.key === DEFAULT_SORT_STATE.key &&
    sort.direction === DEFAULT_SORT_STATE.direction &&
    sort.capabilityCategoryId === DEFAULT_SORT_STATE.capabilityCategoryId;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-ink-700 bg-ink-800/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-h-[44px] items-center gap-2 rounded-md px-1 text-sm font-medium text-ash-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={expanded ? 'rotate-90 transition-none' : 'transition-none'}
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sort
        </button>

        {!isDefault && (
          <Button type="button" variant="ghost" onClick={resetToDefault} className="px-3 text-xs">
            Reset sort
          </Button>
        )}
      </div>

      {expanded && (
        <div id={panelId} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ash-500">Sort by</legend>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort roster by">
              {SORT_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={sort.key === option.value ? 'primary' : 'secondary'}
                  aria-pressed={sort.key === option.value}
                  onClick={() => selectKey(option.value)}
                  className="px-3 text-xs"
                >
                  {option.label}
                </Button>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={toggleDirection}
                aria-label={sort.direction === 'asc' ? 'Sort ascending, click to reverse' : 'Sort descending, click to reverse'}
                className="min-w-[44px] px-3 text-xs"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={sort.direction === 'desc' ? 'rotate-180 transition-none' : 'transition-none'}
                  aria-hidden="true"
                >
                  <path d="M12 5v14M12 19l-5-5M12 19l5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          </fieldset>

          {sort.key === 'capabilityCategory' && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-medium text-ash-500">Category</legend>
              {bossCategories.length === 0 ? (
                <p className="text-xs text-ash-400">Your alliance hasn't set up any boss categories yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Sort by capability category">
                  {bossCategories.map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={sort.capabilityCategoryId === category.id ? 'primary' : 'secondary'}
                      aria-pressed={sort.capabilityCategoryId === category.id}
                      onClick={() => selectCapabilityCategory(category.id)}
                      className="px-3 text-xs"
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
              )}
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
