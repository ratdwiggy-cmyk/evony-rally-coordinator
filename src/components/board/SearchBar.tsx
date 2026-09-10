import { Input } from '../ui';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

/**
 * Free-text IGN search (Section 5.3), rendered above the roster grid in
 * `StatusBoard.tsx`. Deliberately the only interaction this component
 * offers — no sort/filter controls here (`FilterBar`/`SortControl` are a
 * later phase per `DEVELOPMENT_STATUS.md`'s "Next development phase").
 *
 * Fully controlled: `StatusBoard` owns the raw query string (so the input
 * itself is instantly responsive while typing) and separately debounces it
 * before deriving the filtered list (`useDebouncedValue` +
 * `filterPlayersByIgn`) — this component doesn't know or care about the
 * debounce, it just reflects whatever `value` it's given.
 *
 * Placed in `components/board/` (not a new `components/controls/` folder
 * `docs/PROJECT_SPECIFICATION.md` Section 10 sketches) for the same reason
 * `EditMyStatusModal` already deviated from its spec'd `components/editor/`
 * location: a single-component folder isn't worth introducing yet, and
 * every other board-page control (`StatusBoardSummary`) already lives here.
 */
export function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  const hasQuery = value.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Input
          type="search"
          inputMode="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by in-game name…"
          aria-label="Search alliance roster by in-game name"
          className={hasQuery ? 'w-full pr-12' : 'w-full'}
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-ash-400 hover:bg-ink-700 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {hasQuery && resultCount !== undefined && (
        <p className="text-xs text-ash-400" aria-live="polite">
          {resultCount} {resultCount === 1 ? 'player' : 'players'} match "{value}"
        </p>
      )}
    </div>
  );
}
