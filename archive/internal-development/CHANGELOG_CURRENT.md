# Changelog — Current Phase: Public Release / Production Readiness Review

Scope: a review-only pass across the entire repository to determine whether it's ready for public
release to the alliance community — architecture, security, Firestore, GitHub Pages/PWA,
performance, accessibility, documentation accuracy, and every doc file listed in the review task.
Per the task's explicit instruction, this is **not** a redesign or feature-addition pass: only
real, verified problems were fixed, and everything else is written up under "Future Improvements"
in `PRODUCTION_REVIEW.md` instead of being implemented.

Every source file, config file, and documentation file in the repository was read in full before
any change was made. Two release blockers and three documentation/UX-accuracy issues were found
and fixed; everything else reviewed (Firestore data model, `firestore.rules`, the `joinAlliance`
Cloud Function, auth flow, Status Board search/filter/sort/expiration logic, PWA manifest/caching,
accessibility patterns, and mobile touch targets) was confirmed correct as-is.

## Files modified

| File | Change |
|---|---|
| `package.json` | `"typecheck": "tsc -b --noEmit"` → `"typecheck": "tsc -b"`. Reproduced the `TS6310: Referenced project '.../tsconfig.node.json' may not disable emit` failure directly with the sandbox's globally-installed `tsc`; this is the same fix a previous phase's `DEVELOPMENT_STATUS.md` entry describes making, but the script in `package.json` had not actually changed — a documentation/implementation mismatch. This was blocking CI's "Type check" step on every push. |
| `.github/workflows/deploy.yml` | Added an `env:` block to the "Build" step, mapping each `VITE_FIREBASE_*` variable to a same-named GitHub Actions repository secret. Without this, `vite build` inlines every `VITE_FIREBASE_*` reference as `undefined`, so the deployed app has no Firebase config at all — it builds and deploys without error, but every visitor sees "not configured" screens forever, with nothing in the build or deploy logs to explain why. |
| `README.md` | Rewrote the top summary (was: "frontend foundation only. No database, authentication, or status-board logic is implemented yet" — none of that has been true for several phases), the environment-variables section, the deployment steps (now documents the required repository secrets from the fix above), and the closing "Project structure" note (was: listing `firebase/auth.ts`, `contexts/AuthContext.tsx`, etc. as not-yet-existing files that have existed for phases). |
| `src/pages/Home.tsx` | Removed the "Foundation build" `Badge` shown at the top of the public landing page — accurate during early development, misleading on a feature-complete public release. Removed the now-unused `Badge` import. No other change to the page. |
| `vite.config.ts` | Corrected a stale Workbox comment ("no data caching strategy yet, since Firestore integration is not implemented in this phase") to describe the actual, unchanged behavior: app-shell caching only, deliberately with no second cache layer duplicating Firestore's own offline persistence. Comment-only change. |
| `DEVELOPMENT_STATUS.md` | Added this phase's entry (summary block, "Completed in this phase" section, and a "Confirmation" paragraph), following the file's existing running-log convention; demoted the previous top entry to "Phase before this." |

No Status Board logic (`filters.ts`, `sort.ts`, `search.ts`, `expiration.ts`, either expiration
hook), `firestore.rules`, `functions/src/*`, or any component's rendered behavior (beyond removing
the one stale badge) was touched.

## Notable decisions

- **`package.json`'s typecheck fix was re-verified from scratch, not assumed correct from the
  prior phase's notes.** The discrepancy between what `DEVELOPMENT_STATUS.md` claimed and what
  `package.json` actually contained is exactly the kind of drift a "trust the docs" review would
  have missed — every finding in this phase was confirmed against the actual file content, not
  against what an earlier phase's changelog said it did.
- **GitHub Actions secrets over committing real Firebase values.** `PROJECT_SPECIFICATION.md`
  Section 14 correctly notes Firebase's client-SDK config is public-by-design and safe to commit —
  but committing real values still means anyone with read access to the repo's history can extract
  them even after rotation, and secrets cost nothing extra to use correctly from the start. The fix
  documents this reasoning inline in the workflow file itself.
- **`Settings.tsx` intentionally left unmodified.** It's an explicit, already-honest placeholder
  ("Nothing configurable yet... this page is a placeholder only") — consistent with
  `DATABASE_SETUP.md` Section 2's deliberate "no admin UI yet, alliance setup is a one-off manual
  console step" design decision. This isn't a bug to fix or a gap to fill in a review-only pass.
- **`PROJECT_SPECIFICATION.md` and `ARCHITECTURE_DECISIONS.md` were read in full but not edited.**
  They document intent and rationale as of when they were written and are treated as the
  authoritative "why" per this task's own instructions ("assume the current implementation is
  intentional"); nothing in them was found to be factually wrong about the *implementation* itself
  (as opposed to `README.md` and `DEVELOPMENT_STATUS.md`, which describe current *status* and had
  drifted).

## Known limitations

- This sandbox has no outbound npm registry access (`npm install` returns `403 Forbidden`),
  matching every prior phase's documented constraint. Unlike prior phases, this sandbox *does* have
  a globally-installed `tsc` (no `node_modules`), which was used to directly reproduce the
  `TS6310` typecheck failure and confirm the fix — the first phase able to do this rather than only
  infer it. `vite build`, `npm run lint`, and an actual GitHub Pages deploy with real secrets
  configured still need to be run in a networked environment before merging.
- Firestore Security Rules are document-level, not field-level: any alliance member with a valid
  `allianceId` claim can read the full `alliances/{allianceId}` document via the Firestore SDK or
  REST API directly, including `joinCodeHash` — the app's own UI never requests or displays that
  field (see `firebase/firestore.ts`'s `allianceConverter`), but that's a client-side omission, not
  a security boundary. This doesn't hand an existing member anything they don't already have (they
  already know the plaintext join code they used to join), so it isn't a fix-now blocker, but it
  does mean `PROJECT_SPECIFICATION.md` Section 13 rule 5's framing ("protects `joinCodeHash` from
  ever being ... read in plaintext") slightly overstates what Security Rules alone can guarantee.
  Documented under "Future Improvements" in `PRODUCTION_REVIEW.md` rather than fixed here, since a
  real fix (moving `joinCodeHash` to a Cloud-Function-only-readable location, e.g. a separate
  collection with no client read rule at all) is a data-model change, not a bug fix, and out of
  scope for a review-only pass.
- No automated test suite exists anywhere in the repository (no Jest/Vitest/Playwright, no `test`
  script in `package.json`). Every verification claim in this and prior phases' changelogs is
  manual code review, standalone throwaway scripts, or (where network access allowed) a real build
  — never a checked-in, repeatable test. Flagged as a "Future Improvement," not fixed here, since
  introducing a test framework is a scope addition, not a bug fix.
