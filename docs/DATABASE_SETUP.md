# Database Setup — Evony Rally Coordinator

This document covers creating and configuring the Firebase project this app depends on, and how
to run everything locally. It assumes you've read Sections 6, 7, and 13 of
`PROJECT_SPECIFICATION.md` and ADR-003/004/007/008/009 in `ARCHITECTURE_DECISIONS.md` — this file
is the "how," those are the "why."

---

## 1. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Name it (e.g. `evony-rally-coordinator`). Google Analytics is optional — not used by this app.
3. Once created, go to **Build → Firestore Database → Create database**.
   - Start in **production mode** (rules are deployed from `firestore.rules` in this repo, not the
     console's default-allow/default-deny starter rules).
   - Pick a region close to your alliance's primary audience.
4. Go to **Build → Authentication → Get started**.
   - Enable the **Anonymous** sign-in provider (Sign-in method tab). This is the only provider
     this phase uses (ADR-004). Google/Discord OAuth are left as an optional future addition per
     the spec, not required here.
5. Register a **Web app** (Project settings → General → Your apps → Web icon `</>`). Firebase will
   show you a config object — you need those six values for `.env.local` in Step 3 below.

This app runs entirely on the free **Spark** plan — Firestore and Anonymous Auth have generous
Spark-tier quotas, and there's nothing else here that requires billing to be enabled. (An earlier
phase used a Cloud Function for join-code verification, which required the paid Blaze plan; that
function was removed and replaced by the Firestore-native join system described in Section 2 below
— see ADR-011 in `ARCHITECTURE_DECISIONS.md`.)

## 2. Create your first alliance, and its join code

The `alliances/{allianceId}` document (Section 12.1) is **read-only from the client** by design
(Section 13, rule 5) — there is intentionally no UI in this phase to create one. Create it once,
by hand, in the Firestore console:

1. Firestore Database → Start collection → collection ID: `alliances`.
2. Document ID: **Auto-ID** (or a short slug like `main`) — this becomes the alliance's `allianceId`.
3. Fields:
   | Field | Type | Example |
   |---|---|---|
   | `name` | string | `"Rat Alliance"` |
   | `createdAt` | timestamp | now |
   | `bossCategories` | array of maps | `[{id:"pan",label:"Pan",order:1}, {id:"cerberus",label:"Cerberus",order:2}, ...]` |
   | `lookingForOptions` | array of maps | same shape as above |
   | `staleAfterMinutes` | number | `720` |

   Note there is **no `joinCodeHash` field here** — as of ADR-011, the join code lives in its own
   `joinCodes` collection (Section 2a below), not on the alliance document itself. This is what
   lets the client look a code up *before* it has any alliance membership, without ever being able
   to read (or enumerate) the `alliances` collection itself.

### 2a. Create the join code

Pick a plaintext code to share with your alliance (in Discord, same as today), e.g.
`"rat-alliance-2026"`. Hash it exactly the way the client will:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('rat-alliance-2026'.trim().toLowerCase()).digest('hex'))"
```

(This matches `hashJoinCode()` in `src/utils/joinCode.ts`, which runs the same trim → lowercase →
SHA-256 steps in the browser via `crypto.subtle.digest`.)

Then, in the Firestore console:

1. Start collection → collection ID: `joinCodes`.
2. Document ID: **paste the hex digest** from the command above (not the plaintext code).
3. Fields:
   | Field | Type | Example |
   |---|---|---|
   | `allianceId` | string | the `alliances/{allianceId}` document ID from Section 2 |
   | `allianceName` | string | `"Rat Alliance"` — must exactly match the alliance's `name` field; `firestore.rules` checks this when a player joins |

Share the **plaintext** code with your alliance — never the hash, and never the `joinCodes`
document ID directly (though the hash alone isn't useful to anyone without the original code,
since SHA-256 isn't reversible).

There is deliberately no admin UI for either of these yet — creating/rotating an alliance and its
join code is a one-off, low-frequency action appropriate for direct console/CLI use at this scale.
An admin UI can be added later if that stops being true. To rotate a leaked code: create a new
`joinCodes` document with a new hash pointing at the same `allianceId`, then delete the old
`joinCodes` document so it stops resolving.

## 3. Local environment configuration

```bash
cp .env.example .env.local
```

Fill in the six `VITE_FIREBASE_*` values from Step 1.6. These are the public client-SDK config
values — safe to have in a built static bundle (Section 14, point 2); access control lives in
`firestore.rules`, not in hiding these.

Set `VITE_FIREBASE_OPTIONAL=false` once you want a missing/misconfigured `.env.local` to fail
loudly instead of silently falling back to the unauthenticated foundation-mode UI.

## 4. Install dependencies and run locally

```bash
npm install
npm run dev
```

### Running against the Firebase Emulator Suite (recommended for local dev)

Rather than hitting your real project while developing, use the emulators:

```bash
npm install -g firebase-tools   # if you don't already have the CLI
firebase login
firebase use --add              # select your project, alias it e.g. "default"
firebase emulators:start
```

This starts local Auth and Firestore emulators (ports configured in `firebase.json`) with a UI at
`http://localhost:4000`. The web app's Firebase SDK will need to be pointed at the emulators for
this to work end-to-end — that emulator-connection wiring (`connectAuthEmulator`,
`connectFirestoreEmulator`) is intentionally **not** added in `firebase/config.ts` yet, since this
phase's scope is production wiring; add it behind a `VITE_USE_EMULATORS` flag when
local-emulator-first development becomes the team's workflow.

## 5. Deploying rules

The static frontend deploys via GitHub Actions on push to `main` (unchanged — see
`.github/workflows/deploy.yml`). Firestore rules deploy **separately**, via the Firebase CLI, since
they're not part of the Vite build:

```bash
firebase deploy --only firestore:rules
```

**Historical note:** this repo previously also deployed a Cloud Function
(`firebase deploy --only functions`) alongside the rules. That function — and the `functions/`
directory, `firebase-admin`, and `firebase-functions` — was removed so the app can run on the
Spark plan; see `DEVELOPMENT_STATUS.md` and ADR-011 in `ARCHITECTURE_DECISIONS.md`. `firebase.json`
no longer declares a Functions target, and nothing in this repo needs one any more — the join
system described in Section 2 above runs entirely on the client SDK and Security Rules.

## 6. Security rules summary

See `firestore.rules` for the enforced logic. As of ADR-011, alliance membership is established by
reading the caller's own `users/{uid}` profile document (via `get()`, inside the rules themselves)
instead of a custom auth-token claim — there is no Cloud Function anywhere in this app any more to
mint one. In prose, the rules enforce:

- No `users/{uid}` profile, or a profile pointing at a different alliance → no reads or writes
  anywhere under that alliance.
- Reads of an alliance and its `players` subcollection require the caller's own profile document to
  report that `allianceId`.
- A player may create/update **only** the document whose ID equals their own `uid`, and only within
  the alliance their profile says they belong to.
- `lastUpdated`/`createdAt` (player documents) and `joinedAt` (profile documents) must equal
  `request.time` — i.e., set via `serverTimestamp()` — a client-supplied value is rejected.
- `createdAt` is immutable after creation on player documents.
- Field-level validation (status enum, note length, array length caps on player writes; alliance
  existence and name match on profile writes) is enforced in rules, not just client-side.
- The `alliances/{allianceId}` document itself is entirely read-only from any client session —
  creating or rotating one is console/CLI-only (Section 2).
- The `joinCodes/{hash}` collection allows `get` for any signed-in session but never `list` — a
  document can only ever be read by someone who already computed its hash from a code they already
  know, and the collection can never be enumerated/browsed.
- A user may `get`/`create`/`update` **only** the `users/{uid}` document whose ID equals their own
  `uid`; `list` is denied so no session can enumerate other users' alliance membership.

**An honest limitation, not glossed over:** rules can verify a profile write's `allianceId` points
at a real alliance and that `allianceName` matches it exactly, but they **cannot** verify the
caller supplied the *correct join code* for that alliance — Spark has no server-side secret
comparison available to do that check with. A client that called the Firestore SDK directly,
bypassing the app's UI, could in principle write any real `allianceId` into their own profile
without ever knowing that alliance's code. This is a real, structural consequence of removing the
Cloud Function, not an oversight — see ADR-011's "Consequences" section for the full reasoning
and why this tradeoff was accepted for this app's scale (a low-stakes internal tool that already
trusted its join code the same way an alliance trusts its own Discord invite link).

## 7. Testing performed

This phase's sandbox had outbound access to the npm registry, so this was verified for real rather
than by hand-review alone:
```bash
npm install        # 600 packages installed cleanly
npm run typecheck   # tsc -b — no errors
npm run build        # tsc -b && vite build — succeeded, dist/ produced
npx eslint src        # 0 errors (3 pre-existing react-refresh warnings, unrelated to this phase)
```
Additionally hand-reviewed:
- `firestore.rules` logic traced by hand against each bullet in Section 6 above, including the
  `hasAllianceMembership()` / `isValidProfileWrite()` helper functions.
- Every write path (`joinAlliance`, `writePlayerStatus`) confirmed to only ever set
  `serverTimestamp()` for `joinedAt`/`lastUpdated`/`createdAt`, matching what the rules require.
- Every remaining reference to the removed `functions/` project, `firebase-admin`, and
  `firebase-functions` confirmed absent (repo-wide grep).

**Not run here, and still worth doing before deploying:**
```bash
firebase emulators:start   # confirms rules behave the same against the emulator as hand-traced
                            # above, and lets you exercise the actual join flow end-to-end:
                            # sign in anonymously, submit a join code seeded per Section 2a, and
                            # confirm the board renders. No unit/integration test suite exists yet
                            # for firestore.rules itself (e.g. via @firebase/rules-unit-testing) —
                            # worth adding in a future phase given how much now depends on it.
```
No secrets are committed — `.env.local` stays git-ignored (already covered by `.gitignore`), and
the only Firebase values baked into the client build are the intentionally-public client config
keys (Step 3).
