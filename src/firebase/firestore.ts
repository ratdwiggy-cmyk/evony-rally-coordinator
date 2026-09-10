// -----------------------------------------------------------------------------
// Firestore collection references, converters, and data-access functions.
// Structure mirrors docs/PROJECT_SPECIFICATION.md Section 12 exactly:
//   alliances/{allianceId}
//   alliances/{allianceId}/players/{uid}
//
// Per ADR-008, a player's document ID is always their own Firebase Auth uid —
// every write function here takes that as given and never accepts an
// arbitrary target uid from a caller other than "the currently signed-in
// user," which is what the Security Rules also enforce server-side.
// -----------------------------------------------------------------------------

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './config';
import type { Alliance, JoinCodeLookup, Player, PlayerWriteInput, UserProfile } from '../types/models';
import { hashJoinCode } from '../utils/joinCode';

const MAX_NOTE_LENGTH = 140;
const MAX_ARRAY_LENGTH = 20;

function tsToMillis(value: Timestamp | null | undefined): number {
  return value ? value.toMillis() : 0;
}

// --- Converters --------------------------------------------------------------
// Converters keep Firestore's Timestamp type out of the rest of the app —
// components and hooks only ever see plain epoch-millisecond numbers.

const allianceConverter: FirestoreDataConverter<Alliance> = {
  toFirestore(): DocumentData {
    // Alliance documents are read-only from the client (Section 13, rule 5);
    // this converter is read-side only and intentionally has no write path.
    throw new Error('Alliance documents are read-only from the client.');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Alliance {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      name: data.name ?? '',
      createdAt: tsToMillis(data.createdAt),
      bossCategories: Array.isArray(data.bossCategories) ? data.bossCategories : [],
      lookingForOptions: Array.isArray(data.lookingForOptions) ? data.lookingForOptions : [],
      staleAfterMinutes:
        typeof data.staleAfterMinutes === 'number' ? data.staleAfterMinutes : 720,
    };
  },
};

const playerConverter: FirestoreDataConverter<Player> = {
  toFirestore(player: Player): DocumentData {
    // Only used by writePlayerStatus below, which builds its own payload with
    // serverTimestamp() sentinels — this satisfies the interface but callers
    // should prefer writePlayerStatus() rather than setDoc() directly.
    return player;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Player {
    const data = snapshot.data(options);
    return {
      uid: snapshot.id,
      ign: data.ign ?? '',
      status: data.status ?? 'unavailable',
      availableUntil: data.availableUntil ? tsToMillis(data.availableUntil) : null,
      note: data.note ?? null,
      lookingFor: Array.isArray(data.lookingFor) ? data.lookingFor : [],
      canLead: Array.isArray(data.canLead) ? data.canLead : [],
      scouting: Boolean(data.scouting),
      capability: typeof data.capability === 'object' && data.capability ? data.capability : {},
      lastUpdated: tsToMillis(data.lastUpdated),
      createdAt: tsToMillis(data.createdAt),
    };
  },
};

const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(): DocumentData {
    // Written directly by joinAlliance() below, which builds its own payload
    // with a serverTimestamp() sentinel for joinedAt — same pattern as
    // playerConverter above. Callers should prefer joinAlliance() to setDoc().
    throw new Error('Use joinAlliance() to write a user profile.');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfile {
    const data = snapshot.data(options);
    return {
      uid: snapshot.id,
      allianceId: data.allianceId ?? '',
      allianceName: data.allianceName ?? '',
      joinedAt: tsToMillis(data.joinedAt),
    };
  },
};

// --- Collection / document references ----------------------------------------

function allianceDocRef(allianceId: string) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  return doc(db, 'alliances', allianceId).withConverter(allianceConverter);
}

function playersCollectionRef(allianceId: string) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  return collection(db, 'alliances', allianceId, 'players').withConverter(playerConverter);
}

function playerDocRef(allianceId: string, uid: string) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  return doc(db, 'alliances', allianceId, 'players', uid).withConverter(playerConverter);
}

function userProfileDocRef(uid: string) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  return doc(db, 'users', uid).withConverter(userProfileConverter);
}

/** `joinCodes/{sha256(normalizedCode)}` — see `JoinCodeLookup` in `types/models.ts`. */
function joinCodeDocRef(hash: string) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  return doc(db, 'joinCodes', hash);
}

// --- Reads ---------------------------------------------------------------------

/** Realtime listener for the alliance's config document (name, categories, etc). */
export function subscribeToAlliance(
  allianceId: string,
  callback: (alliance: Alliance | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    allianceDocRef(allianceId),
    (snap) => callback(snap.exists() ? snap.data() : null),
    (err) => onError?.(err)
  );
}

/**
 * Realtime listener for the full player roster of one alliance. This is the
 * mechanism behind "five-second comprehension" (Section 2) — every status
 * change from any player pushes to every connected client automatically.
 */
export function subscribeToPlayers(
  allianceId: string,
  callback: (players: Player[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    playersCollectionRef(allianceId),
    (snap) => callback(snap.docs.map((d) => d.data())),
    (err) => onError?.(err)
  );
}

export async function getMyPlayerDoc(allianceId: string, uid: string): Promise<Player | null> {
  const snap = await getDoc(playerDocRef(allianceId, uid));
  return snap.exists() ? snap.data() : null;
}

// --- Writes ----------------------------------------------------------------
// Section 13, rule 3: a player may only ever write their document whose ID
// equals their own uid. There is no function anywhere in this module that
// accepts a target uid different from the signed-in caller — that
// restriction is enforced here at the API surface, AND independently at the
// Security Rules layer server-side (defense in depth, not either/or).

export interface WritePlayerStatusParams {
  allianceId: string;
  uid: string;
  input: PlayerWriteInput;
  /** True only for the very first write for this player (sets createdAt). */
  isNewRecord: boolean;
}

function validatePlayerWriteInput(input: PlayerWriteInput): void {
  const validStatuses = ['available', 'maybe', 'unavailable'];
  if (!validStatuses.includes(input.status)) {
    throw new Error(`Invalid status: ${input.status}`);
  }
  if (input.note && input.note.length > MAX_NOTE_LENGTH) {
    throw new Error(`Note exceeds ${MAX_NOTE_LENGTH} characters.`);
  }
  if (input.lookingFor.length > MAX_ARRAY_LENGTH || input.canLead.length > MAX_ARRAY_LENGTH) {
    throw new Error(`Too many tags selected (max ${MAX_ARRAY_LENGTH}).`);
  }
  if (!input.ign || input.ign.trim().length === 0) {
    throw new Error('IGN is required.');
  }
}

/**
 * Writes (creates or updates) the signed-in player's own status document.
 * `lastUpdated` (and `createdAt` on first write) are always set via
 * `serverTimestamp()` — never accepted from `input` — matching Section 13
 * rule 4 and mirrored server-side by firestore.rules.
 *
 * Client-side validation here is a UX nicety (fail fast, helpful message);
 * it is NOT the security boundary — firestore.rules re-validates every one
 * of these constraints independently, since a modified client could skip
 * this function entirely.
 */
export async function writePlayerStatus({
  allianceId,
  uid,
  input,
  isNewRecord,
}: WritePlayerStatusParams): Promise<void> {
  validatePlayerWriteInput(input);

  const payload: DocumentData = {
    ign: input.ign.trim(),
    status: input.status,
    availableUntil: input.availableUntil ? Timestamp.fromMillis(input.availableUntil) : null,
    note: input.note?.trim() || null,
    lookingFor: input.lookingFor,
    canLead: input.canLead,
    scouting: input.scouting,
    capability: input.capability,
    lastUpdated: serverTimestamp(),
  };
  if (isNewRecord) {
    payload.createdAt = serverTimestamp();
  }

  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  await setDoc(doc(db, 'alliances', allianceId, 'players', uid), payload, { merge: true });
}

// --- Alliance join system (ADR-011) -----------------------------------------
// Replaces the removed `joinAlliance` Cloud Function + custom claim (ADR-004)
// with a fully client-side flow that still never exposes a plaintext join
// code to Firestore, and still keeps the security boundary in
// `firestore.rules` rather than trusting the client's own validation.

/** Realtime listener for the signed-in user's own profile (`users/{uid}`). */
export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    userProfileDocRef(uid),
    (snap) => callback(snap.exists() ? snap.data() : null),
    (err) => onError?.(err)
  );
}

/**
 * Looks up a join code directly against Firestore: hashes the code
 * client-side, then does a single `get()` (never a `list()`) on
 * `joinCodes/{hash}`. Returns `null` for an unknown/incorrect code — this is
 * the entire "validation," since there's no server left to ask.
 */
export async function lookupJoinCode(rawCode: string): Promise<JoinCodeLookup | null> {
  const hash = await hashJoinCode(rawCode);
  const snap = await getDoc(joinCodeDocRef(hash));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (typeof data.allianceId !== 'string' || typeof data.allianceName !== 'string') return null;
  return { allianceId: data.allianceId, allianceName: data.allianceName };
}

/**
 * Writes (creates or overwrites) the signed-in user's own profile document
 * once a join code has been resolved to an alliance via `lookupJoinCode()`.
 * `joinedAt` is always server-set — never accepted from a caller — mirrored
 * server-side by `firestore.rules`.
 *
 * As with `writePlayerStatus`, the client-side `lookupJoinCode()` check above
 * is a UX nicety (fail fast, helpful message), not the security boundary:
 * `firestore.rules` independently requires `allianceId`/`allianceName` here
 * to match a real `alliances/{allianceId}` document before accepting the
 * write. See docs/DATABASE_SETUP.md Section 6 for the honest caveat on what
 * this can and can't guarantee on the Spark plan.
 */
export async function joinAlliance(
  uid: string,
  allianceId: string,
  allianceName: string
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized.');
  await setDoc(doc(db, 'users', uid), {
    allianceId,
    allianceName,
    joinedAt: serverTimestamp(),
  });
}
