# Migration Notes: Blaze/Cloud Functions → Spark-only

This document summarizes, in one place, how Evony Rally Coordinator moved from its original
design (Firebase **Blaze** plan, with a Cloud Function verifying join codes) to its current
design (Firebase **Spark** plan, fully client-side). If you maintained or forked an earlier
version of this repo, this is the "what changed and why" reference. For the exhaustive,
file-by-file change log of every phase, see
[`archive/internal-development/DEVELOPMENT_STATUS.md`](./archive/internal-development/DEVELOPMENT_STATUS.md).

## The original design (ADR-004)

The app originally verified an alliance join code via a Cloud Function (`functions/src/joinAlliance.ts`):
a player submitted a join code, the function hashed it, looked up the matching alliance
server-side, and minted an `allianceId` custom claim on the caller's Firebase Auth ID token via
the Admin SDK. `firestore.rules` then checked `request.auth.token.allianceId` to gate every
alliance-scoped read/write.

This required the **Blaze** (pay-as-you-go) plan — any Cloud Function at all, regardless of how
small or rarely invoked, requires Blaze, even if usage stays within the free tier's included
quota.

## What changed

**Phase 1 — remove Cloud Functions.** The `functions/` project, `firebase-admin`, and
`firebase-functions` were deleted outright so the app could run on Spark. This phase deliberately
did *not* replace the join system yet — `submitJoinCode` surfaced a "temporarily unavailable"
error, and `firestore.rules` was left checking a custom claim nothing minted anymore (making every
alliance-scoped read/write correctly, if uselessly, deny by default).

**Phase 2 — Spark-compatible join system (ADR-011).** A fully client-side replacement:

- The join code is normalized and SHA-256 hashed **in the browser** (`utils/joinCode.ts`, via the
  Web Crypto API) — the plaintext code is never sent to or stored in Firestore.
- The hash is looked up directly against a new `joinCodes/{hash}` collection
  (`lookupJoinCode()` in `firebase/firestore.ts`) — a `get()`, never a `list()`, so the
  collection can't be enumerated/brute-forced.
- On a match, the client writes its own `users/{uid}` profile document (`joinAlliance()`) recording
  `allianceId`/`allianceName`.
- `firestore.rules` was rewritten to establish membership by reading the caller's own
  `users/{uid}` profile via `get()` (`hasAllianceMembership()`), instead of trusting a token claim.

**This phase — production cleanup.** No functional or schema changes. Removed a handful of
genuinely dead exports left over from the phase 1 → phase 2 transition (see below), corrected a
few stale comments/docs that still described removed mechanisms, and consolidated the deployment
instructions into [`SPARK_DEPLOYMENT.md`](./SPARK_DEPLOYMENT.md). See
[`DEVELOPMENT_STATUS.md`](./archive/internal-development/DEVELOPMENT_STATUS.md)'s newest entry for
the full file-by-file list.

## The honest tradeoff

`firestore.rules` can verify that a profile write's `allianceId` points at a real alliance and
that `allianceName` matches it — but it structurally **cannot** verify the caller supplied the
*correct* join code for that alliance, since Spark has no server-side secret comparison available.
A client that called the Firestore SDK directly, bypassing the app's UI, could in principle write
any real `allianceId` into their own profile without ever knowing that alliance's code.

This is a deliberate, accepted tradeoff for this app's scale — a low-stakes internal tool that
already trusts a shared join code the same way an alliance trusts its own Discord invite link —
not an oversight. See ADR-011 in
[`docs/ARCHITECTURE_DECISIONS.md`](./docs/ARCHITECTURE_DECISIONS.md) for the full reasoning and
the alternatives that were considered and rejected.

## What did *not* change

- The `alliances/{allianceId}` and `alliances/{allianceId}/players/{uid}` collections and their
  field shapes.
- Any visual design, component structure, or copy in the app's UI.
- The Status Board's search, filter, sort, or automatic-expiration logic.
- The self-editing flow (`EditMyStatusFields`, `useMyPlayer`, `writePlayerStatus`).

## Dead code removed in this cleanup phase

These were genuine orphans left behind by the phase 1 → phase 2 transition — each one superseded
by a realtime equivalent, with zero remaining call sites anywhere in the app:

| Removed | Location | Superseded by |
|---|---|---|
| `signOut()` | `src/firebase/auth.ts` | Never wired to any UI; no sign-out affordance exists in this app (anonymous sessions persist by design) |
| `getFirebaseApp()` | `src/firebase/config.ts` | Not consumed anywhere; `getDb()`/`getFirebaseAuth()` are the only accessors any caller needs |
| `getAllianceOnce()` | `src/firebase/firestore.ts` | `subscribeToAlliance()` (realtime) |
| `getUserProfileOnce()` | `src/firebase/firestore.ts` | `subscribeToUserProfile()` (realtime) |

A few stale code comments that still referenced the removed Cloud Function, a since-resolved
`TODO(spark-migration)` label, and one comment naming a component (`CapabilityEditor`) that was
never actually built were also corrected — see `git blame`/the PR for this phase for the exact
diffs. No behavior changed as a result of any of these.

## If you're forking an older version of this repo

1. Confirm you're on the version of `firestore.rules` that uses `hasAllianceMembership()`, not
   `request.auth.token.allianceId` — the latter will silently deny every alliance-scoped
   read/write, since nothing mints that claim anymore.
2. Confirm `package.json` has no `firebase-admin`/`firebase-functions` dependency and there is no
   `functions/` directory or Cloud Functions deploy target in `firebase.json`.
3. Seed the new `joinCodes/{hash}` lookup collection (see
   [`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md) Section 2) — an alliance document alone is
   no longer sufficient for players to join.
4. Follow [`SPARK_DEPLOYMENT.md`](./SPARK_DEPLOYMENT.md) for the current deployment process.
