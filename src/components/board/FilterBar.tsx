import { useId, useState } from 'react';
import { Button } from '../ui';
import { activeFilterCount, hasActiveFilters, EMPTY_FILTER_STATE, type FilterState } from '../../utils/filters';
import type { BossCategory, LookingForOption, PlayerStatusValue } from '../../types/models';

const STATUS_OPTIONS: { value: PlayerStatusValue; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'unavailable', label: 'Unavailable' },
];

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  bossCategories: BossCategory[];
  lookingForOptions: LookingForOption[];
}

/**
 * Roster filtering controls (Section 5.2): Status, Scouting, Can Lead,
 * Looking For, and Boss Category. Every group can be active simultaneously
 * (AND across groups, OR within a group — see `utils/filters.ts`).
 *
 * Fully controlled, same pattern as `SearchBar`: `StatusBoard.tsx` owns
 * `filters` state so it naturally survives every live roster update
 * untouched (identical reasoning to why `searchQuery` survives — this
 * component just reflects whatever `filters` it's given and reports
 * changes via `onChange`). No sort logic here — Section 5.1 stays out of
 * scope for this phase, per `DEVELOPMENT_STATUS.md`.
 *
 * Toggle-button groups reuse the exact `aria-pressed` + variant-swap pattern
 * `EditMyStatusFields.tsx` already established for Looking For/Can Lead, so
 * every chip inherits the same 44px touch-target floor and focus styling
 * with no new UI primitive introduced.
 *
 * The whole panel collapses on a "Filters" toggle — functional, not
 * decorative (per `docs/DESIGN_SYSTEM.md`'s "transitions are functional only,
 * e.g. filter re-sort" allowance) — so five filter groups don't permanently
 * eat vertical space on a phone screen above the roster grid. Starts
 * expanded; state is local UI-only, not part of `FilterState` itself.
 */
export function FilterBar({ filters, onChange, bossCategories, lookingForOptions }: FilterBarProps) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const activeCount = activeFilterCount(filters);
  const anyActive = hasActiveFilters(filters);

  function toggleStatus(value: PlayerStatusValue) {
    const next = filters.status.includes(value)
      ? filters.status.filter((existing) => existing !== value)
      : [...filters.status, value];
    onChange({ ...filters, status: next });
  }

  function toggleInGroup(group: 'canLead' | 'lookingFor' | 'bossCategory', id: string) {
    const list = filters[group];
    const next = list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id];
    onChange({ ...filters, [group]: next });
  }

  function toggleScouting() {
    onChange({ ...filters, scouting: !filters.scouting });
  }

  function clearAll() {
    onChange(EMPTY_FILTER_STATE);
  }

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
          Filters
          {activeCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-gold/15 px-1.5 py-0.5 text-xs font-medium text-gold border border-gold/30">
              {activeCount}
            </span>
          )}
        </button>

        {anyActive && (
          <Button type="button" variant="ghost" onClick={clearAll} className="px-3 text-xs">
            Clear filters
          </Button>
        )}
      </div>

      {expanded && (
        <div id={panelId} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ash-500">Status</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={filters.status.includes(option.value) ? 'primary' : 'secondary'}
                  aria-pressed={filters.status.includes(option.value)}
                  onClick={() => toggleStatus(option.value)}
                  className="px-3 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ash-500">Scouting</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by scouting">
              <Button
                type="button"
                variant={filters.scouting ? 'primary' : 'secondary'}
                aria-pressed={filters.scouting}
                onClick={toggleScouting}
                className="px-3 text-xs"
              >
                Currently scouting
              </Button>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ash-500">Looking for</legend>
            {lookingForOptions.length === 0 ? (
              <p className="text-xs text-ash-400">Your alliance hasn't set up any tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by looking for">
                {lookingForOptions.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={filters.lookingFor.includes(option.id) ? 'primary' : 'secondary'}
                    aria-pressed={filters.lookingFor.includes(option.id)}
                    onClick={() => toggleInGroup('lookingFor', option.id)}
                    className="px-3 text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ash-500">Can lead</legend>
            {bossCategories.length === 0 ? (
              <p className="text-xs text-ash-400">Your alliance hasn't set up any boss categories yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by can lead">
                {bossCategories.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={filters.canLead.includes(category.id) ? 'primary' : 'secondary'}
                    aria-pressed={filters.canLead.includes(category.id)}
                    onClick={() => toggleInGroup('canLead', category.id)}
                    className="px-3 text-xs"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ash-500">
              Boss category <span className="text-ash-500">(has declared capability)</span>
            </legend>
            {bossCategories.length === 0 ? (
              <p className="text-xs text-ash-400">Your alliance hasn't set up any boss categories yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by boss category capability">
                {bossCategories.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={filters.bossCategory.includes(category.id) ? 'primary' : 'secondary'}
                    aria-pressed={filters.bossCategory.includes(category.id)}
                    onClick={() => toggleInGroup('bossCategory', category.id)}
                    className="px-3 text-xs"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            )}
          </fieldset>
        </div>
      )}
    </div>
  );
}
