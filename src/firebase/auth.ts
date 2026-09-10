// -----------------------------------------------------------------------------
// Anonymous sign-in, plus hydrating `CurrentUser.allianceId` /
// `allianceName`. The join-code exchange itself (verifying a code and
// deciding which alliance to join) lives in `firebase/firestore.ts`
// (`lookupJoinCode` / `joinAlliance`) and `contexts/AuthContext.tsx`
// (`submitJoinCode`) — this file only wraps the client-SDK auth calls a
// browser is allowed to make directly, and keeps `CurrentUser` in sync with
// whatever the signed-in user's `users/{uid}` profile document says.
//
// ADR-011 replaced the old custom-claim approach (ADR-004): that claim was
// minted by the removed `joinAlliance` Cloud Function, which required the
// Admin SDK and therefore the paid Blaze plan. There's no ID token to read
// membership off any more — instead, `allianceId`/`allianceName` come from a
// realtime listener on the user's own `users/{uid}` Firestore document, so
// the UI updates the instant a join succeeds without needing a token refresh.
// -----------------------------------------------------------------------------

import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';
import { subscribeToUserProfile } from './firestore';
import type { CurrentUser } from '../types/models';

/**
 * Signs the browser in anonymously if it isn't already signed in. Firebase
 * persists the anonymous session in local storage, so returning visitors
 * skip this (onAuthStateChanged will already report a user).
 */
export async function ensureAnonymousSession(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured — cannot start an auth session.');
  }
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const credential = await signInAnonymously(auth);
  return credential.user;
}

/**
 * Subscribes to auth state changes and reports a `CurrentUser | null`
 * snapshot on every change. For a signed-in user, also subscribes to their
 * `users/{uid}` profile document so `allianceId`/`allianceName` stay live —
 * populated as soon as `joinAlliance()` succeeds, cleared if the profile is
 * ever deleted, with no page reload or token refresh needed.
 */
export function subscribeToCurrentUser(
  callback: (user: CurrentUser | null, loading: boolean) => void
): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null, false);
    return () => {};
  }

  let unsubscribeProfile: Unsubscribe = () => {};

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    unsubscribeProfile();

    if (!user) {
      unsubscribeProfile = () => {};
      callback(null, false);
      return;
    }

    const { uid, isAnonymous } = user;

    unsubscribeProfile = subscribeToUserProfile(
      uid,
      (profile) => {
        callback(
          {
            uid,
            isAnonymous,
            allianceId: profile?.allianceId ?? null,
            allianceName: profile?.allianceName ?? null,
          },
          false
        );
      },
      () => {
        // Profile read failed (e.g. offline on first load) — still report
        // the signed-in user so the app doesn't hang; AllianceJoinScreen
        // (or the board, if cached data exists) handles the rest.
        callback({ uid, isAnonymous, allianceId: null, allianceName: null }, false);
      }
    );
  });

  return () => {
    unsubscribeProfile();
    unsubscribeAuth();
  };
}
