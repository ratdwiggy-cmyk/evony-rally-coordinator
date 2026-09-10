import { useOfflineStatus } from '../../hooks';
import { formatRelativeTime } from '../../utils/time';

/**
 * docs/PROJECT_SPECIFICATION.md Section 8: "On load with no network: render the
 * last cached snapshot immediately, with a persistent, unmissable
 * 'Offline — showing data as of [last cached timestamp]' banner." This is
 * the banner. `useOfflineStatus` (existing, previously unused anywhere)
 * already tracks browser connectivity and the last moment this device was
 * online; this component just renders that state. Firestore's own offline
 * persistence (ADR-005) continues to serve the last cached snapshot to the
 * board underneath — this banner never blocks or replaces that content, it
 * sits above it so a stale board is never mistaken for a live one.
 */
export function OfflineBanner() {
  const { isOffline, lastOnlineAt } = useOfflineStatus();

  if (!isOffline) return null;

  const asOf = lastOnlineAt ? formatRelativeTime(lastOnlineAt) : 'an unknown time';

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-status-maybe/30 bg-status-maybe/10 px-4 py-2 text-center text-sm text-ash-50 md:px-6"
    >
      <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-status-maybe" />
      Offline — showing data as of {asOf}. Changes you make will sync once you're back online.
    </div>
  );
}
