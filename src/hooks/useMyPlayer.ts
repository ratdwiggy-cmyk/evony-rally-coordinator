import { useCallback, useEffect, useState } from 'react';
import { getMyPlayerDoc, writePlayerStatus } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Player, PlayerWriteInput } from '../types/models';

interface UseMyPlayerResult {
  player: Player | null;
  loading: boolean;
  error: string | null;
  /** Saves (creates or updates) the signed-in user's own status document. */
  save: (input: PlayerWriteInput) => Promise<void>;
  saving: boolean;
}

/**
 * Loads (once — not realtime, since a user always sees their own writes
 * immediately from local state after save) and saves the signed-in player's
 * own record. This is the data layer behind `EditMyStatusModal`/`Profile`;
 * per Section 5.4 / ADR-008, it can only ever target the caller's own uid.
 */
export function useMyPlayer(): UseMyPlayerResult {
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.allianceId) {
      setPlayer(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMyPlayerDoc(user.allianceId, user.uid)
      .then((doc) => {
        if (!cancelled) setPlayer(doc);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.allianceId, user?.uid]);

  const save = useCallback(
    async (input: PlayerWriteInput) => {
      if (!user?.allianceId) {
        throw new Error('You must join an alliance before saving your status.');
      }
      setSaving(true);
      setError(null);
      try {
        await writePlayerStatus({
          allianceId: user.allianceId,
          uid: user.uid,
          input,
          isNewRecord: player === null,
        });
        const updated = await getMyPlayerDoc(user.allianceId, user.uid);
        setPlayer(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save status.');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.allianceId, user?.uid, player]
  );

  return { player, loading, error, save, saving };
}
