import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { subscribeToAlliance } from '../firebase/firestore';
import { useAuth } from './AuthContext';
import type { Alliance } from '../types/models';

interface AllianceContextValue {
  alliance: Alliance | null;
  loading: boolean;
  error: string | null;
}

const AllianceContext = createContext<AllianceContextValue>({
  alliance: null,
  loading: false,
  error: null,
});

/**
 * Subscribes to the current user's alliance config document (name, boss
 * categories, looking-for options, staleness threshold) whenever their
 * `users/{uid}` profile has an `allianceId` (ADR-011). Renders nothing
 * itself — purely a data provider, consumed via `useAlliance()` by
 * `StatusBoard.tsx` and `Profile.tsx`.
 */
export function AllianceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.allianceId) {
      setAlliance(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToAlliance(
      user.allianceId,
      (next) => {
        setAlliance(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.allianceId]);

  return (
    <AllianceContext.Provider value={{ alliance, loading, error }}>
      {children}
    </AllianceContext.Provider>
  );
}

export function useAlliance(): AllianceContextValue {
  return useContext(AllianceContext);
}
