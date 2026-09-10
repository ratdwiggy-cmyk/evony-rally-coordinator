import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAlliance } from '../contexts/AllianceContext';
import { usePlayers, useDebouncedValue, useExpirationClock, useAutoExpireOwnStatus } from '../hooks';
import { Loading, ErrorState, EmptyState, Button } from '../components/ui';
import { StatusBoardSummary, PlayerCard, EditMyStatusModal, SearchBar, FilterBar, SortBar } from '../components/board';
import { filterPlayersByIgn } from '../utils/search';
import { filterPlayers, EMPTY_FILTER_STATE, hasActiveFilters, type FilterState } from '../utils/filters';
import { sortPlayers, DEFAULT_SORT_STATE, type SortState } from '../utils/sort';
import { applyEffectiveStatus } from '../utils/expiration';

export function StatusBoard() {
  const { user, loading: authLoading, firebaseReady } = useAuth();
  const { alliance, loading: allianceLoading, error: allianceError } = useAlliance();
  const allianceId = user?.allianceId ?? null;
  const { players, loading: playersLoading, error: playersError } = usePlayers(allianceId);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Automatic expiration. `now` wakes itself precisely when the next
  // `availableUntil` in the roster passes (see `useExpirationClock`), and
  // `effectivePlayers` is the roster with any now-expired `available`/
  // `maybe` player's status overridden to `unavailable` for display —
  // composed *first*, ahead of search/filter/sort/summary below, exactly
  // like `filterPlayersByIgn`/`filterPlayers` compose ahead of `sortPlayers`,
  // so none of those need to know expiration exists. `useAutoExpireOwnStatus`
  // is the one legal write-back: it corrects the signed-in caller's own
  // stored Firestore record (never anyone else's — `firestore.rules` only
  // ever allows that) once it, too, has expired.
  const now = useExpirationClock(players);
  const effectivePlayers = useMemo(() => applyEffectiveStatus(players, now), [players, now]);
  useAutoExpireOwnStatus(allianceId, user?.uid, players, now);

  // Section 5.3 — free-text IGN search. `searchQuery` is the raw, instantly-
  // responsive input value; filtering itself runs against the debounced
  // value so a live Firestore update mid-typing never fights the user's
  // keystrokes, and search state lives here (not inside `usePlayers`) so it
  // survives every roster snapshot update untouched.
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);

  // Section 5.2 — Status/Scouting/Can Lead/Looking For/Boss Category
  // filtering. `filters` is ordinary page-level state, exactly like
  // `searchQuery` above, so it survives every live roster snapshot update
  // untouched and simply recomputes `filteredPlayers` against whatever the
  // roster currently is. Composed with (never replacing) the existing
  // search filter: search narrows by IGN text, filters narrow by declared
  // fields, and both apply together (AND) against the live roster.
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER_STATE);

  // Section 5.1 — Available first / Recently updated / IGN / Activity /
  // Scouting / Capability category sorting. `sort` is page-level state,
  // exactly like `searchQuery` and `filters` above, so it too survives
  // every live roster snapshot untouched. Composed last (never replacing
  // search or filters): `filteredPlayers` below is still exactly what
  // search+filters alone would produce; `sortedPlayers` just reorders that
  // same list, per `DEVELOPMENT_STATUS.md`'s "sort should run last, over
  // `filteredPlayers`" note.
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT_STATE);

  const filteredPlayers = useMemo(() => {
    const searched = filterPlayersByIgn(effectivePlayers, debouncedSearchQuery);
    return filterPlayers(searched, filters);
  }, [effectivePlayers, debouncedSearchQuery, filters]);

  const sortedPlayers = useMemo(() => sortPlayers(filteredPlayers, sort), [filteredPlayers, sort]);

  const bossCategories = alliance?.bossCategories ?? [];
  const lookingForOptions = alliance?.lookingForOptions ?? [];

  // Mounted once, at the page level, so it's reachable both from a player's
  // own card (Edit button below) and the header action here — the latter is
  // what a first-time player uses, since they have no card yet to click into.
  const editModal = allianceId && (
    <EditMyStatusModal
      open={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      bossCategories={bossCategories}
      lookingForOptions={lookingForOptions}
    />
  );

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl text-ash-50">Status Board</h1>
        <p className="mt-1 text-sm text-ash-400">
          Who's around right now, what they're doing, and who can lead what — self-declared, live.
        </p>
      </div>
      {allianceId && (
        <Button onClick={() => setEditModalOpen(true)} className="shrink-0">
          Edit my status
        </Button>
      )}
    </div>
  );

  // Firebase isn't configured in this deployment at all (no VITE_FIREBASE_* env vars).
  if (!firebaseReady) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Board not configured"
          message="This deployment doesn't have a Firebase project connected yet, so there's no live roster to show."
        />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Loading label="Signing you in…" />
      </div>
    );
  }

  if (!allianceId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="No alliance joined yet"
          message="Enter your alliance's join code to see the live roster. Alliance joining is handled elsewhere in the app."
        />
      </div>
    );
  }

  if (allianceLoading || playersLoading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Loading label="Loading the roster…" />
      </div>
    );
  }

  if (allianceError || playersError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          message={
            allianceError ?? playersError ?? 'Could not load the alliance roster. Please try again.'
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="No one has declared a status yet"
          message="Once alliance members set their status, they'll appear here — live, for everyone."
        />
        {editModal}
      </div>
    );
  }

  const staleAfterMinutes = alliance?.staleAfterMinutes ?? 720;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <StatusBoardSummary players={effectivePlayers} lookingForOptions={lookingForOptions} />

      <SearchBar value={searchQuery} onChange={setSearchQuery} resultCount={filteredPlayers.length} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        bossCategories={bossCategories}
        lookingForOptions={lookingForOptions}
      />

      <SortBar sort={sort} onChange={setSort} bossCategories={bossCategories} />

      {filteredPlayers.length === 0 ? (
        <EmptyState
          title="No players match"
          message={
            searchQuery && hasActiveFilters(filters)
              ? `No one's in-game name matches "${searchQuery}" within the selected filters. Try clearing the search or a filter.`
              : searchQuery
                ? `No one's in-game name matches "${searchQuery}". Try a different spelling or clear the search.`
                : "No one matches the selected filters. Try clearing a filter."
          }
        />
      ) : (
        <ul
          role="list"
          aria-label="Alliance roster"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sortedPlayers.map((player) => (
            <li key={player.uid} role="listitem">
              <PlayerCard
                player={player}
                bossCategories={bossCategories}
                lookingForOptions={lookingForOptions}
                staleAfterMinutes={staleAfterMinutes}
                isOwnPlayer={player.uid === user?.uid}
                onEdit={() => setEditModalOpen(true)}
              />
            </li>
          ))}
        </ul>
      )}

      {editModal}
    </div>
  );
}
