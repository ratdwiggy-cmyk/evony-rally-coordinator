import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AllianceProvider } from '../../contexts/AllianceContext';
import { Loading, ErrorState } from '../ui';
import { AllianceJoinScreen } from './AllianceJoinScreen';

/**
 * Gates the authenticated portion of the app: waits for the anonymous auth
 * check, then either shows the join-code screen (no `allianceId` on the
 * user's profile yet) or renders `children` inside `AllianceProvider`. If Firebase isn't
 * configured at all (no env vars), renders children directly so the
 * foundation UI keeps working standalone in local dev — matching the
 * behavior of the previous placeholder phase.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, firebaseReady, error } = useAuth();

  if (!firebaseReady) {
    return <>{children}</>;
  }

  if (loading) {
    return <Loading label="Connecting…" />;
  }

  if (error && !user) {
    return <ErrorState message={error} />;
  }

  if (!user?.allianceId) {
    return <AllianceJoinScreen />;
  }

  return <AllianceProvider>{children}</AllianceProvider>;
}
