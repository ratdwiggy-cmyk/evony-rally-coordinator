import { useEffect, useState } from 'react';
import { subscribeToPlayers } from '../firebase/firestore';
import type { Player } from '../types/models';

interface UsePlayersResult {
  players: Player[];
  loading: boolean;
  error: string | null;
}

/**
 * Realtime subscription to an alliance's full player roster. This is
 * data-only — no sorting/filtering here (that's Section 5 / a later phase's
 * useFilters hook). Returns an empty array (not null) while loading, so
 * consumers can render an EmptyState without a null check.
 */
export function usePlayers(allianceId: string | null): UsePlayersResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allianceId) {
      setPlayers([]);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPlayers(
      allianceId,
      (next) => {
        setPlayers(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [allianceId]);

  return { players, loading, error };
}
