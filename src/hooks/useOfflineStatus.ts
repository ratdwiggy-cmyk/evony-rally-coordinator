import { useEffect, useState } from 'react';

interface OfflineStatus {
  /** True when the browser reports no network connectivity. */
  isOffline: boolean;
  /** Epoch millis of the last time this hook observed the app go online. */
  lastOnlineAt: number | null;
}

/**
 * Tracks browser-level connectivity (online/offline events). Section 8 pairs
 * this with Firestore's own built-in offline persistence (ADR-005) — this
 * hook drives the "Offline — showing data as of [time]" banner UI, while
 * Firestore itself handles the actual cache-then-sync behavior.
 */
export function useOfflineStatus(): OfflineStatus {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(
    navigator.onLine ? Date.now() : null
  );

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      setLastOnlineAt(Date.now());
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, lastOnlineAt };
}
