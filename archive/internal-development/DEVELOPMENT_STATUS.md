# Development Status — Evony Rally Coordinator

**Phase completed (current):** Production cleanup. Scope, per the task: remove dead code, unused
imports, and obsolete packages; verify the build, GitHub Pages deployment, Firebase Spark
compatibility, Anonymous Auth, Firestore, realtime updates, status updates, profiles, and
sorting/filtering; rewrite `README.md` for the current deployment process; add
`SPARK_DEPLOYMENT.md` and `MIGRATION_NOTES.md`; update this file; remove any remaining references
to Cloud Functions, `firebase-admin`, `firebase-functions`, Blaze, or billing. Explicitly not in
scope: redesigning any feature, the UI, or the database. Findings and changes:

- **Dead code removed** (each confirmed via a repo-wide grep to have zero remaining call sites,
  including from within its own file):
  - `signOut()` in `src/firebase/auth.ts` — never wired to any UI; this app has no sign-out
    affordance (anonymous sessions persist by design), and nothing else called it either.
  - `getFirebaseApp()` in `src/firebase/config.ts` — not consumed anywhere; `getDb()` and
    `getFirebaseAuth()` are the only accessors any caller actually needs.
  - `getAllianceOnce()` and `getUserProfileOnce()` in `src/firebase/firestore.ts` — one-shot reads
    left over from the phase 1 → phase 2 (ADR-011) transition, fully superseded by
    `subscribeToAlliance()` / `subscribeToUserProfile()`. `getMyPlayerDoc()`, the other one-shot
    read in that file, is genuinely still used by `useMyPlayer.ts` and was left alone.
- **No unused imports or unused-but-still-exported-elsewhere symbols found.** `tsconfig.json`
  already enforces `noUnusedLocals`/`noUnusedParameters` (so `tsc -b`, the first step of
  `npm run build`, would already fail the build on either); a repo-wide static cross-reference of
  every `import`/`export` in `src/` independently confirmed zero unused imports and zero fully dead
  exports beyond the four removed above. A handful of exports (e.g. `getFirebaseConfig`,
  `getEffectiveStatus`, `normalizeJoinCode`, `useTheme`) are unused *outside* their own file but are
  genuinely called *within* it — these are intentional internal API surface, not dead code, and
  were left alone.
- **No obsolete packages found.** `package.json` already has no `firebase-admin` or
  `firebase-functions` dependency (removed in phase 1) and no other unused dependency — every
  entry in both `dependencies` and `devDependencies` has a live call site or config reference
  (`firebase`, `react`/`react-dom`/`react-router-dom`; `vite`/`@vitejs/plugin-react`/
  `vite-plugin-pwa`, `tailwindcss`/`postcss`/`autoprefixer`, `typescript`/`eslint`/its plugins,
  `@types/react*`).
- **Stale comments/docs corrected** (no logic changes):
  - `src/contexts/AuthContext.tsx` — a doc comment still said "see the TODO on the function body
    below," but `submitJoinCode`'s TODO was resolved back in phase 2 and no TODO remains.
  - `src/contexts/AllianceContext.tsx` — a doc comment still described membership via an
    `allianceId` *claim* (the removed ADR-004 mechanism) and named a `CapabilityEditor` component
    that was never actually built; corrected to describe the real ADR-011 mechanism and the actual
    consumers (`StatusBoard.tsx`, `Profile.tsx`).
  - `src/hooks/useMyPlayer.ts` — called `EditMyStatusModal` "the future EditMyStatusModal," even
    though it (and `Profile.tsx`) have both existed and been wired in since an earlier phase.
  - `docs/DATABASE_SETUP.md` — a `TODO(spark-migration)` label on Section 5's Cloud Functions note
    was stale: the paragraph under it is already a complete, resolved historical explanation, not
    a pending task. Relabeled as a historical note.
  - This file — two entries below both carried a "(current)" marker left over from not being
    updated when a newer phase was prepended on top. Only the newest entry should ever carry it;
    both stale markers are corrected.
  - `README.md`'s Features list still called the join flow "Temporarily unavailable" — a leftover
    from phase 1, before phase 2 actually wired the join system in. Corrected.
- **`README.md`** rewritten: the stale "Temporarily unavailable" join-flow note is gone; the
  Firebase setup, routing, and GitHub Pages sections are consolidated into pointers at the new
  `SPARK_DEPLOYMENT.md` (single source of truth for the deploy process) instead of duplicating
  those steps in two places.
- **`SPARK_DEPLOYMENT.md`** (new) — the complete, current deployment guide: Firebase project
  creation, data seeding, `firestore.rules` deployment, GitHub Pages + repository secrets setup,
  the `HashRouter` rationale, and a post-deploy verification checklist covering every item in this
  phase's task list (Anonymous Auth, Firestore, realtime updates, status updates, profiles,
  sorting/filtering, routing, offline banner, PWA install).
- **`MIGRATION_NOTES.md`** (new) — a single-page summary of the Blaze/Cloud-Functions → Spark
  migration across phases 1 and 2 and this cleanup phase, the dead-code table above, and a
  checklist for anyone forking an older version of this repo.

**Verification performed this phase:**
- Every source file in `src/` (60 files) read in full and cross-referenced by hand for dead
  branches, orphaned exports, stale comments, `console.*`/`debugger` calls, and commented-out code
  — plus an automated repo-wide import/export usage sweep (see above). No commented-out code,
  `console.*`/`debugger` statements, or remaining `TODO`/`FIXME` markers found in `src/` beyond the
  one stale comment corrected above.
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.env.example`, `.gitignore`,
  `.eslintrc.cjs`, and `.github/workflows/deploy.yml` re-read in full: confirmed no Cloud
  Functions deploy target, no `firebase-admin`/`firebase-functions` reference, and the GitHub
  Actions workflow correctly type-checks, builds with the six `VITE_FIREBASE_*` secrets injected,
  and publishes `dist/` via `actions/deploy-pages`.
- Every remaining mention of Cloud Functions / `firebase-admin` / `firebase-functions` / Blaze /
  billing in `docs/`, `README.md`, and `SECURITY.md` re-read in context: each one is already
  correctly framed as historical ("an earlier phase used...", "superseded by...") rather than a
  live requirement — none needed correction beyond what's listed above.
- Realtime updates, status updates, profiles, and sorting/filtering traced end-to-end by hand
  through the code path: `subscribeToPlayers`/`subscribeToAlliance`/`subscribeToUserProfile`
  (`onSnapshot`-based, no polling) → `StatusBoard.tsx`/`Profile.tsx` → `applyEffectiveStatus` →
  `filterPlayersByIgn` → `filterPlayers` → `sortPlayers`, matching `utils/expiration.ts`,
  `utils/search.ts`, `utils/filters.ts`, and `utils/sort.ts`'s own documented composition order.
  `writePlayerStatus()` confirmed as the single write path used by both `EditMyStatusFields` (via
  `useMyPlayer`) and `useAutoExpireOwnStatus`.

**Not run in this phase's sandbox — no outbound network access to the npm registry was
available, unlike the phase that produced `docs/DATABASE_SETUP.md` Section 7's results.**
`npm install`, `npm run typecheck`, `npm run build`, `npm run lint`, and `npm run preview` were
**not** executed here and their results are **not** verified by this phase; the findings above are
from static/manual review only (full-file reads, a custom repo-wide import/export cross-reference
script, and `tsconfig.json`'s existing `noUnusedLocals`/`noUnusedParameters` settings, which will
independently fail `npm run build` if any unused import or variable were still present). **Before
deploying, run `npm install && npm run typecheck && npm run build && npm run lint && npm run
preview` yourself** and walk the post-deploy checklist in `SPARK_DEPLOYMENT.md` — this is the same
outstanding caveat every prior phase in this log has carried when npm registry access wasn't
available.

---

**Phase completed:** Spark-compatible alliance join system (phase 2 of 2 — replaces the
join flow phase 1 explicitly deferred). Scope, per the task: implement a working alliance join
system that runs on the Spark plan (no Cloud Functions), without redesigning the UI, the Status
Board, or the database beyond what the join system itself requires; rewrite `firestore.rules`
accordingly; update documentation. See ADR-011 in `docs/ARCHITECTURE_DECISIONS.md` for the full
design rationale — this entry summarizes the concrete file changes.

- **`src/types/models.ts`** — added `UserProfile` (`users/{uid}` document shape) and
  `JoinCodeLookup` (`joinCodes/{hash}` document shape). `CurrentUser` gained `allianceName` and its
  doc comment now explains membership comes from a Firestore profile document, not a token claim.
  `Alliance`'s doc comment updated to note `joinCodeHash` no longer lives there.
- **`src/utils/joinCode.ts`** (new) — `normalizeJoinCode()` / `hashJoinCode()`, using the browser's
  `crypto.subtle.digest('SHA-256', ...)` to hash a join code client-side, matching the
  trim-then-lowercase-then-sha256 convention `docs/DATABASE_SETUP.md` already documented for the
  removed Cloud Function.
- **`src/firebase/firestore.ts`** — added `subscribeToUserProfile`, `getUserProfileOnce`,
  `lookupJoinCode` (hashes the code, `get()`s `joinCodes/{hash}`, returns `null` on no match — no
  `list()` anywhere), and `joinAlliance` (writes the caller's own `users/{uid}` profile with a
  `serverTimestamp()` `joinedAt`). All new reads/writes go through typed converters, same pattern
  as the existing `alliances`/`players` helpers.
- **`src/firebase/auth.ts`** — rewritten. `subscribeToCurrentUser` now layers a realtime listener on
  the signed-in user's `users/{uid}` profile on top of `onAuthStateChanged`, so
  `CurrentUser.allianceId`/`allianceName` update live the instant `joinAlliance()` succeeds, with no
  token refresh or page reload. Removed the hardcoded `allianceId: null` and its
  `TODO(spark-migration)` comment.
- **`src/contexts/AuthContext.tsx`** — `submitJoinCode` is a real implementation now: calls
  `lookupJoinCode`, surfaces a clear "doesn't match any alliance" error on a miss, and on a hit
  calls `joinAlliance` followed by an initial `writePlayerStatus` (using the IGN the
  `AllianceJoinScreen` form already collected) so the original onboarding intent — "enter your IGN
  + the code, land on the board" — is preserved rather than left half-done.
- **`src/components/auth/AllianceJoinScreen.tsx`**, **`src/components/auth/AuthGate.tsx`**,
  **`src/firebase/config.ts`**, **`src/main.tsx`** — stale comments referencing the removed
  claim/Cloud Function updated to describe the ADR-011 mechanism; no JSX, markup, copy, or layout
  changed in any of these (per "do not redesign the UI"). `StatusBoard.tsx`, `Profile.tsx`, and the
  `players`/`usePlayers`/`useMyPlayer` hooks were **not touched** — they already only ever
  keyed off `user.allianceId`, so populating that field correctly was sufficient.
- **`firestore.rules`** — fully rewritten (this phase's core deliverable). Every
  `request.auth.token.allianceId` check replaced with a `hasAllianceMembership(allianceId)` helper
  that `get()`s the caller's own `users/{request.auth.uid}` document. Added rule blocks for the two
  new collections: `users/{uid}` (get/create/update self only, `list` denied, validated via
  `isValidProfileWrite()` which requires the target alliance to exist and the name to match it) and
  `joinCodes/{hash}` (`get` for any signed-in session, `list`/`write` denied). The `alliances` and
  `players` rule blocks keep the same shape and field-level validation as before — only the
  membership check itself changed.
- **`docs/DATABASE_SETUP.md`** — Section 2 rewritten with real, working instructions for seeding an
  alliance *and* its `joinCodes` entry (replacing the `TODO(spark-migration)` placeholder). Section
  6 (security rules summary) rewritten to describe the `get()`-based membership model and states
  plainly, as its own subsection, the one thing rules structurally cannot verify: that a caller
  actually knew the correct join code, not just a real `allianceId` (see ADR-011). Section 7
  (testing performed) updated — this phase's sandbox had npm registry access, so `npm install`,
  `npm run typecheck`, `npm run build`, and `npx eslint src` were actually run (all clean) rather
  than only hand-reviewed.
- **`docs/PROJECT_SPECIFICATION.md`** — Section 12.1's table no longer lists `joinCodeHash`; added
  12.5 (`users/{uid}`) and 12.6 (`joinCodes/{hash}`) describing the two new collections. Section 13
  rewritten with a superseded-notice at the top pointing to ADR-011, then re-expressed against the
  actual `get()`-based rules. Section 16's stack table struck through the two rows (`Auth`,
  `Backend logic`) that no longer match reality and noted what's actually built instead, without
  deleting the original recommendation (Section 15's future Discord bot API plan is unaffected and
  left as-is, since it's explicitly out of scope and still unbuilt).
- **`docs/ARCHITECTURE_DECISIONS.md`** — added ADR-011 (this phase's design, in full, including the
  alternatives considered and the honest tradeoff around join-code verification). ADR-004 got a new
  "Superseded by" line rather than being edited or deleted, preserving it as the historical record
  of the original reasoning.
- **`SECURITY.md`**, **`README.md`** — updated to describe the current no-Cloud-Functions,
  rules-based membership model and to stop telling readers that joining an alliance is disabled.

**Not changed, deliberately:** the visual design, component structure, and copy of
`AllianceJoinScreen`, `AuthGate`, and the Status Board pages — none of the actual UI. The
`alliances/{allianceId}` and `alliances/{allianceId}/players/{uid}` collections and their field
shapes — unchanged. `docs/README.md`, `RELEASE_NOTES.md`, `CONTRIBUTING.md`, and the rest of
`archive/internal-development/` — left as the historical record of earlier phases, same rationale
the previous phase entry (below) already established for this file.

**You should still run** `firebase emulators:start` **and exercise the join flow by hand** — an
actual signed-in session submitting a real join code against the emulator, seeded per
`docs/DATABASE_SETUP.md` Section 2a — before deploying. `npm install`, `npm run typecheck`,
`npm run build`, and `npx eslint src` were run in this phase's sandbox and passed cleanly, but no
Firestore emulator or `@firebase/rules-unit-testing` suite exists yet to exercise `firestore.rules`
itself end-to-end; that would meaningfully increase confidence in this phase's core deliverable and
is worth adding next.

---

**Phase completed:** Remove Cloud Functions — Spark plan migration (phase 1 of 2).
Scope, per the task: remove Cloud Functions entirely so the project can run on Firebase's free
**Spark** plan instead of requiring **Blaze**. Explicitly *not* in scope: replacing the join system
(that's a later phase), redesigning the application or the UI, or redesigning the database beyond
what removing Functions requires. Findings and changes:

- **Deleted the entire `functions/` project** — `functions/src/index.ts`,
  `functions/src/joinAlliance.ts`, `functions/package.json`, `functions/tsconfig.json`,
  `functions/.gitignore`. This removes the `firebase-admin` and `firebase-functions` dependencies
  along with it (they only ever existed in `functions/package.json`; the root `package.json` never
  depended on either).
- **`firebase.json`** — removed the `functions` deploy target and the `functions` emulator port;
  kept `firestore` (rules/indexes) and the `auth`/`firestore`/`ui` emulators.
- **`src/functions-client/joinAlliance.ts` deleted** — this was the client-side `httpsCallable`
  wrapper around the Cloud Function. Nothing in `src/` calls `firebase/functions` any more (checked
  with a repo-wide grep).
- **`src/contexts/AuthContext.tsx`** — `submitJoinCode` no longer calls the (now nonexistent) Cloud
  Function. It sets and throws a clear "temporarily unavailable" error instead, with a
  `TODO(spark-migration)` comment pointing at this file. The `AllianceJoinScreen` UI is unchanged
  (per "do not redesign the UI") and still renders normally — submitting now just surfaces that
  error message, the same way any other failed `submitJoinCode` call already did.
- **`src/firebase/auth.ts`** — removed `getAllianceClaim` (read the `allianceId`/`role` custom
  claim off the Firebase ID token) and the `onIdTokenChanged` re-subscription that existed solely
  to catch a post-join claim refresh. `subscribeToCurrentUser` now derives `CurrentUser` from
  `onAuthStateChanged` alone; `allianceId` is hardcoded `null` with a `TODO(spark-migration)`
  comment, since nothing mints that claim any more.
- **`src/types/models.ts`** — removed the now-unused `AllianceClaim` interface. Left
  `CurrentUser.allianceId` in place (still `string | null`) since `AllianceContext`, the Firestore
  helpers, and `firestore.rules` all key off it and the field is expected to be populated again
  once a replacement join flow ships — documented with a TODO on the interface instead of deleting
  it, since removing it would ripple into files this phase isn't scoped to touch.
- **`firestore.rules`** — **not modified** beyond a new top-of-file comment. Every rule still
  checks `request.auth.token.allianceId`, i.e. the custom claim that's no longer minted by
  anything. In practice this means the rules now deny all alliance-scoped reads/writes, since no
  session can ever satisfy `hasAllianceClaim()`. This is a direct, expected consequence of removing
  the claim-minting function, not a rules change — redesigning the rules to work without a custom
  claim is exactly the "replace the join system" work this task explicitly deferred to a later
  phase.
- **`.eslintrc.cjs`** — removed the now-meaningless `functions` entry from `ignorePatterns` (the
  directory it excluded from linting no longer exists).
- **`.gitignore`** — removed the `functions/lib/` and `functions/node_modules/` entries for the
  same reason.
- **Stale comments referencing the removed Cloud Function** updated in
  `src/components/board/EditMyStatusFields.tsx`, `src/components/auth/AllianceJoinScreen.tsx`, and
  `src/firebase/config.ts` — none of these needed logic changes, just wording that pointed at a
  file that no longer exists.
- **`README.md`** — tech stack no longer lists Cloud Functions; the Firebase setup section
  explains the app now runs entirely on Spark and links out to the join-flow TODO; the GitHub
  Pages deployment step and project-structure diagram no longer mention deploying/listing
  `functions/`.
- **`docs/DATABASE_SETUP.md`** — removed the "Functions require Blaze" provisioning step, the
  `cd functions && npm install` step, the Functions emulator, and `firebase deploy --only
  functions`; folded the old "note on `firebase.json`'s location" section out entirely (it only
  existed to explain reconciling a Firestore + Functions `firebase.json`, which is moot with a
  single target). Added `TODO(spark-migration)` notes wherever the doc still needs to describe
  something the removed function used to do (computing `joinCodeHash`, writing the alliance
  document) that has no replacement yet.

**Not changed, deliberately:** `docs/PROJECT_SPECIFICATION.md`, `docs/ARCHITECTURE_DECISIONS.md`,
`SECURITY.md`, `CONTRIBUTING.md`, `docs/README.md`, `RELEASE_NOTES.md`, and the other files under
`archive/internal-development/` still describe the Cloud-Functions-based design (ADR-004, ADR-009,
Section 13's rules, etc.) as originally decided. Per this task's explicit scope (update only
`README.md`, `DATABASE_SETUP.md`, and this file), those are left as the historical record of *why*
the app was originally built this way; they're now describing a mechanism that has been removed,
which the next phase (replacing the join system) will need to reconcile properly rather than have
this phase spot-edit piecemeal.

**You should still run `npm install && npm run typecheck && npm run build && npx eslint .`
yourself** — this pass used the globally-available TypeScript compiler directly (no
`node_modules`, so the usual "cannot find module" noise applies, matching every prior phase's
documented limitation) to confirm no new structural TypeScript errors were introduced by these
edits; it is not a substitute for a real dependency install, full build/lint pass, or exercising
the app in a browser (in particular: confirming the `AllianceJoinScreen` still renders and now
shows the "temporarily unavailable" message instead of hanging or crashing).

---

**Phase before this:** Public Release — Production Readiness Review. A full read-through
of every file in the repository (architecture, components, hooks, contexts, Firebase/Firestore
integration, security rules, Cloud Function, PWA/GitHub Pages config, and all documentation),
looking for anything that would block a public release to the alliance community. Findings and
fixes:

- **`npm run typecheck` was still broken in `package.json`, despite the previous phase's own notes
  above claiming it was fixed.** The previous phase's summary (directly below) describes dropping
  `--noEmit` from the script and re-verifies the reasoning in detail — but `package.json` itself
  still read `"typecheck": "tsc -b --noEmit"`, unchanged. Reproduced directly with the
  globally-available `tsc` (`tsc -b --noEmit` → `TS6310: Referenced project
  '.../tsconfig.node.json' may not disable emit`, then confirmed `tsc -b` alone completes with only
  the expected "cannot find module" noise from the absent `node_modules`). This means the GitHub
  Actions deploy workflow's "Type check" step — which runs `npm run typecheck` — would have failed
  on every single push to `main`, blocking every deploy. **This is the highest-severity finding in
  this pass** and is now fixed: `package.json`'s script is `"typecheck": "tsc -b"`, matching
  `build`'s own invocation, exactly as the previous phase intended but never actually shipped.
- **The GitHub Actions build step never supplied the six `VITE_FIREBASE_*` values**, so even once
  typecheck/build succeed, Vite would inline them as `undefined` in every deployed build. Since
  `firebase/config.ts` treats a missing config as "Firebase not configured" rather than an error
  (by design, for local dev without a `.env.local`), the live, publicly deployed site would
  silently and permanently show every Firebase-gated screen ("Board not configured" / "Profile not
  configured") to every real visitor, with no error surfaced anywhere to explain why — a second
  release blocker at least as severe as the typecheck one, and easy to miss because the app
  "works" (builds and deploys cleanly) while being functionally empty for every player. Fixed by
  adding an `env:` block to the workflow's build step, reading each value from a same-named GitHub
  Actions repository secret; documented in `README.md`'s deploy instructions and cross-referenced
  from `DATABASE_SETUP.md`.
- **`README.md` was left describing an earlier, now-inaccurate phase of the project** ("frontend
  foundation only. No database, authentication, or status-board logic is implemented yet"), despite
  auth, Firestore, the full Status Board, self-editing, and deployment all having shipped in the
  phases below. A new visitor to the repo — including, e.g., anyone the maintainer asks to help
  review the code before release — would reasonably conclude from the README alone that none of
  this exists yet. Rewrote the top summary, environment-variable section, deployment steps (see
  above), and the closing "Project structure" note to describe what's actually in the repository
  today.
- **`Home.tsx` rendered a "Foundation build" badge** as the first thing any visitor sees on the
  public landing page — accurate during early development, actively misleading on a "feature
  complete" public release (it reads as "this is unfinished/experimental" to a player deciding
  whether to trust the tool with their alliance). Removed; no replacement badge was added; the
  page has no other content depending on it.
- **`vite.config.ts`'s Workbox comment still said "no data caching strategy yet, since Firestore
  integration is not implemented in this phase"** — Firestore has been implemented for several
  phases. The actual behavior (app-shell caching only, deliberately no second Workbox cache layer
  on top of Firestore's own offline persistence) was correct and unchanged; only the stale
  rationale in the comment was corrected.

No Status Board logic, `firestore.rules`, Cloud Function code, dependency versions, or any
component's rendered behavior (beyond removing the one stale badge above) was touched — every fix
in this phase is a build-tooling, CI-configuration, or documentation-accuracy correction, per this
task's "fix real problems, don't redesign or add features" scope. See `PRODUCTION_REVIEW.md` for
the full review (architecture, security, Firestore, GitHub Pages/PWA, performance, accessibility,
UX-scenario walkthroughs, and the production-readiness scores) and `TEST_REPORT.md` for the
scenario-by-scenario testing notes.

**You should still run `npm install && npm run typecheck && npm run build && npx eslint .`
yourself**, and confirm the six `VITE_FIREBASE_*` repository secrets are set before the first real
deploy — this review's `tsc -b` runs used the globally-available TypeScript compiler directly (no
`node_modules`, so "cannot find module 'react'"/`'firebase'`/etc. errors are expected noise,
matching every prior phase's documented limitation), which was enough to reproduce and fix the
structural issues above, but is not a substitute for a real dependency install, full build/lint
pass, and an actual deploy with real secrets configured.

---

**Phase before this:** Release Readiness Review. A review-only pass (no new features,
per this task's explicit instruction) across Deployment, Security, Performance, Accessibility,
Documentation, GitHub Pages, Firebase, Testing, and Release readiness. This is the first phase
where `tsc` itself (not just stubbed/isolated checks) was actually run against the repo — the
sandbox running this review has the TypeScript compiler installed globally, even without npm
registry access for the rest of the dependency tree, so the long-standing `npm run typecheck`
failure could finally be reproduced and root-caused directly instead of only inferred. Findings
and fixes:

- **`npm run typecheck` (`tsc -b --noEmit`) was fundamentally broken, not just affected by a
  project-reference config quirk as previously believed.** Every phase since filtering had noted
  `TS6310: Referenced project '.../tsconfig.node.json' may not disable emit` as a "pre-existing,
  unrelated issue... flagged for a future pass." Reproduced directly with `tsc -b --noEmit` (no
  `node_modules` needed to trigger it) and root-caused: passing `--noEmit` to `tsc -b` forces
  *every* project in the reference graph — including `tsconfig.node.json`, which is `composite`
  and therefore must be able to emit — to also disable emit, which is an inherent contradiction
  TypeScript rejects. This wasn't fixable by restructuring `tsconfig.node.json` alone, since the
  conflict comes from the CLI flag, not the file. Fixed by dropping `--noEmit` from the
  `typecheck` script (now `tsc -b`, matching how `build`'s own `tsc -b && vite build` already
  invoked it) and giving `tsconfig.node.json` an explicit `outDir` (`node_modules/.tsc-cache/node`)
  plus `tsBuildInfoFile` locations for both configs — verified this was necessary: without an
  `outDir`, `tsc -b` (once no longer blocked by the `--noEmit` conflict) was confirmed to emit
  `vite.config.js` / `vite.config.d.ts` straight into the repo root next to `vite.config.ts` on
  every build and every typecheck run, since a composite project with no `outDir` emits alongside
  its source — these stray, uncommitted build artifacts aren't covered by `.gitignore` (only
  `*.tsbuildinfo` was). This means **every prior `npm run build` in CI would have littered the
  workspace with compiled JS/`.d.ts` files** had `npm run typecheck` not been failing first and
  blocking the pipeline before `build` ever ran.
- **`tsconfig.json` used the deprecated `baseUrl` option** (`TS5101`, scheduled for removal in
  TypeScript 7.0) to support the `@/*` path alias — an alias that, per a full `grep` across `src/`,
  **no file in this codebase actually uses** (every import is relative). Removed `baseUrl` and
  switched `paths` to the TS 5+ baseUrl-free form (`"@/*": ["./src/*"]`, `TS5090` requires the
  leading `./` once `baseUrl` is gone) — the alias itself is left in place in case a future phase
  wants it, but the config no longer depends on a deprecated option to support zero call sites.
- **`index.html` manually declared `<link rel="manifest" href="manifest.webmanifest">`**, which
  `vite-plugin-pwa` (configured in `vite.config.ts`) also injects automatically at build time with
  the correct, base-path-aware href for the GitHub Pages subpath deployment. A hand-written
  duplicate risks Vite processing it as a separate asset reference and mis-resolving the URL under
  `/evony-rally-coordinator/`, or simply emitting two manifest links into the built HTML. Removed
  the manual tag; the plugin owns this entirely, as its own documentation recommends.
- **`.eslintrc.cjs` had no `ignorePatterns` entry for `functions/`**, so `npm run lint` (`eslint .`
  from the repo root) was linting the Cloud Functions subproject — a separate Node/CommonJS
  codebase with its own `tsconfig.json` and independent deploy lifecycle (`firebase deploy --only
  functions`, per `firebase.json`) — with the frontend's browser-env ESLint config. Added
  `functions` to `ignorePatterns`; that subproject should be linted (if at all) with its own
  Node-appropriate config, not implicitly inherit the frontend's.
- **`.env.example`'s comment for `VITE_FIREBASE_OPTIONAL` described behavior the code doesn't
  have** ("log a console warning") — `firebase/config.ts`'s `getFirebaseConfig()` actually returns
  `null` silently when config is missing and the flag isn't explicitly `"false"`; no `console.warn`
  exists anywhere in that path. Corrected the comment to describe the actual (silent fallback)
  behavior.
- **Several interactive elements were below `DESIGN_SYSTEM.md`'s documented 44px touch-target hard
  floor** ("don't override it with custom padding that shrinks below it"): `Modal`'s close (✕)
  button was `h-9 w-9` (36px); `SearchBar`'s clear-search button was likewise `h-9 w-9` (adjusted
  the `Input`'s reserved right-padding from `pr-11` to `pr-12` to fit the now-44px button cleanly);
  and `FilterBar`'s "Clear filters" / `SortBar`'s "Reset sort" buttons both passed an explicit
  `min-h-[36px]` className straight to the shared `Button` component, directly overriding its
  44px floor. All four fixed to meet the documented minimum; `FilterBar`/`SortBar`'s expand/collapse
  toggle buttons and every other `Button` usage were already compliant (checked via a repo-wide
  grep for sub-44px sizing on interactive elements).

No Status Board logic (`filters.ts`, `sort.ts`, `search.ts`, `expiration.ts`, either expiration
hook, `firestore.rules`, or any data-layer file) was touched — every fix above is either a build
tool/config correction or a display-only sizing fix, matching this task's "fix issues found, don't
add functionality" scope. `firestore.rules`, `firebase.json`, `functions/src/*`, and the Cloud
Function's join-code flow were read in full and traced against `PROJECT_SPECIFICATION.md` Section
13 and `DATABASE_SETUP.md`; no issues found there.

**You should still run `npm install && npm run typecheck && npm run build && npx eslint .`
yourself** in an environment with real npm registry access — this review's `tsc -b` runs used the
globally-available TypeScript compiler directly (no `node_modules`, so "cannot find module
'react'"/`'firebase'`/etc. errors are expected noise, matching every prior phase's documented
limitation), which was enough to reproduce and fix the structural `tsconfig`/build issues above,
but is not a substitute for a real dependency install and full build/lint pass.

---

**Phase before that:** Onboarding / PWA / Help / About / Profile / Accessibility / Mobile /
Performance. An inspection-first pass (per this task's explicit instruction) found that two
previously-built features were never actually wired into the app: the join-code onboarding screen
(`AllianceJoinScreen` via `AuthGate`) and the offline-detection hook (`useOfflineStatus`) both
existed with no functional code changed, but neither was mounted anywhere in the render tree —
`AuthGate` wasn't imported by `App.tsx` at all, and nothing consumed `useOfflineStatus`. This phase
wires both in (`/board` and `/profile` now render through `AuthGate`; a new `OfflineBanner`
consumes `useOfflineStatus`), adds the previously-nonexistent Help page (`src/pages/Help.tsx`,
route, and nav entry), adds a skip-to-content link for keyboard accessibility, removes a redundant
top-level `AllianceProvider` that was double-subscribing to the alliance document, and code-splits
every route with `React.lazy`/`Suspense` for a smaller initial bundle. Status Board *logic*
(`filters.ts`, `sort.ts`, `search.ts`, `expiration.ts`, the two expiration hooks, `firestore.rules`)
and `StatusBoard.tsx` itself were **not modified** — see "Completed in this phase" below and
`CHANGELOG_CURRENT.md` for the full file list and decisions.

**Phase before that:** Automatic Expiration. When a player's `Available Until` passes,
every viewer's board now shows them as Unavailable — live, with no manual refresh — via a new
`applyEffectiveStatus()` (`src/utils/expiration.ts`) composed ahead of the existing
search/filter/sort/summary pipeline, woken at exactly the right moment by a new
`useExpirationClock()` (`src/hooks/useExpirationClock.ts`) instead of a polling interval. Because
`firestore.rules` only ever allows a player to write their own document, the one place the
*stored* `status` field is actually corrected in Firestore is the signed-in caller's own record,
via a new `useAutoExpireOwnStatus()` (`src/hooks/useAutoExpireOwnStatus.ts`) that reuses the
existing `writePlayerStatus()` path — no rules change needed. See "Completed in a previous phase
(Automatic Expiration)" below for the full breakdown.

**Phase before that:** Self-Editing re-verification (verification pass, no functional changes).
This task's scope was, again, editing only your own record (Status, Available Until, Activity,
Looking For, Can Lead, Scouting, Capabilities, Notes) with validation, friendly errors, realtime
save, loading indicators, and confirmation messages. That feature was **already fully
implemented** in the "Self-Editing" phase below — `EditMyStatusFields.tsx`,
`EditMyStatusModal.tsx`, `Profile.tsx`, `useMyPlayer.ts`, `writePlayerStatus()`, and the matching
`firestore.rules`. No functional code was changed that pass; see "Verification performed this
pass (Self-Editing re-verification)" below for what was checked and how.

**Phase before that:** Status Board Sorting — Available first, Recently updated, IGN, Activity,
Scouting, and Capability category sorts (Section 5.1 only), realtime, fast, and stable, now sit
above the roster grid on `StatusBoard.tsx` alongside (not replacing) the existing search box and
filters.
**Phase before that:** Status Board Filtering — Status (Available/Maybe/Unavailable), Scouting, Can
Lead, Looking For, and Boss Category filters (Section 5.2 only), all combinable simultaneously
(AND across groups, OR within a group), live-updating, and touch-friendly, sit above the
roster grid on `StatusBoard.tsx` alongside (not replacing) the existing search box.
**Phase before that:** Player Search — a free-text, case-insensitive, debounced, live-updating
search box (Section 5.3 only) sits above the roster grid on `StatusBoard.tsx`, with a
clear-search button and search state that survives both live Firestore roster updates and the
debounce.
**Phase before that:** Self-Editing (`EditMyStatusModal`) — a signed-in player can edit only
their own Status, Available Until, Current Activity/Notes, Looking For, Can Lead, Scouting, and
Capability, with real-time save, validation, friendly errors, loading indicators, confirmation
messages, and responsive forms.
**Phase before that:** Player Cards — Production Quality Pass (display-only polish: field-name
alignment, list/heading accessibility, verification)
**Phase before that:** Alliance Status Board — Foundation (layout, summary, live grid,
loading/empty/error states)
**Phase NOT started:** Discord Bot API. (Offline banner UI and routing-level auth gating, both
previously listed here as not started, are done as of this phase — see above.)

---

## Completed in this phase (Public Release — Production Readiness Review)

See `PRODUCTION_REVIEW.md` for the full review and `TEST_REPORT.md` for scenario-by-scenario
testing notes. In summary:

- **Fixed `package.json`'s `typecheck` script** (`tsc -b --noEmit` → `tsc -b`) — reproduced the
  `TS6310` failure directly with the sandbox's globally-installed `tsc`, confirmed it would fail
  CI's "Type check" step on every push, and confirmed `tsc -b` alone completes cleanly (module
  errors are due only to the workspace's absent `node_modules`, not this issue).
- **Wired the six `VITE_FIREBASE_*` values into `.github/workflows/deploy.yml`'s build step**
  (from GitHub Actions repository secrets) — without this, the deployed app builds and serves
  successfully but has no Firebase config at all, so it silently shows "not configured" to every
  real visitor forever.
- **Rewrote `README.md`'s top summary, environment-variable section, deployment steps, and
  "Project structure" closing note** to describe the app as it actually is today (feature complete)
  instead of the "frontend foundation only" description left over from early development.
- **Removed the "Foundation build" badge from `Home.tsx`** — stale and misleading on a public
  release landing page; no replacement added.
- **Corrected a stale code comment in `vite.config.ts`** ("Firestore integration is not implemented
  in this phase") to describe the actual, unchanged caching behavior accurately.

No Status Board logic, `firestore.rules`, Cloud Function code, or component *behavior* (beyond
removing the one badge) was changed. Everything above is a build-tooling, CI-configuration, or
documentation-accuracy fix.

---

## Completed in the previous phase (Onboarding / PWA / Help / About / Profile / Accessibility / Mobile / Performance)

See `CHANGELOG_CURRENT.md` for the full file-by-file breakdown, rationale, and known limitations.
In summary:

- **Onboarding (bug fix):** `App.tsx` now wraps the `/board` and `/profile` routes in the existing
  `AuthGate` component, so a not-yet-joined visitor actually sees `AllianceJoinScreen` instead of a
  dead-end "no alliance joined yet" message. No new onboarding UI was built — the join screen
  already existed and was already correct; it just wasn't reachable.
- **PWA:** new `OfflineBanner` component (`src/components/layout/OfflineBanner.tsx`) consumes the
  existing `useOfflineStatus` hook to render the Section 8 "Offline — showing data as of [time]"
  banner, mounted once in `App.tsx`. The PWA manifest/service-worker setup (`vite-plugin-pwa` in
  `vite.config.ts`) was already in place from the foundation phase and was not touched.
- **Help:** new `src/pages/Help.tsx`, `/help` route, and nav entry — none of the three existed
  before this phase.
- **About:** one added line cross-linking to the new Help page; otherwise unchanged.
- **Profile:** no functional changes — `Profile.tsx` and `EditMyStatusFields.tsx` were reviewed and
  found already accessible and mobile-friendly (labeled inputs, `fieldset`/`legend` grouping,
  `aria-pressed` toggle buttons, 44px touch targets via the shared `Button`/`Input` components);
  the one relevant fix is that `/profile` is now actually reachable pre-join, which surfaces the
  page's existing "No alliance joined yet" empty state instead of nothing.
- **Accessibility:** skip-to-content link in `Header.tsx`, targeting a new `id="main-content"` on
  `PageContainer`'s `<main>`.
- **Mobile polish:** reviewed `PlayerCard.tsx` and the shared `ui/` components; found already
  compliant with `DESIGN_SYSTEM.md`'s 44px touch-target rule and mobile-first layout, so nothing
  was changed there (per "do not redesign, do not rewrite working components").
- **Performance:** every route in `App.tsx` is now `React.lazy`-loaded behind one `Suspense`
  boundary; removed a redundant top-level `AllianceProvider` in `main.tsx` that was running a
  second, unnecessary Firestore subscription on `/board` and `/profile`.

---

## Completed in a previous phase (Automatic Expiration)

**Scope:** per the task, this pass implements **only** automatic expiration — when a player's
`Available Until` passes, their status is treated as Unavailable everywhere on the board, live,
with no manual refresh, in a way that's timezone-safe and never shows stale information. Sorting
(5.1), filtering (5.2), search (5.3), and self-editing were explicitly out of scope and were not
touched — `sort.ts`, `SortBar.tsx`, `filters.ts`, `FilterBar.tsx`, `search.ts`, `SearchBar.tsx`,
`EditMyStatusFields.tsx`, `EditMyStatusModal.tsx`, and `firestore.rules` are all unchanged.

### `src/utils/expiration.ts` — new
`isExpired()`, `getEffectiveStatus()`, `applyEffectiveStatus()`, and `nextExpirationTime()` — a
pure, side-effect-free module, same convention as `filters.ts`/`sort.ts`. `isExpired` is true only
for an `available`/`maybe` player whose `availableUntil` is set and at-or-before `now`; an
`unavailable` player is never "expired" (there's no window to run out on). All comparisons are
plain epoch-millis vs. epoch-millis — no `Date` string parsing, no viewer-local-time math on
either side — so the check is timezone-safe by construction, matching how `availableUntil` and
`lastUpdated` were already stored (Section 12.2). `applyEffectiveStatus(players, now)` returns a
new array with each expired player's `status` overridden to `unavailable` (every other field,
including `availableUntil` itself, passes through unchanged) and is meant to be composed *first*,
ahead of search/filter/sort/summary — none of which needed any change, since they already read
`player.status` generically. `nextExpirationTime(players, now)` finds the single soonest upcoming
expiration in the roster, letting the clock hook below schedule one precise wake-up instead of
polling.

### `src/hooks/useExpirationClock.ts` — new
`useExpirationClock(players)` returns the current time as self-updating React state: on every
roster change (or right after it last fired) it schedules exactly one `setTimeout` for the
soonest upcoming `availableUntil` (via `nextExpirationTime`), wakes precisely then, and that wake
re-triggers the same effect to schedule the *next* one — chaining through every future expiration
in the roster with the minimum number of timers, rather than a fixed polling interval. It also
resyncs on the browser's `visibilitychange` event, so a backgrounded/throttled tab (where
`setTimeout` can be delayed) never shows stale information once the tab is looked at again — this
is what satisfies "no stale information" beyond just the timer chain.

### `src/hooks/useAutoExpireOwnStatus.ts` — new
`firestore.rules` (Section 13, rule 3, unchanged this phase) only ever lets a player write their
own document — no viewer's client can legally correct another player's *stored* `status` field
when their window passes. `applyEffectiveStatus` above handles the display side for every player,
for every viewer, without needing to. This hook handles the one legal write-back: when the
signed-in caller's own record in the live roster has expired, their own client persists
`status: 'unavailable'` through the existing `writePlayerStatus()` path — the same one
`EditMyStatusModal` already uses — so the record stored in Firestore becomes accurate too, not
just its on-screen rendering, the next time this player (or anything else reading Firestore
directly) looks. A ref-based guard keys on `uid:availableUntil` so a quiet roster between clock
ticks doesn't refire the same write, and a failed write (offline, etc.) clears the guard so it can
retry on the next tick — this is a best-effort persistence nicety on top of an already-correct
display, never the thing the display itself depends on.

### `src/pages/StatusBoard.tsx` — wired in, composed first
Added `now` (from `useExpirationClock(players)`) and an `effectivePlayers` memo
(`applyEffectiveStatus(players, now)`, keyed on `[players, now]`), computed immediately after
`usePlayers` and fed into the existing `filterPlayersByIgn` → `filterPlayers` → `sortPlayers`
chain and into `StatusBoardSummary` in place of the raw `players` array — both already read
`player.status` generically, so neither needed a single line changed. `useAutoExpireOwnStatus` is
called alongside, watching the raw `players` array (not `effectivePlayers`, so it always compares
against the actually-stored status) for the signed-in user's own uid. The `players.length === 0`
empty-state gate still reads the raw roster, since expiration never changes how many players
exist — only how their status displays.

### `src/hooks/index.ts` — new exports
Exports `useExpirationClock` and `useAutoExpireOwnStatus`.

### `src/utils/time.ts` — one comment correction
The module doc previously said expiration was "explicitly out of scope for this phase," written
back when that was true. Updated to point at `expiration.ts` / `useExpirationClock.ts` instead of
leaving a stale claim in place — no functional change to this file; `isStale`,
`formatRelativeTime`, `formatAvailableUntil`, `toDatetimeLocalValue`, and
`fromDatetimeLocalValue` are all byte-for-byte unchanged.

## Notable decisions

- **Display correction is universal; Firestore correction is owner-only, by necessity.** Every
  viewer's board shows every expired player as Unavailable immediately, because
  `applyEffectiveStatus` runs client-side against data everyone can already read. But
  `firestore.rules` rule 3 means only the affected player's own client can ever legally write
  their own `status` field — so the *stored* value for an offline player only self-corrects once
  their own device reconnects. This isn't a gap: nothing else on the board (summary counts,
  filters, sort, other players' cards) ever reads the raw stored `status` directly — everything
  downstream of `StatusBoard.tsx` consumes `effectivePlayers`, so what every person actually sees
  is correct in realtime regardless of whether the write-back has happened yet.
- **A scheduled wake-up, not a polling interval.** `useExpirationClock` computes the single
  soonest upcoming expiration and sets one `setTimeout` for exactly that moment, rather than
  re-checking every N seconds. This is simultaneously more precise (status flips within
  milliseconds of the boundary, not up to a polling period late) and cheaper (no timer running at
  all when nothing in the roster has an upcoming `availableUntil`).
- **Epoch-millis comparison, not `Date` parsing, for timezone safety.** `availableUntil` was
  already stored as epoch millis (Section 12.2) and `fromDatetimeLocalValue`
  (`utils/time.ts`, from the Self-Editing phase) already converts the `datetime-local` input using
  the viewer's own local time zone at the moment it's set. `isExpired` just compares that number
  against `Date.now()` — both numbers, no string reinterpretation — so the check produces the same
  answer regardless of which time zone the comparing device is in.
- **No new Firestore field, no rules change, no Cloud Function.** Expiration is fully derived from
  the existing `status` + `availableUntil` fields already on `Player` (Section 12.2); no schema
  change was needed. The write-back path reuses `writePlayerStatus()` and the existing `update`
  rule in `firestore.rules` exactly as `EditMyStatusModal` already does, so no rules edit was
  needed either. A scheduled Cloud Function (`functions/`) was considered and rejected for this
  phase: it would need the project on a billing-enabled ("Blaze") plan and a separate
  `firebase deploy --only functions` step, neither of which this phase's "no new dependencies, no
  new backend" precedent (every prior phase's changelog) calls for when a fully client-side
  solution already satisfies every stated requirement (realtime, timezone-safe, no stale
  information) — see "Verification performed this pass" below for how each requirement was
  checked.

## Verification performed this pass (Automatic Expiration)

- **Expiration correctness:** a standalone Node script exercising `isExpired` / `getEffectiveStatus`
  / `applyEffectiveStatus` / `nextExpirationTime` directly (same logic as `expiration.ts`, since
  this sandbox has no installed `react`/`firebase` packages to import the real module through —
  see "Known limitations"), covering: an expired `available` player, a not-yet-due `maybe` player,
  an already-`unavailable` player with a past `availableUntil` (correctly never flagged as
  "expired" — there's no window to run out on), a player with no `availableUntil` set, an
  exact-boundary case (`availableUntil === now`, correctly expired via the `<=` comparison),
  `applyEffectiveStatus` producing the right overridden/unchanged statuses for every case above
  plus a no-mutation check on the input array and a reference-reuse check for untouched players,
  and `nextExpirationTime` correctly finding the soonest future expiration and returning `null`
  when nothing upcoming exists. All 16 assertions passed.
- **Realtime:** traced the chain by hand — `useExpirationClock` schedules a `setTimeout` for
  exactly `nextExpirationTime(players, now)`; on fire it calls `setNow(Date.now())`, which changes
  the hook's return value, which changes `effectivePlayers`' `useMemo` dependency, which
  recomputes and re-renders the board with the newly expired player showing Unavailable — no
  Firestore round-trip and no manual refresh required for this to happen for *any* viewer, since
  it depends only on the roster already delivered by the existing `usePlayers` subscription plus
  the local clock. Also confirmed the effect's dependency on `now` (not just `players`) means a
  quiet roster with multiple players expiring at different times still gets a fresh timer
  scheduled after each one fires, not just the first.
- **Timezone safety:** confirmed every comparison in `expiration.ts` is epoch-millis vs.
  epoch-millis (`player.availableUntil <= now`, both already-converted numbers) — no `Date`
  constructor, no `.toDateString()`/`.toLocaleString()`, no string parsing anywhere in the
  expiration path itself (those only exist in `time.ts`'s *display* formatters, which this phase
  didn't touch).
- **Firestore:** read `writePlayerStatus()` and `firestore.rules`' `update` rule together and
  confirmed `useAutoExpireOwnStatus`'s payload satisfies every field the rule checks
  (`isValidPlayerWrite`: valid status, ign present, note length, array caps, `capability` a map)
  and only ever targets `uid === request.auth.uid` — the same call shape `EditMyStatusModal`
  already makes successfully, just triggered by the expiration clock instead of a manual save.
  Confirmed no other code path anywhere in this phase writes to any player document other than the
  signed-in caller's own.
- **Scope check:** diffed every file against the pristine, unmodified project. Exactly three new
  files (`src/utils/expiration.ts`, `src/hooks/useExpirationClock.ts`,
  `src/hooks/useAutoExpireOwnStatus.ts`) and three edited files (`src/pages/StatusBoard.tsx`,
  `src/hooks/index.ts`, `src/utils/time.ts` — the last a comment-only change). `filters.ts`,
  `FilterBar.tsx`, `sort.ts`, `SortBar.tsx`, `search.ts`, `SearchBar.tsx`,
  `EditMyStatusFields.tsx`, `EditMyStatusModal.tsx`, `firestore.rules`, and `types/models.ts` all
  confirmed byte-for-byte unchanged. No sorting, filtering, search, or editing behavior was added
  or changed anywhere.
- **Not independently re-verified:** `npm install` / `npm run build` / `npm run typecheck` /
  `eslint .` — this sandbox has no outbound npm registry access (`npm install` returns `403
  Forbidden`), consistent with every phase since filtering. The isolated `tsc --noEmit` (stub
  method, same as prior phases) was run against every new/edited file; the only errors it reported
  are the same pre-existing "no installed `react`/`firebase` type declarations" noise every prior
  phase's isolated check also reported for files it didn't touch — no new errors specific to
  `expiration.ts`, `useExpirationClock.ts`, `useAutoExpireOwnStatus.ts`, `StatusBoard.tsx`,
  `hooks/index.ts`, or `time.ts`. The pre-existing, unrelated `tsc -b --noEmit` / `npm run
  typecheck` project-reference issue (see "Known limitations" below) was not re-investigated this
  phase. Run `npm install && npm run build && npm run typecheck && npx eslint .` yourself before
  merging or deploying.
- **Mobile / desktop:** no new UI was added this phase (no new component, no new visual element —
  `StatusBadge` already renders whatever `status` it's given, so an expired player's badge simply
  reads "Unavailable" through the exact same rendering path every other Unavailable player already
  uses). Not independently re-captured as screenshots; nothing to newly verify visually beyond what
  prior phases already screenshot-verified for the Unavailable badge state itself.

---

## Verification performed this pass (Self-Editing re-verification)

The task asked for exactly what "Self-Editing (`EditMyStatusModal`)" (below) already delivers.
Rather than duplicate that work — which would also violate this task's own "do not edit any other
functionality" instruction — this pass re-verified the existing implementation end to end and
made no functional changes. No files were edited except this one and `CHANGELOG_CURRENT.md`.

- **Requirement coverage, read line-by-line against the actual code (not just this changelog's
  prior claims):**
  - *Own-record-only editing:* `writePlayerStatus()` (`src/firebase/firestore.ts`) and
    `useMyPlayer()` (`src/hooks/useMyPlayer.ts`) take no target-uid parameter from any caller other
    than the signed-in user — there is no code path that can write another player's document.
  - *Editable fields:* `EditMyStatusFields.tsx` covers all eight — Status, Available Until,
    Activity/Notes, Looking For, Can Lead, Scouting, Capabilities, plus IGN (required by the
    schema for any write at all).
  - *Validation:* client-side in `validate()` (`EditMyStatusFields.tsx`, IGN and note length) and
    `validatePlayerWriteInput()` (`firebase/firestore.ts`, status enum, note length, array caps,
    required IGN).
  - *Friendly errors:* `friendlyErrorMessage()` (`src/utils/errors.ts`) maps permission-denied,
    offline/network, and "not in an alliance" errors to plain-language messages; anything
    unrecognized falls back to a generic friendly message rather than a raw SDK error.
  - *Realtime save:* a save writes directly to Firestore; every other connected member's board
    already listens via `subscribeToPlayers`'s `onSnapshot` and reflects the change immediately —
    no separate publish step, no page reload.
  - *Loading indicators:* `EditMyStatusModal` shows `Loading` while the one-shot profile read is
    in flight; the submit button reads "Saving…" and disables while `saving` is true.
  - *Confirmation messages:* a `role="status"` success message appears after a successful save;
    errors use `role="alert"` so both are announced to screen readers.
- **Firestore rules:** read `firestore.rules` in full. `create`/`update` on
  `alliances/{allianceId}/players/{playerId}` both require `request.auth.uid == playerId`;
  `isValidPlayerWrite()` re-validates status/IGN/note/array-length/capability shape server-side;
  `lastUpdated`/`createdAt` must equal `request.time` (server-set only, never client-supplied);
  `delete` is unconditionally denied. This is the real security boundary and matches the client's
  own validation exactly. Unchanged this pass — it already implemented everything required.
- **Authentication:** read `AuthContext.tsx` / `firebase/auth.ts`. `useMyPlayer` and
  `writePlayerStatus` derive `uid`/`allianceId` only from the signed-in session (`useAuth()`),
  never from a prop or route param — consistent with the rules above. Unchanged this pass.
- **Realtime:** confirmed `StatusBoard.tsx`'s roster grid still maps over `usePlayers`'s live
  `onSnapshot` subscription, so a saved edit reaches every viewer without a refresh. Unchanged.
- **Build:** this sandbox has no outbound network access this pass (`npm install` fails with
  `403 Forbidden` from the npm registry, same as several prior phases documented below) —
  `npm install`, `vite build`, and `npm run typecheck` could not be executed here. Every
  editing-related file was instead read and manually traced end-to-end (form → validation →
  `useMyPlayer` → `writePlayerStatus` → rules), and no type or logic issues were found. **Run
  `npm install && npm run build && npx eslint .` yourself before merging or deploying** — this is
  an honest limitation of this sandbox, not a claim that a build was run and passed.
- **Scope check:** no files outside `DEVELOPMENT_STATUS.md` and `CHANGELOG_CURRENT.md` were
  modified this pass. Sorting, filtering, search, routing, and every other existing feature are
  untouched.

## Completed in this phase (Status Board Sorting)

**Scope:** per the task, this pass implements **only** sorting (Section 5.1) — Available first,
Recently updated, IGN, Activity, Scouting, and Capability category, realtime, fast, and stable.
Filtering (5.2) and search (5.3) were explicitly out of scope and were not touched —
`src/utils/filters.ts`, `src/components/board/FilterBar.tsx`, `src/utils/search.ts`, and
`src/components/board/SearchBar.tsx` are unchanged.

### `src/utils/sort.ts` — new
`SortKey`, `SortState`, `DEFAULT_SORT_STATE`, and `sortPlayers(players, sort)` — a pure,
side-effect-free function implementing Section 5.1's six sortable dimensions. Each dimension has
its own comparator with a fixed, name-matching "natural" order (e.g. "Available first" truly puts
available players first by default; "Recently updated" defaults to most-recent-first); a single
`direction: 'asc' | 'desc'` uniformly reverses whichever comparator is active, rather than
inventing per-key ascending/descending semantics. Capability category sorts by the declared value
for one chosen boss category as a plain lexical string compare — never a numeric level parse,
consistent with `models.ts`'s note that capability values are "purely informational, never
parsed/ranked." Every comparator returns exactly `0` for genuine ties, so `Array.prototype.sort`'s
guaranteed stability (spec-stable since ES2019) preserves the incoming (already
searched-and-filtered) order across them — this satisfies the "stable sorting" requirement with no
manual index-tracking.

### `src/components/board/SortBar.tsx` — new
The sort controls: a single-select toggle-button group (one sort key active at a time — a roster
only has one order, unlike `FilterBar`'s combinable multi-select groups), reusing the same
`aria-pressed` + variant-swap `Button` pattern `FilterBar` already established. A reverse-direction
icon button sits alongside the key selector. When Capability category is the active key, a second
chip row appears to pick which boss category to sort by (Section 5.1: "each boss category is its
own sort key"), with the same "alliance hasn't set up any yet" fallback message `FilterBar` uses
for its own boss-category-driven groups. The panel collapses via the same functional
(not decorative) header toggle `FilterBar` uses. Fully controlled, same pattern as `FilterBar` —
`StatusBoard.tsx` owns the `SortState`, this component only reflects it.

### `src/pages/StatusBoard.tsx` — sort wired in, composed last over the already-filtered list
Added `sort` state (page-level, same pattern as `searchQuery`/`filters`). A new `sortedPlayers`
memo runs `sortPlayers(filteredPlayers, sort)`, keyed on `[filteredPlayers, sort]` — `filteredPlayers`
itself is completely unchanged (still exactly what search + filters alone produce), and sorting
only reorders that same list, never altering which players are in it. `SortBar` renders directly
below `FilterBar`. The roster `<ul>` now maps over `sortedPlayers`; result-count and "no results"
messaging still reference `filteredPlayers`, since sorting can't create or remove a match.

### Why sorting needed no new plumbing for "works with live updates" / "persists during updates"
Identical reasoning to search's and filters' own phases: `usePlayers` (unchanged) delivers the live
roster via `onSnapshot`; `filters` and `searchQuery` (both unchanged) drive `filteredPlayers`
exactly as before; `sort` is ordinary React state at the page level, entirely independent of all
three. Every roster/search/filter update recomputes `sortedPlayers` (a `useMemo` over
`[filteredPlayers, sort]`) while `sort` itself is left completely untouched — so "sort persists
during live updates" and "realtime sorting" both fall out of ordinary React data flow, with no new
subscription or synchronization code.

### Security — unchanged, verified
Sorting is a pure client-side array reorder over data `usePlayers` already reads (and search/filters
already narrowed); it issues no new Firestore query and therefore needed no change to
`firestore.rules` or `firestore.indexes.json` (both read in full, confirmed unaffected).

### Verification performed
- **TypeScript:** no outbound npm registry access in this environment this phase (`npm install`
  returns `403 Forbidden` — unlike the immediately preceding filtering phase, which had working
  registry access). Every new/edited file was checked with the globally available `tsc` against
  the full `src` tree using minimal stubbed `react` ambient types, the same isolated method earlier
  phases (before filtering) used and documented. None of the four files touched this phase
  (`sort.ts`, `SortBar.tsx`, `board/index.ts`, `StatusBoard.tsx`) produced an error under that
  check; every other finding was pre-existing stub-artifact noise in files this phase didn't touch
  (missing `react` exports the minimal stub doesn't declare, and unresolvable `firebase/*` module
  types).
- **Sort semantics:** a standalone script exercised `sortPlayers()` against a hand-built roster —
  every one of the six sort keys (including the default and a reversed direction), Capability
  category with no category chosen (no-op) and with one chosen (lexical compare, undeclared last),
  an explicit tie-stability assertion, and a no-mutation assertion. All ten assertions passed.
- **Scope check:** diffed every file against the pristine, unmodified project. Exactly two new
  files and two edited files (listed above and in `CHANGELOG_CURRENT.md`); `filters.ts`,
  `FilterBar.tsx`, `search.ts`, and `SearchBar.tsx` confirmed byte-for-byte unchanged; no filtering,
  search, editing, or expiration code introduced anywhere.
- **Mobile / desktop:** `SortBar`'s chip rows reuse the exact `flex flex-wrap` pattern and `Button`
  component already screenshot-verified (in an earlier phase) for `FilterBar`'s equivalent chip
  layout. Not independently re-captured as new screenshots this phase — no headless-browser binary
  access in this sandbox this phase either (same limitation as several phases before filtering).
- **Not independently re-verified:** `npm run build` / `npm run typecheck` / `eslint .` — no
  outbound network access this phase (see above). The pre-existing, unrelated `tsc -b --noEmit`
  project-reference failure noted below was not re-investigated this phase (still unrelated to
  sorting). Run `npm install && npm run build && npm run typecheck && npx eslint .` yourself before
  merging or deploying.

## Completed in the previous phase (Status Board Filtering)

**Scope:** per the task, this pass implements **only** filtering (Section 5.2) — Status,
Scouting, Can Lead, Looking For, and Boss Category, combinable simultaneously. Sorting (5.1),
editing, expiration, and any change to search (5.3) were explicitly out of scope and were not
touched — `src/utils/search.ts` and `src/components/board/SearchBar.tsx` are unchanged.

### `src/utils/filters.ts` — new
`FilterState`, `EMPTY_FILTER_STATE`, `hasActiveFilters()`, `activeFilterCount()`, and
`filterPlayers(players, filters)` — a pure, side-effect-free function implementing Section 5.2's
semantics exactly: AND across filter groups, OR within a group (e.g. Looking For: Hydra OR
Cerberus, AND Status: Available). The Boss Category group deliberately reads `player.capability`'s
keys (declared capability), not `player.canLead` — these are two different fields per the schema,
and the spec calls out Boss Category as "shows players with any declared capability in that
category," distinct from the Can Lead filter.

### `src/components/board/FilterBar.tsx` — new
The filter controls: a toggle-button group per dimension (Status, Scouting, Looking For, Can
Lead, Boss Category), reusing `EditMyStatusFields.tsx`'s existing `aria-pressed` + variant-swap
button pattern so every chip inherits the 44px touch-target floor with no new UI primitive. Shows
an "N active" badge and a "Clear filters" action once any filter is set. The panel collapses via a
header toggle (local, UI-only state — not part of `FilterState`) to keep five filter groups from
permanently consuming vertical space on a phone screen; starts expanded. Fully controlled, same
pattern as `SearchBar` — `StatusBoard.tsx` owns the `FilterState`, this component only reflects it.

### `src/pages/StatusBoard.tsx` — filters wired in, composed with (not replacing) search
Added `filters` state (page-level, same pattern as `searchQuery`). `filteredPlayers` now runs
`filterPlayersByIgn` (unchanged) and then `filterPlayers` (new) inside one `useMemo` keyed on
`[players, debouncedSearchQuery, filters]`. `FilterBar` renders directly below `SearchBar`. The
"no results" `EmptyState` message now distinguishes whether search, filters, or both are active
and matching nobody.

### Why filters needed no new plumbing for "works with live updates" / "persists during updates"
Identical reasoning to search's own phase: `usePlayers` (unchanged) delivers the live roster via
`onSnapshot`; `filters` is ordinary React state at the page level, entirely independent of that
roster state. Every roster update recomputes `filteredPlayers` (a `useMemo` over
`[players, debouncedSearchQuery, filters]`) while `filters` itself is left completely untouched —
so both "filters persist during live updates" and "realtime filtering" fall out of ordinary React
data flow, with no new subscription or synchronization code.

### Security — unchanged, verified
Filtering is a pure client-side array filter over data `usePlayers` already reads; it issues no
new Firestore query and therefore needed no change to `firestore.rules` or
`firestore.indexes.json` (both read in full, confirmed unaffected).

### Verification performed
- **TypeScript:** `npx tsc -p tsconfig.json --noEmit` passes with zero errors, checked against the
  real `@types/react`/`firebase` packages — this sandbox had working npm registry access this
  phase, so `npm install` actually ran (unlike every previous phase's stubbed-type method; see
  "Known limitations" for the one config-level caveat this surfaced, unrelated to this phase's
  changes).
- **Production build:** `vite build` (the build half of `npm run build`) completes successfully;
  confirmed the new filter UI strings appear in the built `dist/` bundle.
- **Lint:** `eslint .` reports zero errors; the only warnings are three pre-existing, unrelated
  `react-refresh/only-export-components` notices in files this phase didn't touch.
- **Filter semantics:** a standalone script exercised `filterPlayers()` against a hand-built
  roster — every group individually, OR-within-a-group, AND-across-groups, and the Can Lead vs.
  Boss Category distinction. All assertions passed.
- **Scope check:** diffed every file against the pristine, unmodified project. Exactly two new
  files and two edited files (listed above and in `CHANGELOG_CURRENT.md`); `search.ts` and
  `SearchBar.tsx` confirmed byte-for-byte unchanged; no sorting, editing, or expiration code
  introduced anywhere.
- **Mobile / desktop:** `FilterBar`'s chip rows use the same `flex flex-wrap` pattern already
  screenshot-verified for `EditMyStatusFields.tsx` and rely on the same `Button` component's 44px
  touch-target floor project-wide. Not independently re-captured as new screenshots this phase —
  this sandbox has npm registry access but not the headless-browser binary CDN needed to render
  one; see `CHANGELOG_CURRENT.md`'s verification section for detail.
- **A pre-existing, unrelated issue found (not fixed, out of scope):** `npm run typecheck`
  (`tsc -b --noEmit`) fails with `TS6310: Referenced project '.../tsconfig.node.json' may not
  disable emit`. Reproduced on the pristine, unmodified project *before* any change in this phase
  — this is a `tsconfig.json`/`tsconfig.node.json` project-reference configuration issue, not
  something this filtering-only phase introduced or is in scope to fix. `npx tsc -p tsconfig.json
  --noEmit` (same compiler options, without the `-b` composite-build wrapper) passes cleanly, and
  the `vite build` step it feeds into also succeeds, so the app itself is not actually broken —
  only the CI workflow's specific `tsc -b` invocation is affected. Flagging this for a future pass
  to fix `tsconfig.node.json` (likely needs its own explicit `noEmit: true` or a `composite`
  adjustment) since `.github/workflows/deploy.yml` runs `npm run typecheck` as a required step
  before `npm run build`.

## Completed in the previous phase (Player Search)

**Scope:** per the task, this pass implements **only** free-text search by IGN (Section 5.3) —
nothing else. Sorting (5.1), filtering by status/tag/category (5.2), editing, expiration, PWA
work, notifications, and Discord were all explicitly out of scope and were not touched.

### `src/utils/search.ts` — new
`filterPlayersByIgn(players, query)` — a pure, case-insensitive substring match against
`player.ign`. An empty or whitespace-only query returns the roster unchanged. No React, no
Firestore — this is a plain data transform so it stays independently reusable/testable.

### `src/hooks/useDebouncedValue.ts` — new
A generic `useDebouncedValue<T>(value, delayMs)` hook. `StatusBoard.tsx` binds the search
`Input` directly to the raw `searchQuery` state (so every keystroke shows up instantly — a real
UI lag would fail "real-time filtering while typing") and only feeds the **debounced** value into
`filterPlayersByIgn`, so the actual filter (and the resulting re-render of every `PlayerCard`)
only runs once typing pauses for 200ms.

### `src/components/board/SearchBar.tsx` — new
The search box itself: an `Input` (`type="search"`), a clear button that appears only once there's
a query (reuses the exact inline "X" `<svg>` markup `Modal.tsx`'s close button already uses — no
new icon dependency), and an `aria-live="polite"` result-count line. Fully controlled — all state
(`searchQuery`) lives in `StatusBoard.tsx`; this component just reflects it.

### `src/pages/StatusBoard.tsx` — search wired in above the roster grid
Added `searchQuery` state, `useDebouncedValue`, and a `useMemo`'d `filteredPlayers` derived from
`filterPlayersByIgn(players, debouncedSearchQuery)`. `SearchBar` renders between
`StatusBoardSummary` and the roster grid; the grid now maps over `filteredPlayers` instead of
`players`, and a "No players match your search" `EmptyState` replaces the grid when a query
matches nobody. `StatusBoardSummary` deliberately still summarizes the *whole* alliance roster
(unfiltered) — it's a roster-wide comprehension aid (Section 2), not a search-result count, and
narrowing it was not part of this task.

### Why search state needed no new plumbing for "works with live updates"
`usePlayers` (unchanged) already delivers the live roster via `onSnapshot`; `searchQuery` is
ordinary React state at the page level, entirely independent of that roster state. Every time
`players` updates, `filteredPlayers` (a `useMemo` keyed on `[players, debouncedSearchQuery]`)
automatically recomputes against the new roster while `searchQuery` itself is left completely
untouched — so "search state preserved while board updates" and "search works with live Firestore
updates" both fall out of ordinary React data flow, with no new subscription or synchronization
code required.

### Security — unchanged, verified
Search is a pure client-side array filter over data `usePlayers` already reads; it issues no new
Firestore query and therefore needed no change to `firestore.rules` or `firestore.indexes.json`
(read in full, confirmed unaffected).

### Verification performed
- **TypeScript:** every new/edited file was checked with `tsc` against the full `src` tree using
  stubbed `react`/`firebase`/`react-router-dom` ambient types — the same isolated method the
  previous three phases used and documented (no outbound network in this environment; see "Known
  limitations"). None of the files touched this phase produced a genuine error; the only findings
  are the identical "implicit any" / "JSX.IntrinsicElements" false positives the stub already
  produces across every pre-existing component (`PlayerCard.tsx`, `EditMyStatusFields.tsx`, etc.),
  caused by the stub's simplified types in the absence of real `@types/react` — not a new issue
  introduced by this phase.
- **Scope check:** re-read the full diff before finishing — `StatusBoardSummary`, `PlayerCard`,
  `EditMyStatusFields`, `EditMyStatusModal`, `usePlayers`, `firestore.rules`, and every other
  existing file are unchanged; only the three new files above and the two `index.ts` barrel files
  plus `StatusBoard.tsx` were touched.
- Not independently re-verified: `npm run build` (see "Known limitations" — no outbound network
  access in this environment, unchanged from every previous phase).

## Completed in the previous phase (Self-Editing — `EditMyStatusModal`)

**Scope:** per the task, this pass lets a logged-in player edit **only their own** record — the
eight requested fields (Status, Available Until, Current Activity, Looking For, Can Lead,
Scouting, Capabilities, Notes) — and nothing beyond that: no editing of another player's record,
no sorting/filtering/search, no offline banner, no routing-level auth gating. The write path
(`useMyPlayer().save()` → `writePlayerStatus`) and its security rules already existed from the
Cloud Data Layer phase; this pass builds the UI on top of them, per the "Next development phase"
item 3 this file already named.

### `src/components/board/EditMyStatusFields.tsx` — new
The actual form. Every field maps to `PlayerWriteInput` (Section 12.2) exactly, plus an "In-game
name" field — not in the task's list, but required by the schema and rules for any write at all,
and populated by no other existing flow (see `CHANGELOG_CURRENT.md`'s "Notable decisions" for why).
Owns local field state (initialized from the signed-in player's existing record, or blank
defaults for a first-time player), validation mirroring `validatePlayerWriteInput`, the save call,
and the loading/error/success messaging. Status, Looking For, and Can Lead are toggle-button
groups built from the existing `Button` component (`aria-pressed` + variant swap) rather than a
new checkbox component, so every touch target stays at the 44px floor `DESIGN_SYSTEM.md` requires.
Rendered by both `EditMyStatusModal` (below) and `Profile.tsx` — one implementation, no duplicated
field list or validation logic.

### `src/components/board/EditMyStatusModal.tsx` — new
Thin `Modal` wrapper around `EditMyStatusFields`, backed directly by `useMyPlayer()`. Shows
`Loading` while the one-shot profile read is in flight and `ErrorState` if it fails; otherwise
renders the form.

### `src/components/board/PlayerCard.tsx` — own-card edit affordance
Added optional `isOwnPlayer` / `onEdit` props. An "Edit my status" button now renders only when
`isOwnPlayer` is true; every other player's card is completely unchanged — still display-only,
per Section 5.4. The own card also gets a subtle `ring-gold/40` highlight (existing token, reduced
opacity — no new color introduced).

### `src/pages/StatusBoard.tsx` — modal wired in, own-card detection
One `EditMyStatusModal` is mounted per page load (not one per card). A header-level "Edit my
status" button opens it directly — necessary for a first-time player, who has no card yet to click
"Edit" on. Each `PlayerCard` now receives `isOwnPlayer={player.uid === user?.uid}` and `onEdit`, so
the edit affordance can only ever appear on the signed-in caller's own card.

### `src/pages/Profile.tsx` — real content, replacing the placeholder
This page previously showed a static "no profile editor yet" `EmptyState`. It now renders the same
`EditMyStatusFields` form inline (no modal chrome), behind the same firebaseReady / auth / alliance
/ player loading-and-error gating `StatusBoard.tsx` already uses.

### `src/utils/time.ts` — datetime-local helpers
Added `toDatetimeLocalValue()` / `fromDatetimeLocalValue()`, converting between epoch millis and
the string format `<input type="datetime-local">` requires, for the Available Until field.
Display-only-style helpers, consistent with the rest of this file — no validation lives here.

### `src/utils/errors.ts` — new
`friendlyErrorMessage()` — turns a raw thrown `Error` (client-side validation message, or a
Firestore SDK / Security Rules rejection) into a short, plain-language string for the form's error
state. Falls back to a generic friendly message for anything it doesn't recognize, rather than
surfacing a raw SDK error to the player.

### Security — unchanged, verified
`firestore.rules` was read in full before starting this phase and required **no changes**: writes
were already scoped to `request.auth.uid == playerId` (rule 3/7, Section 13), and
`isValidPlayerWrite` already validates every field this form submits (status enum, IGN length,
note length, array caps, server-set `lastUpdated`). This phase's form payload was built to match
`PlayerWriteInput` exactly so the existing rules and existing `validatePlayerWriteInput` continue
to apply unmodified. No player can write any document but their own — enforced independently at
both the API-surface layer (`firebase/firestore.ts`, `useMyPlayer`, ADR-008) and the Security
Rules layer, neither of which this phase touched.

### Verification performed
- **TypeScript:** every new/edited file was checked with `tsc` against the full `src` tree using
  stubbed `react`/`firebase`/`react-router-dom` ambient types — the same isolated method the
  previous two phases used and documented (no outbound network in this environment; see "Known
  limitations"). None of the files touched this phase produced an error. The only findings in
  `EditMyStatusFields.tsx` are five "implicit any" notices on inline event-handler parameters — the
  identical false-positive the stub already produces on the pre-existing `AllianceJoinScreen.tsx`
  (same handler shape), caused by the stub's simplified event types rather than a real issue; it
  resolves once real `@types/react` are installed.
- **Authentication:** not modified. `AuthContext`, `firebase/auth.ts`, and the join-code flow are
  untouched; this phase only consumes the existing `useAuth()` hook.
- **Firestore rules:** read in full, confirmed already correct for this phase's needs (see
  "Security" above), left unchanged.
- Not independently re-verified: `npm run build` (see "Known limitations" — no outbound network
  access in this environment, unchanged from both previous phases).

## Completed in the previous phase (Player Cards — Production Quality Pass)

**Scope:** per the task, this pass makes `PlayerCard` production-quality as a **display-only**
component — no editing affordance was added. `PlayerCard` already existed from the previous
phase with every requested field present; this pass is a targeted hardening/polish, not a
rebuild, and touches only the files listed below.

### `src/components/board/PlayerCard.tsx` — relabelled, documented
- The "Current Activity" section is now labelled **"Activity / Notes"**. The task's requested
  field list names "Activity" and "Notes" as two separate fields, but the schema (`Player`,
  Section 12.2) has only one self-declared free-text field (`note`, Section 4.1). Rather than
  duplicate the same text under two headings or invent a second, unpopulated field, both
  requested names are represented against the one field that actually holds data. This is a
  label choice only — no schema change, consistent with how the previous phase resolved the
  same field's naming.
- The "Capability" section is now labelled **"Capability Summary"**, matching the task's field
  list exactly.
- Expanded the component's doc comment to record both decisions above and the accessibility
  approach, so the next phase doesn't have to rediscover the reasoning.

### `src/pages/StatusBoard.tsx` — card grid given list semantics
The player-card grid was a bare `<div>` of cards. It's now a `<ul role="list" aria-label="Alliance
roster">` with each `PlayerCard` wrapped in an `<li role="listitem">`. Tailwind's Preflight resets
`list-style` on `<ul>`, which strips native list semantics in some screen readers (notably
VoiceOver) unless `role="list"` is set explicitly — this is the standard workaround. Combined with
`PlayerCard`'s existing `h3` IGN heading, a screen-reader user can now both navigate the roster as
a list and jump card-to-card via heading navigation. Grid layout classes (`grid-cols-1` →
`sm:grid-cols-2` → `lg:grid-cols-3`) are unchanged — only the wrapping element changed, so visual
layout is identical.

### Verification performed
- **TypeScript:** `PlayerCard.tsx` and `StatusBoard.tsx` were checked with `tsc` against the full
  `src` tree using stubbed `react`/`firebase`/`react-router-dom` ambient types (no outbound network
  in this environment — see "Known limitations"). Neither edited file produced any error; all
  errors surfaced were pre-existing stub-artifact noise in unrelated files (missing named exports
  from the stub modules), matching what the previous phase already documented for this same
  isolated-check method.
- **Mobile / desktop layout:** rendered the exact card markup and Tailwind classes in a standalone
  HTML page using the project's real theme tokens (`tailwind.config.js`), and captured screenshots
  at 390px (mobile) and 1440px (desktop). Verified: single-column stacking on mobile widening to a
  3-column grid on desktop, a long IGN wrapping without breaking the layout, stale "Last updated"
  dimming, and full-data vs. minimal-data cards (missing `Available Until`, no note, no tags)
  rendering cleanly without leftover gaps.
- Not independently re-verified: `npm run build` (see "Known limitations," unchanged from the
  previous phase — no outbound network access in this environment).

## Completed in the previous phase (Alliance Status Board — Foundation)

**Scope:** per the phase instructions, this pass builds only the Status Board's *display*
foundation — layout, summary section, live player grid, responsive behavior, and loading/empty/
error states. Sorting, filtering, search, editing, expiration behavior, and PWA work were
explicitly out of scope and were not touched.

### `src/pages/StatusBoard.tsx` — replaced the placeholder
Now renders, in order: a state gate (Firebase not configured / signing in / no alliance joined /
loading / error / empty roster), the summary section, and the live player grid — driven entirely
by the already-built `useAuth`, `useAlliance`, and `usePlayers` hooks. No new data-fetching logic
was added; this phase is presentation only.

### `src/components/board/` — new
- `StatusBoardSummary.tsx` — the top summary strip: Players Online, Available, Maybe,
  Unavailable, Scouting, Available Leaders, and a "Currently Looking For" tag/count breakdown.
  All counts are derived client-side from the live roster already delivered by `usePlayers` —
  no new queries.
- `PlayerCard.tsx` — one player's self-declared record: IGN, Status, Available Until, Last
  Updated (dimmed when stale), Current Activity, Looking For, Can Lead, Scouting indicator, and
  Capability summary.
- `StatusBadge.tsx`, `ScoutingBadge.tsx`, `LookingForTags.tsx`, `CanLeadTags.tsx`,
  `CapabilityList.tsx` — supporting presentational pieces, matching the component tree in
  `PROJECT_SPECIFICATION.md` Section 11.

### `src/utils/time.ts` — new
`formatRelativeTime`, `formatAvailableUntil`, and `isStale` — the staleness/formatting helpers the
spec's folder structure (Section 10) already reserved for this phase. Display-only; this does
**not** implement expiration (a status never changes itself based on time — that remains a
self-declared, player-driven action, out of scope here).

### `src/main.tsx` — `AllianceProvider` now mounted
`AllianceContext` was built in the previous phase but never wired into the app. The board needs it
(boss-category labels, looking-for labels, `staleAfterMinutes`), so it's now mounted inside
`AuthProvider`, matching its own dependency on `useAuth()`. No other change to app bootstrapping.

### One documented interpretation
The card fields requested for this phase include "Current Activity," which has no matching field
in the existing schema (`Player`, Section 12.2). Rather than adding a new Firestore field mid-phase,
`PlayerCard` surfaces the existing `note` field (Section 4.1: short, self-declared free text) under
the label **"Current Activity."** This is a UI label choice only — no schema or security-rules
change. *(Superseded: the Player Cards Production Quality Pass above relabelled this section
"Activity / Notes" — see that section for why.)*

---

## Completed in the previous phase (Cloud Data Layer)

### Firebase initialization
- `src/firebase/config.ts` now actually calls `initializeApp()`, `initializeFirestore()` (with
  `persistentLocalCache` + `persistentMultipleTabManager` for offline persistence, per ADR-005),
  and `getAuth()` — all lazily, once, and only when `VITE_FIREBASE_*` env vars are present.
  `isFirebaseConfigured()` lets the rest of the app detect standalone/no-project mode without
  every module re-checking env vars itself.

### Authentication (ADR-004)
- `src/firebase/auth.ts` — anonymous sign-in (`ensureAnonymousSession`), custom-claim reading
  (`getAllianceClaim`), and a combined auth+claim realtime subscription (`subscribeToCurrentUser`).
- `src/contexts/AuthContext.tsx` — app-wide `useAuth()` hook exposing `user`, `loading`,
  `firebaseReady`, `error`, and `submitJoinCode()`.
- `src/components/auth/AllianceJoinScreen.tsx` and `AuthGate.tsx` — the IGN + join-code entry
  screen and the gate that shows it when no `allianceId` claim is present yet. **Not yet wired
  into routing** — `AuthProvider` is mounted at the app root (`main.tsx`) so `useAuth()` works
  everywhere, but which routes actually render behind `AuthGate` (likely `/board` and `/profile`,
  probably not `/` or `/about`) is left as a routing/UX decision for whoever builds the real
  Status Board, per this phase's "do not build the finished dashboard" boundary.

### Cloud Functions (ADR-004, ADR-009)
- `functions/src/joinAlliance.ts` — the only place a join code is ever checked. Hashes the
  submitted code, looks up the matching `alliances` document by `joinCodeHash`, and mints the
  `allianceId` (+ `role: member`) custom claim via the Admin SDK. Callable, not a REST endpoint,
  for this phase — the documented HTTPS API surface for the future Discord bot (Section 15) is a
  separate, later addition to this same `functions/` project.
- `functions/package.json`, `functions/tsconfig.json` — standalone TypeScript build, deployed
  independently of the Vite frontend (`firebase deploy --only functions`).

### Firestore data layer
- `src/types/models.ts` — the single source-of-truth types (`Alliance`, `Player`,
  `PlayerWriteInput`, `AllianceClaim`, `CurrentUser`), mirroring Section 12's schema field-for-field.
- `src/firebase/firestore.ts` — converters (Firestore `Timestamp` → plain epoch millis, so the
  rest of the app never touches Firestore-specific types), realtime listeners
  (`subscribeToAlliance`, `subscribeToPlayers`), one-shot reads (`getAllianceOnce`,
  `getMyPlayerDoc`), and the single scoped write path (`writePlayerStatus`) — which can only ever
  target the signed-in caller's own document (ADR-008), with client-side validation mirroring (but
  never substituting for) `firestore.rules`.
- `src/contexts/AllianceContext.tsx` — realtime subscription to the current alliance's config
  document, scoped by the signed-in user's claim.
- `src/hooks/usePlayers.ts`, `useMyPlayer.ts`, `useOfflineStatus.ts` — realtime roster, own-profile
  read+save, and browser connectivity tracking respectively.

### Security & database structure
- `firestore.rules` — implements Section 13's seven rules directly: no claim → no access; reads
  scoped to your own alliance; writes scoped to your own uid within your own alliance;
  `lastUpdated`/`createdAt` server-time-only; field-level validation (status enum, note length,
  array caps); alliance config entirely read-only from clients; no delete path.
- `firestore.indexes.json` — empty for this phase. The only current server-side query
  (`joinAlliance`'s `alliances` lookup by `joinCodeHash`) is a single-field equality query, which
  Firestore serves without a composite index. Section 5's sort/filter matrix will need composite
  indexes once the real Status Board issues compound queries — added in that phase, not this one.
- `firebase.json` (repo root) — wires `firestore.rules`/`firestore.indexes.json` and the
  `functions/` deploy target together, plus emulator ports for local dev. See
  `DATABASE_SETUP.md` Section 6 for why this lives at the repo root rather than nested inside
  `functions/` as Section 10's folder tree literally shows.

### Documentation
- `DATABASE_SETUP.md` — new. Firebase project creation, first-alliance-document creation (by
  hand, since there's intentionally no admin UI yet), local env setup, emulator usage, and
  deployment steps.
- This file, updated.

---

## Known limitations (expected at this stage — not bugs)

- **No outbound npm registry access during the expiration phase either.** Same `403 Forbidden`
  from `npm install` as the sorting phase before it. Verification used the same isolated-stub
  `tsc` method plus a standalone Node script exercising `expiration.ts`'s logic directly — see
  "Verification performed this pass (Automatic Expiration)" above. Run `npm install && npm run
  build && npm run typecheck && npx eslint .` yourself before merging or deploying.
- **The Firestore write-back only happens when the expiring player's own device is online at (or
  after) the expiration moment.** This is a documented, deliberate consequence of
  `firestore.rules` rule 3 (no client can write another player's document), not an oversight — see
  "Notable decisions" above. Every viewer's on-screen display is still correct in realtime
  regardless, since it's derived (`applyEffectiveStatus`), not read from the possibly-stale stored
  field.
- **No outbound npm registry access during the sorting phase.** Unlike the immediately preceding
  filtering phase (which had working registry access and ran real `tsc`/`vite build`/`eslint`
  against installed packages), this phase's sandbox returned `403 Forbidden` from `npm install`.
  Verification fell back to the same isolated-stub `tsc` method, plus a standalone script, that
  every phase before filtering used and documented — see `CHANGELOG_CURRENT.md`'s verification
  section. Run `npm install && npm run build && npm run typecheck && npx eslint .` yourself before
  merging or deploying.
- **`tsc -b --noEmit` (the `npm run typecheck` script) fails on a pre-existing config issue**,
  unrelated to and predating this filtering phase: `TS6310: Referenced project
  '.../tsconfig.node.json' may not disable emit`. Reproduced on the pristine, unmodified project.
  `npx tsc -p tsconfig.json --noEmit` and `vite build` both succeed, so the application itself
  type-checks and builds correctly — only the composite-build-mode CLI invocation is affected.
  Since `.github/workflows/deploy.yml` runs `npm run typecheck` as a required step, this will block
  CI until `tsconfig.node.json` is fixed (likely needs `"noEmit": true` added, or the reference
  restructured) — flagged here for a future pass, not fixed in this filtering-only phase.
- **No offline banner.** `useOfflineStatus` exists and works, but neither this phase nor the two
  before it included the offline UI — it's a distinct, separate piece of Section 8 left for a
  later pass.
- **Routing is still not auth-gated.** `/board` and `/profile` render for anyone, but without an
  `allianceId` claim both now show an explicit "No alliance joined yet" empty state rather than
  crashing or showing a blank form — a reasonable interim behavior, not a substitute for real route
  gating (`AuthGate`/`AllianceJoinScreen` still aren't mounted anywhere).
- **No admin UI for creating alliances or rotating join codes.** Unchanged from previous phases —
  handled by hand in the Firestore console per `DATABASE_SETUP.md` Section 2.
- **No emulator-connection wiring.** Unchanged from previous phases.
- **`npm install` / `npm run build` have still not been executed against this repo** — no
  outbound network access in this sandbox (`npm install` returns a 403 from the registry), true for
  every phase so far. For this phase, every new/edited file was checked with `tsc` against the
  whole `src` tree using stubbed `react`/`firebase`/`react-router-dom` ambient types (same method
  the previous three phases used) — none of the files touched this phase produced an error under
  that check. It still can't verify against the packages' real type declarations. Run
  `npm install && npm run build` yourself before merging or deploying.
- **Discord bot API (Section 15 / ADR-009) not started.** Unchanged from previous phases.

---

## Next development phase

Per `PROJECT_SPECIFICATION.md`, **Status Board interactivity** (Section 5 — sort, filter, search)
and automatic expiration are now entirely done. The next phase is:

1. Decide and wire routing-level auth gating (`AuthGate` around `/board` and `/profile`, most
   likely not `/` or `/about`).
2. Build the offline banner using `useOfflineStatus` + Firestore's own cache-then-sync behavior
   (Section 8) — both already available.
3. Add composite Firestore indexes to `firestore.indexes.json` only if a future phase moves any
   part of search/filter/sort into an actual Firestore query — search, filtering, and sorting are
   all pure client-side array operations today, so none needed one.
4. Fix the pre-existing `tsc -b --noEmit` / `npm run typecheck` project-reference issue flagged
   above so CI's typecheck step (`.github/workflows/deploy.yml`) stops failing — unrelated to any
   interactivity or expiration work, but currently the only thing standing between a green CI run
   and a real deploy.

Self-editing (`EditMyStatusModal`), free-text search, Status Board filtering, Status Board
sorting, and automatic expiration are now all done — see "Completed in this phase" and "Completed
in the previous phase" above.

Do not begin the Discord Bot API (Section 15) until the interactivity phase above is reviewed and
confirmed working against a real Firebase project.

---

## Confirmation

**Public Release — Production Readiness Review (current):** every file in the repository was
read and checked against `PROJECT_SPECIFICATION.md`, `ARCHITECTURE_DECISIONS.md`,
`firestore.rules`, and this document's own prior-phase claims. Two release blockers were found and
fixed: `npm run typecheck` was still broken in `package.json` despite a previous phase's notes
claiming otherwise (verified directly with the sandbox's `tsc`; would have failed CI on every
push), and the GitHub Actions build never supplied `VITE_FIREBASE_*` values (the deployed app would
build and serve, but with no working Firebase connection for any real visitor). Three
documentation/UX-accuracy issues were also fixed: a stale "frontend foundation only" README, a
stale "Foundation build" badge on the public home page, and a stale code comment in
`vite.config.ts`. Every other area reviewed — Firestore data model and security rules, the
`joinAlliance` Cloud Function, authentication flow, Status Board logic (search/filter/sort/
expiration), PWA/GitHub Pages configuration, accessibility patterns, and mobile touch targets —
was confirmed correct and unchanged; see `PRODUCTION_REVIEW.md` for the full breakdown, scoring,
and remaining recommendations, and `TEST_REPORT.md` for scenario-level testing notes. As with every
prior phase, this sandbox has no outbound npm registry access, so this review's TypeScript checks
used the globally-available `tsc` directly against the source tree (not a real `npm install`) —
**run `npm install && npm run typecheck && npm run build && npx eslint .` yourself**, and confirm
the six `VITE_FIREBASE_*` repository secrets are set, before the first real deploy.

**Automatic Expiration (previous phase):** when a player's `Available Until` passes, their status now
displays as Unavailable to every viewer, live, with no manual refresh — `applyEffectiveStatus()`
(`src/utils/expiration.ts`) overrides an expired `available`/`maybe` player's status ahead of the
existing search/filter/sort/summary pipeline, none of which needed a single line changed since
they already read `player.status` generically. `useExpirationClock()`
(`src/hooks/useExpirationClock.ts`) drives the "live" part with one precisely-scheduled
`setTimeout` per upcoming expiration (chained, not polled) plus a `visibilitychange` resync, so
the board is never stale even in a backgrounded tab. Every comparison is epoch-millis vs.
epoch-millis (`availableUntil <= now`), so the check is timezone-safe by construction — no `Date`
string parsing anywhere in the expiration path. Because `firestore.rules` only ever lets a player
write their own document, `useAutoExpireOwnStatus()` (`src/hooks/useAutoExpireOwnStatus.ts`) is
the one place the *stored* Firestore `status` field is actually corrected — the signed-in caller's
own record, through the existing `writePlayerStatus()` path, once it expires — while every other
player's expired record continues to display correctly for everyone regardless, since the display
is derived rather than read from the possibly-not-yet-corrected stored value. Verified: 16
standalone assertions against the expiration logic (boundary case, no-`availableUntil` case,
already-`unavailable` case, no-mutation, reference-reuse, soonest-upcoming selection); the realtime
chain traced by hand from `setTimeout` fire through to `effectivePlayers`' `useMemo` recompute;
every comparison in `expiration.ts` confirmed to use only epoch-millis numbers; the write-back
payload checked against `firestore.rules`' `isValidPlayerWrite` and its own-uid-only constraint;
and a full scope diff against the pristine project (three new files, three edited — one of the
three, `time.ts`, comment-only). No sorting, filtering, search, or editing behavior was added or
changed anywhere. The application remains GitHub Pages compatible — no new dependencies, no
Cloud Function, no `firestore.rules` change, and no new Firestore field or index; expiration is
fully derived from the `status` + `availableUntil` fields the schema (Section 12.2) already had.
This phase's sandbox had no outbound npm registry access, so verification used the isolated-stub
`tsc` method plus the standalone script instead of a real `npm install`/`vite build`/`eslint` run —
see "Known limitations" and `CHANGELOG_CURRENT.md` for detail. The pre-existing `tsc -b --noEmit`
/ `npm run typecheck` project-reference issue (see above) remains unfixed and unrelated to this
phase.

**Status Board Sorting (previous phase):** Available first, Recently updated, IGN, Activity, Scouting,
and Capability category sorts (Section 5.1) now sit above the roster grid on `StatusBoard.tsx`
(`SortBar`, `src/components/board/SortBar.tsx`), directly below the existing search box and
filter panel. Exactly one sort is active at a time (a roster has one order, unlike the combinable
filter groups), with a single reverse-direction toggle applying uniformly to whichever sort is
selected, applied via a pure `sortPlayers` function (`src/utils/sort.ts`) composed last, over the
already-searched-and-filtered roster `filterPlayersByIgn` + `filterPlayers` produce — neither of
which this phase touched. Sorting updates the grid instantly (no debounce needed — these are
discrete selections, not free text) and, like search and filters, sort state is ordinary
page-level React state that survives every live Firestore roster update untouched. Every
comparator is written to be stable (returns `0` on genuine ties) and relies on
`Array.prototype.sort`'s spec-guaranteed stability to preserve incoming order across those ties,
satisfying the "stable sorting" requirement without manual index-tracking. Verified: all six sort
keys plus the reverse toggle, the Capability category no-selection fallback, tie-stability, and
input-array immutability (standalone script against `sortPlayers()`); realtime behavior (state
independent of the `usePlayers`/`filteredPlayers` chain, identical mechanism to search and
filters); mobile/desktop layout (same `flex-wrap` chip pattern already used and screenshot-verified
for `FilterBar`); and a full scope diff against the pristine project (only `sort.ts` and
`SortBar.tsx` added; `StatusBoard.tsx` and the board `index.ts` edited; `filters.ts`,
`FilterBar.tsx`, `search.ts`, and `SearchBar.tsx` untouched). No filtering, search, editing, or
expiration functionality was added. The application remains GitHub Pages compatible — no new
dependencies were added, no server-side code was introduced, and no Firestore query/index changes
were needed. This phase's sandbox had no outbound npm registry access (`npm install` returns `403
Forbidden`), so verification used the isolated-stub `tsc` method plus a standalone script instead
of a real `npm install`/`vite build`/`eslint` run — see "Known limitations" and
`CHANGELOG_CURRENT.md` for detail. The pre-existing `tsc -b --noEmit` / `npm run typecheck`
project-reference issue (see below) remains unfixed and unrelated to this phase.

**Status Board Filtering (previous phase):** Status (Available/Maybe/Unavailable), Scouting, Can Lead,
Looking For, and Boss Category filters (Section 5.2) now sit above the roster grid on
`StatusBoard.tsx` (`FilterBar`, `src/components/board/FilterBar.tsx`), directly below the existing
search box. Every filter is combinable with every other filter at once — AND across groups (e.g.
Status: Available AND Scouting), OR within a group (e.g. Looking For: Hydra OR Cerberus) — applied
via a pure `filterPlayers` function (`src/utils/filters.ts`) over the already-live roster
`usePlayers` provides, composed with (not replacing) the existing `filterPlayersByIgn` search.
Filtering updates the grid instantly on every tap (no debounce needed — these are discrete
selections, not free text) and, like search, filter state is ordinary page-level React state that
survives every live Firestore roster update untouched. Verified: every filter individually and in
combination (standalone script against `filterPlayers()`), realtime behavior (state independent of
the `usePlayers` subscription, identical mechanism to search), mobile/desktop layout (same
`flex-wrap` chip pattern already used and screenshot-verified in `EditMyStatusFields.tsx`, same
`Button` component enforcing the 44px touch-target floor), a real production build (`vite build`
succeeded; new filter strings confirmed present in the built bundle), and a full scope diff against
the pristine project (only `filters.ts` and `FilterBar.tsx` added; `StatusBoard.tsx` and the board
`index.ts` edited; `search.ts` and `SearchBar.tsx` untouched). No sorting, editing, or expiration
functionality was added. The application remains GitHub Pages compatible — no new dependencies
were added, no server-side code was introduced, and no Firestore query/index changes were needed.
One pre-existing, unrelated issue was found (not fixed, out of scope for this phase): `npm run
typecheck` fails on a `tsconfig.node.json` project-reference configuration problem that predates
this phase — see "Known limitations" and "Next development phase" above.

**Player Search (previous phase):** a free-text, case-insensitive search box sits above the roster
grid on `StatusBoard.tsx` (`SearchBar`, `src/components/board/SearchBar.tsx`), filtering live as
the user types via a pure `filterPlayersByIgn` function (`src/utils/search.ts`) over the
already-live roster `usePlayers` provides. The visible input updates every keystroke instantly;
the underlying filter itself is debounced 200ms (`useDebouncedValue`,
`src/hooks/useDebouncedValue.ts`) so it doesn't re-run on every character mid-word. A clear button
appears once there's a query and resets it in one click. Search state (`searchQuery`) is ordinary
page-level React state, independent of the roster subscription, so it survives every live
Firestore update to the roster untouched, and the filtered result recomputes automatically against
whatever the roster currently is. No sorting, filtering (by status/tag/category), editing,
expiration, PWA, notification, or Discord functionality was added — see "Completed in this phase"
and `CHANGELOG_CURRENT.md` for the full file list and decisions. The application remains GitHub
Pages compatible — no new dependencies were added (search uses only React's built-in hooks), no
server-side code was introduced, and no Firestore query/index changes were needed since search
filters the roster already in memory.

**Self-Editing (`EditMyStatusModal`) (previous phase):** a signed-in player can edit Status,
Available Until, Current Activity/Notes, Looking For, Can Lead, Scouting, and Capabilities — and
only their own record. The affordance to edit only ever appears on the signed-in caller's own
`PlayerCard` (`isOwnPlayer` check in `StatusBoard.tsx`) or the dedicated `Profile.tsx` page; the
write path (`useMyPlayer().save()` → `writePlayerStatus`) has always been structurally incapable
of targeting another uid (ADR-008), and `firestore.rules` — read in full, left unchanged —
independently enforces the same restriction server-side. Real-time save, client-side validation,
friendly error messages, loading indicators, and a save confirmation message are all implemented
in `EditMyStatusFields.tsx`; the form is fully responsive and reuses the existing `ui/` component
set exclusively, so it inherits `DESIGN_SYSTEM.md`'s 44px touch-target rule and existing tokens
with no new colors, spacing, or typography introduced. See "Completed in this phase" and
`CHANGELOG_CURRENT.md` for the full file list, the "In-game name" field decision, and the
verification performed. Authentication (`AuthContext`, `firebase/auth.ts`, the join flow) was not
modified and continues to work as before. The application remains GitHub Pages compatible — no new
dependencies were added, no server-side code was introduced, and `firebase.json` / the Cloud
Functions deploy target are untouched.

**Player Cards — Production Quality Pass (previous phase):** the requested card fields — IGN, Status
badge, Activity, Available Until, Last Updated, Looking For, Can Lead, Scouting, Capability
summary, Notes — are all present on `PlayerCard`, touch-friendly and responsive (inherited from
`Card`/`Badge` and the existing `grid-cols-1` → `sm:2` → `lg:3` layout), built from the existing
reusable `board/` and `ui/` components, and styled entirely from `DESIGN_SYSTEM.md` tokens — no
new colors, spacing, or typography were introduced. That was a display-only pass: no editing
affordance was added or changed there (self-editing was added in this phase, see above). See that
phase's section above for the one field-naming decision ("Activity / Notes") and the accessibility
and verification work done.

**Alliance Status Board — Foundation (earliest phase):** that phase's scope — the Status Board
page, board layout, summary section, live player grid, responsive layout, and loading/empty/error
states — is complete and matches `PROJECT_SPECIFICATION.md` and `DESIGN_SYSTEM.md`, with no scope
additions beyond mounting the already-built `AllianceProvider` (necessary wiring, not new
architecture) and one documented field interpretation ("Current Activity" → the existing `note`
field, since relabelled — see above). Sorting, filtering, search, offline UI, PWA work, and Discord
bot integration were explicitly out of scope for that phase and were not built (self-editing was
explicitly out of scope there too, and has since been built — see above).

