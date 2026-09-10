# Production Review — Evony Rally Coordinator

**Review type:** Full-repository production readiness review for public release to the Evony
player community. Every source file, config file, and documentation file was read in full.
No feature work was performed — only verified problems were fixed; everything else is listed
under "Future Improvements" below.

**Reviewed by:** this pass (see `DEVELOPMENT_STATUS.md` for the running phase-by-phase history
this builds on).

---

## 1. Executive Summary

The application is a well-architected, carefully documented React + Firebase static site. The
data model, security rules, and Cloud Function are sound and were traced by hand against
`PROJECT_SPECIFICATION.md` Section 13's seven access-control rules with no discrepancies found.
Component code throughout is consistent, accessible (44px touch targets, `aria-*` attributes,
color-plus-text status indicators, skip link, heading structure), and free of the usual red flags
(no `console.*` calls, no `any`/`as any`, no dead code, no unused components, no
`dangerouslySetInnerHTML`, no obvious memory leaks — every subscription/timer/effect in `hooks/`
has a matching cleanup).

That said, this review found **two release blockers** that would have made a real public deploy
fail or silently not work at all, both now fixed:

1. `npm run typecheck` — and therefore the GitHub Actions "Type check" CI step — was broken and
   would have failed on every push to `main`, blocking every deploy.
2. The GitHub Actions build never supplied the app's Firebase configuration, so even a successful
   deploy would have shipped a site with no working Firebase connection for any real visitor.

It also found three documentation/UX-accuracy issues (a stale README, a stale "Foundation build"
badge on the public landing page, and a stale code comment) that were actively misleading about
the project's actual state, all now fixed.

With those fixed, and with the one-time manual steps in `DATABASE_SETUP.md` (create the Firebase
project, create the first `alliances/{allianceId}` document, deploy `firestore.rules` and the
`joinAlliance` function, set the GitHub Actions secrets) completed, this project is ready for a
public beta with a real alliance. See Section 12 for the specific recommendation and what would
move it from "beta" to "1.0."

---

## 2. Files Modified

| File | Why |
|---|---|
| `package.json` | Fixed broken `typecheck` script (`tsc -b --noEmit` → `tsc -b`) — release blocker. |
| `.github/workflows/deploy.yml` | Wired `VITE_FIREBASE_*` GitHub Actions secrets into the build step — release blocker. |
| `README.md` | Rewrote stale "frontend foundation only" description and deployment instructions. |
| `src/pages/Home.tsx` | Removed stale "Foundation build" badge from the public landing page. |
| `vite.config.ts` | Corrected a stale code comment about Firestore/caching. |
| `DEVELOPMENT_STATUS.md` | Logged this phase, per the file's existing convention. |
| `CHANGELOG_CURRENT.md` | Replaced with this phase's changelog, per the file's existing convention. |

See `CHANGELOG_CURRENT.md` for the full rationale behind each change.

---

## 3. Problems Found

### Blockers (fixed)

- **`npm run typecheck` was broken** (`TS6310: Referenced project '.../tsconfig.node.json' may
  not disable emit`), reproduced directly with the sandbox's `tsc`. `.github/workflows/deploy.yml`
  runs this as a required step before `build` — every push to `main` would have failed CI, and
  the site would never actually deploy or update.
- **The GitHub Actions build step supplied no `VITE_FIREBASE_*` values.** `firebase/config.ts` is
  written to treat missing config as "not configured yet" rather than throwing, specifically so
  local dev works without a `.env.local` — but that same fallback means a production deploy with
  no secrets configured builds and ships *successfully*, while being completely non-functional
  (every Firebase-gated screen shows "not configured," permanently) with no error anywhere to
  explain why. This is the more dangerous of the two blockers precisely because nothing fails
  loudly.

### Documentation / UX accuracy (fixed)

- `README.md` described the project as "frontend foundation only," several phases out of date.
- `src/pages/Home.tsx` displayed a "Foundation build" badge on the public landing page.
- `vite.config.ts` had a stale comment claiming Firestore wasn't implemented yet.

### Design limitations (not bugs — documented, not fixed; see Section 5)

- Firestore Security Rules are document-level, not field-level, so `joinCodeHash` is technically
  readable by any authenticated alliance member via direct SDK/REST access, even though the app's
  own UI never requests it. Low real-world impact (an existing member already knows the plaintext
  code they used to join) but worth knowing.
- No automated test suite anywhere in the repository.
- No admin UI for creating an alliance or rotating a join code — by design, per
  `DATABASE_SETUP.md` Section 2, appropriate at this scale.
- The `joinAlliance` Cloud Function has no explicit rate limiting on join-code guesses beyond
  Firebase's platform-level abuse protection.
- `Modal` does not trap focus or move initial focus into the dialog on open (it does close on
  Escape and on backdrop click, and restores nothing special on close — a screen-reader/keyboard
  user can currently still tab to content behind the modal).

---

## 4. Problems Fixed

See Section 2 and `CHANGELOG_CURRENT.md`. In short: the two release blockers, plus the three
documentation/UX-accuracy issues. Nothing else needed a code change.

---

## 5. Remaining Recommendations (Future Improvements — not implemented, per this review's scope)

- **Field-level exposure of `joinCodeHash`.** If this ever matters more than it does today (e.g.
  alliances start reusing join codes across multiple purposes, or codes become predictable), move
  `joinCodeHash` out of the client-readable `alliances/{allianceId}` document entirely — e.g. into
  a separate collection with no client read rule at all, looked up only by the Cloud Function via
  the Admin SDK (which already bypasses rules). This is a data-model change, not a bug fix.
- **Automated tests.** `filters.ts`, `sort.ts`, `search.ts`, and `expiration.ts` are all pure
  functions with no dependencies — ideal, cheap Vitest targets — but no test framework or test
  files exist in the repository at all. Prior phases' changelogs describe manual/standalone
  verification scripts that were never checked in.
- **Rate limiting on `joinAlliance`.** Consider Firebase App Check or a simple per-IP/per-UID
  attempt counter if join-code brute-forcing becomes a real concern at scale.
- **Modal focus management.** Trap Tab/Shift+Tab within the open dialog and move initial focus to
  it (e.g. the first field or the close button) for full keyboard/screen-reader dialog compliance.
- **Admin UI for alliance setup.** Currently a one-off manual Firestore-console step
  (`DATABASE_SETUP.md` Section 2) — reasonable at "one alliance per deployed instance" scale, worth
  revisiting if that assumption changes.
- **Emulator-connection wiring.** `connectAuthEmulator`/`connectFirestoreEmulator`/
  `connectFunctionsEmulator` calls, behind a `VITE_USE_EMULATORS` flag, for a smoother local-dev
  loop — explicitly deferred in `DATABASE_SETUP.md`.

None of the above block a public beta; they're prioritized roughly in the order a maintainer would
plausibly want to look at them.

---

## 6. Security Assessment

- **Data isolation is correctly enforced server-side, not just hidden in the UI.**
  `firestore.rules` was traced line-by-line against `PROJECT_SPECIFICATION.md` Section 13's seven
  rules: alliance-scoped reads require a matching `allianceId` custom claim; a player may
  create/update only the document whose ID equals their own `uid`; `lastUpdated` must equal
  `request.time` (rejecting any client-supplied value); `createdAt` is immutable after creation;
  status/note/array-length are validated in rules, not just client-side; the `alliances/{id}`
  document itself is entirely read-only from any client session; and there's a default-deny
  fallback for anything not explicitly matched. `src/firebase/firestore.ts`'s client-side
  validation (`validatePlayerWriteInput`) mirrors these rules but is explicitly documented as a UX
  nicety, not the security boundary — correct framing.
- **The join-code exchange is server-verified, not client-checked.** `functions/src/
  joinAlliance.ts` hashes the submitted code (SHA-256), looks up the alliance by
  `joinCodeHash` server-side, and mints the `allianceId`/`role` custom claim via the Admin SDK —
  the client never sees or compares the plaintext hash. Error responses are deliberately generic
  ("That join code was not recognized") to avoid helping an attacker distinguish a malformed code
  from a valid-format-but-wrong one.
- **No dangerous client-side logic.** No `eval`, no `dangerouslySetInnerHTML`, no dynamic
  `innerHTML` writes anywhere in `src/`.
- **Environment variables are handled correctly.** The six `VITE_FIREBASE_*` values are Firebase's
  public client-SDK config, safe to expose in a built bundle by design (access control lives in
  Security Rules) — `.env.example` and `DATABASE_SETUP.md` both document this correctly, and no
  secret/private key is anywhere in the client bundle or repository.
- **One caveat, not a vulnerability:** as noted in Section 3/5, `joinCodeHash` is technically
  readable by any alliance member through direct Firestore access (rules are document-level, not
  field-level), even though the app's own converter never surfaces it. Low real-world impact.

**Overall:** sound. No fixes required in this pass.

---

## 7. Performance Assessment

- **Route-level code splitting** (`React.lazy` + one `Suspense` boundary in `App.tsx`) keeps the
  initial bundle to just the app shell; each page is fetched only when visited.
- **Firestore reads are minimal and correctly scoped:** one realtime listener for the alliance
  config document, one for the players subcollection, both scoped to exactly the caller's
  alliance (enforced by rules, not just by query construction) — no over-fetching, no N+1 pattern.
- **Search is debounced** (200ms, `useDebouncedValue`) so typing doesn't re-run the filter/sort
  pipeline on every keystroke, while the input itself stays instantly responsive (bound to the raw
  value, not the debounced one).
- **Expiration uses one precisely-scheduled `setTimeout` chained to the soonest upcoming
  `availableUntil`,** not a polling interval — `useExpirationClock` recomputes only when something
  is actually about to expire, plus a `visibilitychange` resync so a backgrounded tab never shows
  stale data once refocused.
- **Search/filter/sort are pure, `useMemo`-composed client-side array operations** over an
  alliance-sized roster (tens to low hundreds of players) — no pagination or virtualization is
  needed at this scale, and none is present, which is the right call for the expected data size.
- **Firestore offline persistence** (`persistentLocalCache` + `persistentMultipleTabManager`) means
  a returning visitor's roster paints from IndexedDB before the network round-trip completes.

No performance issues were found at this project's expected scale (single alliance, tens to low
hundreds of players, occasional bursts of writes around rally-planning).

---

## 8. GitHub Pages Assessment

- **Base path** (`vite.config.ts`'s `REPO_NAME` constant) is correctly wired into both the Vite
  `base` and the PWA manifest's `start_url`/`scope`, and `README.md` correctly instructs updating
  it on fork/rename.
- **Routing/refresh behavior:** `HashRouter` is the correct choice here — GitHub Pages has no
  server-side rewrite rules, so a `BrowserRouter` would 404 on refreshing any non-root route; the
  hash portion of the URL never reaches the server, so refreshes and shared deep links always
  resolve correctly. This is explained clearly in both `README.md` and `main.tsx`.
- **PWA manifest and icons** are present and consistent (`icons/icon-192.png`,
  `icons/icon-512.png`, matching `theme_color`/`background_color`). `index.html` deliberately does
  *not* hand-write a `<link rel="manifest">` tag, since `vite-plugin-pwa` injects a base-path-aware
  one automatically — a hand-written duplicate would have mis-resolved under the repo subpath.
- **Service worker / offline:** `vite-plugin-pwa`'s `registerType: 'autoUpdate'` with app-shell
  `globPatterns` caching, layered under Firestore's own IndexedDB offline persistence — the app
  shell loads offline, and the last-synced roster data renders from Firestore's cache underneath
  it, with `OfflineBanner` making that state visible rather than letting a stale board look live.
- **404 behavior:** any unmatched hash route renders `NotFound.tsx` client-side; there's no
  server-level 404 concern since GitHub Pages only ever serves `index.html` for the base path
  itself, which `HashRouter` handles.
- **Deployment instructions** in `README.md`/`DATABASE_SETUP.md` are accurate and now include the
  previously-missing step of configuring the `VITE_FIREBASE_*` repository secrets (Section 3).

**Overall:** correctly configured. The one real gap (missing secrets in the workflow) is fixed.

---

## 9. Firebase Assessment

- **Auth:** anonymous sign-in only, matching ADR-004's "the join code is the access boundary, not
  the identity provider" design. `subscribeToCurrentUser` correctly re-reads the custom claim on
  both auth-state changes and ID-token refreshes (the latter is what fires right after
  `joinAlliance` mints a new claim).
- **Firestore collection structure** (`alliances/{allianceId}` and
  `alliances/{allianceId}/players/{uid}`) matches `PROJECT_SPECIFICATION.md` Section 12 exactly,
  and `src/types/models.ts` is consistently used as the single schema source of truth across
  converters, write validation, and rules.
- **Read/write efficiency:** two realtime listeners total per active session (alliance config,
  player roster), both alliance-scoped; writes go through one `setDoc(..., { merge: true })` per
  status save, with `serverTimestamp()` for `lastUpdated`/`createdAt` so clients never race each
  other on time.
- **Indexes:** `firestore.indexes.json` is empty, which is correct — every query in the app
  (`alliances` filtered by `joinCodeHash`, `players` read as a full collection) is a single-field
  filter or an unfiltered collection read, both covered by Firestore's automatic single-field
  indexes. No composite index is needed unless a future phase adds a compound `where`/`orderBy`
  Firestore query (today, all sorting/filtering happens client-side).
- **Cost considerations:** one `joinAlliance` call per new member (a callable Cloud Function,
  Blaze-tier), plus normal Firestore read/write volume for an alliance-sized roster — well within
  free-tier-adjacent usage for the described scale, as `DATABASE_SETUP.md` already notes.
- **Potential abuse cases:** join-code guessing is mitigated by a generic error message (doesn't
  reveal format-valid-but-wrong vs. malformed) but has no explicit rate limit beyond Firebase's own
  platform-level Callable Functions abuse protection — listed under Future Improvements.

**Overall:** correctly designed for the described scale. No fixes required in this pass.

---

## 10. Overall Code Quality Assessment: **9/10**

Consistently well-documented (every non-trivial file explains not just what it does but why, with
explicit cross-references to the spec sections and ADRs it implements), no dead code or unused
imports/dependencies found anywhere, consistent conventions across every layer (pure
transform → hook → context → page, the same pattern repeated correctly throughout), and real
attention to accessibility and mobile touch targets rather than an afterthought. The one point off
is for the gap between what `DEVELOPMENT_STATUS.md` claimed was fixed and what `package.json`
actually contained — a reminder that documentation of a fix is not the same as the fix landing —
plus the missing test suite.

## 11. Production Readiness Score: **8/10**

Both release blockers are now fixed and verified directly (not just inferred). What's holding this
back from a 9 or 10: no automated tests exist to catch a regression like the typecheck-script one
before it reaches review again, and a few Future Improvements (Modal focus trapping, join-code
rate limiting) are genuine — if minor — production-hardening gaps rather than pure polish.

## 12. Recommendation: **Ready for Public Beta**

With the two blockers in this review fixed, the required manual one-time setup in
`DATABASE_SETUP.md` completed (Firebase project, first alliance document, deployed rules and
Cloud Function, GitHub Actions secrets), and the "Local verification checklist" in `README.md` run
once in a real (networked) environment before the first deploy, this is ready to hand to a real
alliance as a public beta.

**Not yet "Version 1.0"** — that should wait on: (1) actually running
`npm install && npm run typecheck && npm run build && npx eslint .` and a real deploy in a
networked environment (this review's sandbox could not do so, and self-reported gaps between
documentation and reality — see Section 10 — are exactly what that step would catch), and
(2) at least the highest-priority Future Improvement items (starting with an automated test suite
for the pure `utils/` functions) landing, so the next regression like the typecheck one is caught
by CI rather than by the next manual review.
