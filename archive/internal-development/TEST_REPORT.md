# Test Report — Evony Rally Coordinator

**Method:** This sandbox has no outbound network access (`npm install` returns `403 Forbidden`)
and no browser, so nothing here was exercised end-to-end against a real build in a real browser.
Every result below is either (a) a direct `tsc` check against the source tree using the sandbox's
globally-installed TypeScript compiler (no `node_modules`, so module-resolution errors are
expected noise — see `DEVELOPMENT_STATUS.md`), (b) traced by hand: reading the exact code path
involved end-to-end and confirming its logic against `PROJECT_SPECIFICATION.md`, or (c) a
standalone Node.js script exercising a pure function in isolation. Each result below states which
method was used. **This report is not a substitute for running the checklist in `README.md`
yourself in a real browser against a real Firebase project before deploying.**

---

## TypeScript / build tooling

| Check | Method | Result |
|---|---|---|
| `tsc -b --noEmit` (the previous `typecheck` script) | Direct `tsc` run | **Fails**: `TS6310: Referenced project '.../tsconfig.node.json' may not disable emit`. Confirmed this is a structural incompatibility (composite project + `--noEmit`), not a code bug. |
| `tsc -b` (the fixed `typecheck` script) | Direct `tsc` run | Completes; remaining output is only "cannot find module 'react'/'firebase'/etc." — expected, since `node_modules` isn't installed in this sandbox, not a real type error. |
| Full `npm install && npm run build` | Not possible — no registry access | **Not verified in this pass.** Run yourself before deploying. |

## Pure-function logic (`src/utils/`)

Verified by hand-tracing each function's logic against its own doc comments and
`PROJECT_SPECIFICATION.md`; the reasoning for each is written directly into the source files
themselves (see `expiration.ts`, `filters.ts`, `sort.ts`, `search.ts`, `time.ts`).

| Area | What was checked | Result |
|---|---|---|
| `isExpired` / `getEffectiveStatus` / `applyEffectiveStatus` (`expiration.ts`) | Boundary case (`availableUntil === now`), no-`availableUntil` case, already-`unavailable` case never treated as expired, pure/no-mutation | Correct. `<=` at the boundary means "at or past" the deadline is expired, matching the doc comment. |
| `nextExpirationTime` | Only considers future (`> now`) timestamps on non-`unavailable` players; returns `null` when nothing is upcoming | Correct — feeds `useExpirationClock`'s single-`setTimeout` scheduling. |
| `filterPlayers` / `matchesAnySelected` (`filters.ts`) | AND-across-groups, OR-within-group semantics; empty selection = no restriction | Correct, matches Section 5.2. |
| `filterPlayersByIgn` (`search.ts`) | Case-insensitive substring match; empty/whitespace query returns unfiltered | Correct. |
| `sortPlayers` and all six comparators (`sort.ts`) | Stability (ties return `0`, relies on `Array.prototype.sort`'s ES2019 stability guarantee), "absent value sorts last" convention for `activity`/`capabilityCategory`, `capabilityCategory` no-selection fallback | Correct; every comparator returns a plain number and never mutates input (`.slice()` before sorting). |
| `isStale` / `formatRelativeTime` / `formatAvailableUntil` / `toDatetimeLocalValue` / `fromDatetimeLocalValue` (`time.ts`) | Millisecond-based comparisons throughout (no string-date parsing in the hot path), datetime-local round-trip | Correct. |

## Authentication

Traced by hand through `firebase/auth.ts`, `contexts/AuthContext.tsx`, `components/auth/AuthGate.tsx`,
`components/auth/AllianceJoinScreen.tsx`, and `functions/src/joinAlliance.ts`.

- **Anonymous sign-in on first load:** `ensureAnonymousSession()` is called once in
  `AuthProvider`'s effect, guarded by `firebaseReady`; skips re-signing-in if `auth.currentUser`
  already exists (returning visitor). Traced correctly.
- **Join-code submission:** `AllianceJoinScreen` collects IGN + code, calls
  `submitJoinCode` → `joinAlliance` (the Cloud Function client wrapper) → on success, force-
  refreshes the ID token and re-derives `CurrentUser` so the UI sees the new `allianceId`
  immediately without a page reload. Traced correctly against ADR-004's described flow.
- **Server-side verification:** `joinAlliance.ts` hashes the submitted code, looks up the alliance
  by `joinCodeHash`, mints `{ allianceId, role: 'member' }` as custom claims via the Admin SDK
  (explicitly not spreading `auth.token`, which would incorrectly try to set reserved JWT fields —
  correct). Generic error on no match. Traced correctly.
- **Not independently verified:** the actual Firebase Console / emulator round-trip (network
  required). Run `firebase emulators:start` and manually join with a test code, per
  `DATABASE_SETUP.md` Section 4.

## Status updates / realtime synchronization

Traced through `firebase/firestore.ts`, `hooks/useMyPlayer.ts`, `hooks/usePlayers.ts`,
`components/board/EditMyStatusFields.tsx`.

- `writePlayerStatus` always sets `lastUpdated: serverTimestamp()` (and `createdAt` only on first
  write), never a client-supplied timestamp — matches `firestore.rules`' `data.lastUpdated ==
  request.time` requirement exactly.
- `subscribeToPlayers` is a single `onSnapshot` over the whole alliance's `players` subcollection;
  every connected client receives every change automatically — this is the mechanism behind the
  "five-second comprehension" requirement, and it was traced end-to-end from a successful
  `writePlayerStatus` call through to `StatusBoard.tsx`'s `effectivePlayers` recompute.
- **Not independently verified:** two real browser tabs actually observing each other's writes in
  realtime (network + Firebase project required).

## Capability editing / filtering / searching / sorting

All traced through `StatusBoard.tsx`'s composition (`search → filters → sort`, each a `useMemo`
layered on the previous) and the individual `utils/` modules above. The order matches
`DEVELOPMENT_STATUS.md`'s documented "sort runs last, over the already-searched-and-filtered
roster" design, and each layer is independently pure and composable, confirmed by reading every
call site.

## Expiration

Traced end-to-end: `useExpirationClock` schedules one `setTimeout` for the soonest upcoming
`availableUntil` in the current roster, wakes, updates `now`, `applyEffectiveStatus` recomputes
displayed status for every viewer immediately (derived, not dependent on any write succeeding),
and — separately — `useAutoExpireOwnStatus` corrects the signed-in caller's *own* stored Firestore
record via the same rules-compliant `writePlayerStatus` path once *their own* record has expired
(the only record any client is allowed to write, per `firestore.rules`). A `visibilitychange`
listener resyncs `now` immediately when a backgrounded tab regains focus, so a throttled
`setTimeout` never leaves a refocused tab showing stale "still available" data. Logic confirmed
correct; a real two-tab clock-based observation was not performed (no browser in this sandbox).

## Offline mode

Traced through `hooks/useOfflineStatus.ts`, `components/layout/OfflineBanner.tsx`, and
`firebase/config.ts`'s `persistentLocalCache`/`persistentMultipleTabManager` setup.
`useOfflineStatus` listens to the browser's `online`/`offline` events; `OfflineBanner` renders only
while offline, showing "as of [last known online time]" via the existing `formatRelativeTime`.
Underneath, Firestore's own IndexedDB persistence continues serving the last-synced snapshot — the
banner is presentational only and doesn't touch that mechanism. Logic confirmed correct; actually
toggling airplane mode/devtools offline throttling against a live deployment was not performed
(no browser in this sandbox) — this is explicitly called out as worth checking in `README.md`'s
verification checklist.

## PWA installation

`vite.config.ts`'s `VitePWA` config (manifest fields, icons, `registerType: 'autoUpdate'`,
app-shell `globPatterns`) was reviewed for internal consistency (icon sizes match the manifest,
`start_url`/`scope` match the GitHub Pages base path) — correct. Actually installing the built app
on a device was not performed (requires a real build + browser).

## GitHub Pages deployment

`.github/workflows/deploy.yml` was read end-to-end: checkout → Node setup → `npm ci` →
`npm run typecheck` → `npm run build` → upload/deploy via `actions/deploy-pages`. Both blockers in
this workflow (broken typecheck script, missing Firebase secrets) are described in
`PRODUCTION_REVIEW.md` and are now fixed. **Not verified:** an actual push-triggered run of this
workflow (requires a real GitHub repository and configured secrets).

## Responsive layout / accessibility

Reviewed statically across every interactive component: `Button`, `Input`, `Modal`'s close button,
`SearchBar`'s clear button, and every filter/sort toggle chip all use a `min-h-[44px]` (and, for
icon-only buttons, `h-11 w-11` = 44px) floor. Status is always rendered as color + text label
together (`StatusBadge`), never color alone. `PageContainer` provides a skip-to-content landmark
target; `Header` provides the matching skip link. Card headings use semantic `h3`/`h2` for
screen-reader heading navigation. **Not verified:** an actual screen reader or a real mobile
device/viewport — no browser in this sandbox, exactly as `README.md`'s own verification checklist
already flags.

---

## Summary

Nothing in this pass found a *logic* bug in the reviewed code — every issue found and fixed in
this phase (see `PRODUCTION_REVIEW.md`) was a build/CI/documentation problem, not an application
bug. The gap between what this report could verify (code tracing, pure-function logic, static
config review) and what it could not (a real networked build, a real browser, a real Firebase
project) is the same gap called out in every prior phase's `DEVELOPMENT_STATUS.md` entry — closing
it requires running `README.md`'s verification checklist yourself, once, before the first real
deploy.
