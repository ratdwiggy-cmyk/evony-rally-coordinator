// -----------------------------------------------------------------------------
// Shared data types — mirrors docs/PROJECT_SPECIFICATION.md Section 12 exactly.
// These are the shapes stored in (and read from) Firestore. Keep this file as
// the single source of truth for document shape; firestore.ts converters and
// firestore.rules should both be checked against this file when either changes.
// -----------------------------------------------------------------------------

/** One of the three self-declared availability states. Section 4.1. */
export type PlayerStatusValue = 'available' | 'maybe' | 'unavailable';

/** A single boss/event category an alliance tracks (built-in or custom). */
export interface BossCategory {
  id: string;
  label: string;
  order: number;
}

/** A single "Looking For" tag option (built-in or custom). Section 4.2. */
export interface LookingForOption {
  id: string;
  label: string;
  order: number;
}

/**
 * `joinCodes/{sha256(normalizedCode)}` — see docs/DATABASE_SETUP.md Section 2
 * and ADR-011. A small top-level lookup collection that lets the client
 * verify a join code directly against Firestore (no Cloud Function): the
 * document ID is the hex SHA-256 digest of the trimmed/lowercased code, so
 * the plaintext code is never stored or transmitted anywhere, and the
 * collection can never be listed/enumerated (rules allow `get` only) — you
 * can only read a document whose hash you already know, i.e. whose code you
 * already know.
 */
export interface JoinCodeLookup {
  allianceId: string;
  allianceName: string;
}

/**
 * `alliances/{allianceId}` — Section 12.1.
 * `joinCodeHash` is intentionally NOT part of this client-facing type: the
 * spec (Section 13, rule 5) requires the alliance document to be read-only
 * from the client. As of ADR-011, the hash itself lives in the `joinCodes`
 * lookup collection (see `JoinCodeLookup` above), not on this document.
 */
export interface Alliance {
  id: string;
  name: string;
  createdAt: number; // epoch millis, converted from Firestore Timestamp
  bossCategories: BossCategory[];
  lookingForOptions: LookingForOption[];
  staleAfterMinutes: number;
}

/**
 * `alliances/{allianceId}/players/{uid}` — Section 12.2.
 * Document ID === Firebase Auth uid (ADR-008). `capability` keys reference
 * `Alliance.bossCategories[].id`; values are free-form strings like "Lv5" or
 * "Hard 60" — purely informational, never parsed/ranked (Section 4.5).
 */
export interface Player {
  uid: string;
  ign: string;
  status: PlayerStatusValue;
  availableUntil: number | null; // epoch millis, or null
  note: string | null;
  lookingFor: string[];
  canLead: string[];
  scouting: boolean;
  capability: Record<string, string>;
  lastUpdated: number; // server-set, epoch millis
  createdAt: number; // server-set once, epoch millis
}

/** Fields a client is allowed to submit when writing their own player doc.
 * Excludes `uid`, `lastUpdated`, `createdAt` — those are server/path derived,
 * never client-supplied (Section 13, rule 4). */
export type PlayerWriteInput = Omit<Player, 'uid' | 'lastUpdated' | 'createdAt'>;

/**
 * `users/{uid}` — the user's profile document (ADR-011). Document ID is the
 * player's own Firebase Auth `uid`, same pattern as ADR-008's player records.
 * Written once at join time (and again if the player ever joins a different
 * alliance) by the client itself, after it has independently verified the
 * join code against `joinCodes/{hash}` — see `joinAlliance()` in
 * `firebase/firestore.ts`. This document is what replaces the old
 * `allianceId` custom claim (ADR-004, superseded by ADR-011): membership is
 * now a Firestore fact the security rules look up with `get()`, instead of a
 * claim baked into the ID token by a Cloud Function.
 */
export interface UserProfile {
  uid: string;
  allianceId: string;
  allianceName: string;
  joinedAt: number; // server-set, epoch millis
}

/**
 * Shape of the current authenticated user, as consumed by the UI.
 *
 * `allianceId` / `allianceName` are hydrated from the user's `users/{uid}`
 * profile document (see `UserProfile` above and `subscribeToCurrentUser` in
 * `firebase/auth.ts`) rather than from an auth-token custom claim — ADR-011
 * replaced ADR-004's claim-based approach so the app can verify alliance
 * membership without any Cloud Function, staying on the Spark plan.
 */
export interface CurrentUser {
  uid: string;
  isAnonymous: boolean;
  allianceId: string | null;
  allianceName: string | null;
}
