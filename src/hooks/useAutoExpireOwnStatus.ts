import { useEffect, useRef } from 'react';
import { writePlayerStatus } from '../firebase/firestore';
import { isExpired } from '../utils/expiration';
import type { Player } from '../types/models';

/**
 * Automatic expiration's Firestore write-back half. `utils/expiration.ts`'s
 * `applyEffectiveStatus` already makes every viewer's board *display* an
 * expired player as Unavailable, live — but `firestore.rules` only ever
 * lets a player write their own document (Section 13, rule 3), so no other
 * viewer's client can legally correct the *stored* `status` field on
 * someone else's record. This hook is the one place that correction can
 * legally happen: when the signed-in caller's own record in `players` has
 * expired, their own client writes `status: 'unavailable'` back through
 * `writePlayerStatus()` — the exact same rule-compliant path
 * `EditMyStatusModal` already uses — so the persisted data itself becomes
 * accurate, not just its on-screen rendering, the next time this player (or
 * anyone reading Firestore directly) looks.
 *
 * Best-effort by design: if this write never fires (the player's device
 * never comes back online before someone else looks at the board), every
 * other viewer still sees them as Unavailable regardless, via
 * `applyEffectiveStatus` — this hook is a persistence nicety on top of an
 * already-correct display, never the source of truth for what's rendered.
 */
export function useAutoExpireOwnStatus(
  allianceId: string | null,
  uid: string | undefined,
  players: Player[],
  now: number
): void {
  // Tracks the `uid:availableUntil` pair already written (or in flight), so
  // a quiet roster between clock ticks doesn't refire the same write.
  const writtenForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!allianceId || !uid) return;

    const own = players.find((player) => player.uid === uid);
    if (!own || !isExpired(own, now)) return;

    const key = `${own.uid}:${own.availableUntil}`;
    if (writtenForRef.current === key) return;
    writtenForRef.current = key;

    writePlayerStatus({
      allianceId,
      uid,
      input: {
        ign: own.ign,
        status: 'unavailable',
        availableUntil: own.availableUntil,
        note: own.note,
        lookingFor: own.lookingFor,
        canLead: own.canLead,
        scouting: own.scouting,
        capability: own.capability,
      },
      isNewRecord: false,
    }).catch(() => {
      // Offline / transient failure — allow a retry on the next tick rather
      // than getting permanently stuck on a failed attempt.
      if (writtenForRef.current === key) writtenForRef.current = null;
    });
  }, [allianceId, uid, players, now]);
}
