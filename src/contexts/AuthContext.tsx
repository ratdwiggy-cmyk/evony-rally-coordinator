import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ensureAnonymousSession, subscribeToCurrentUser } from '../firebase/auth';
import { isFirebaseConfigured } from '../firebase/config';
import { joinAlliance, lookupJoinCode, writePlayerStatus } from '../firebase/firestore';
import type { CurrentUser } from '../types/models';

export interface JoinAllianceRequest {
  joinCode: string;
  ign: string;
}

interface AuthContextValue {
  /** Null until Firebase is configured and the initial auth check resolves. */
  user: CurrentUser | null;
  /** True while the initial anonymous sign-in check is in flight. */
  loading: boolean;
  /** True once a Firebase project is actually configured (env vars present). */
  firebaseReady: boolean;
  /** Any error surfaced during sign-in or the join-code exchange. */
  error: string | null;
  /** Submits a join code + IGN, resolving it against Firestore (ADR-011). */
  submitJoinCode: (request: JoinAllianceRequest) => Promise<void>;
  /** Clears the current error message. */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    (async () => {
      try {
        await ensureAnonymousSession();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start a session.');
        setLoading(false);
        return;
      }

      unsubscribe = subscribeToCurrentUser((nextUser) => {
        setUser(nextUser);
        setLoading(false);
      });
    })();

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseReady]);

  async function submitJoinCode({ joinCode, ign }: JoinAllianceRequest) {
    setError(null);

    if (!user) {
      const message = 'Still connecting — please try again in a moment.';
      setError(message);
      throw new Error(message);
    }

    // ADR-011: verify the join code directly against Firestore (no Cloud
    // Function). `lookupJoinCode` hashes the code client-side and does a
    // single `get()` on `joinCodes/{hash}` — see firebase/firestore.ts.
    let match;
    try {
      match = await lookupJoinCode(joinCode);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check that join code.';
      setError(message);
      throw err;
    }

    if (!match) {
      const message = "That join code doesn't match any alliance. Double-check it and try again.";
      setError(message);
      throw new Error(message);
    }

    try {
      // Records membership in the user's own profile (users/{uid}) — this is
      // what firestore.rules now checks instead of a custom claim, and what
      // subscribeToCurrentUser picks up in real time to populate
      // user.allianceId below.
      await joinAlliance(user.uid, match.allianceId, match.allianceName);

      // Preserves the original onboarding intent (ADR-004: "enter your IGN +
      // the code") by creating the player's initial status record in the
      // same step, now that we have an allianceId to write it under.
      await writePlayerStatus({
        allianceId: match.allianceId,
        uid: user.uid,
        input: {
          ign,
          status: 'unavailable',
          availableUntil: null,
          note: null,
          lookingFor: [],
          canLead: [],
          scouting: false,
          capability: {},
        },
        isNewRecord: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to join that alliance. Please try again.';
      setError(message);
      throw err;
    }
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, firebaseReady, error, submitJoinCode, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
