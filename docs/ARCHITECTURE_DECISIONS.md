# Architecture Decision Records — Evony Rally Coordinator

Each record follows: **Context → Decision → Consequences → Alternatives Considered**.

---

## ADR-001: Static hosting only, no server the team operates

**Context:** The tool must deploy on GitHub Pages, alongside sibling tools in the Evony Tools ecosystem, with no Node/Express server or VPS.

**Decision:** All application logic that isn't pure client-side rendering is pushed into managed cloud services (Firebase Auth, Firestore, Cloud Functions) rather than a self-hosted backend.

**Consequences:** No server to patch, scale, or pay for hosting directly; deployment is "push to `main`, Actions builds and publishes." The tradeoff is a hard dependency on Firebase as a platform, and any logic that *must* run privileged (join-code verification, Discord bot integration) has to live in Cloud Functions rather than a custom server.

**Alternatives considered:** A small Express API on a free-tier VPS was rejected outright — explicitly excluded by the project constraints, and it would reintroduce exactly the operational burden (uptime, patching, hosting cost) the ecosystem is trying to avoid across all its tools.

---

## ADR-002: React + Vite + TypeScript as the frontend stack

**Context:** Needs to produce a static build deployable to GitHub Pages, with a component-heavy, data-driven UI (cards, filters, realtime updates).

**Decision:** React (component model fits the card/board UI naturally) + Vite (fast builds, first-class static output, trivial GitHub Pages `base` config) + TypeScript (schema in Section 12 of the spec has enough shape — status enums, nested maps — that type safety meaningfully reduces bugs around "which field is this again").

**Consequences:** Standard, well-understood stack; large ecosystem of Firebase-React integration examples; TypeScript adds a small amount of upfront ceremony in exchange for fewer runtime shape mismatches against Firestore documents.

**Alternatives considered:** Plain vanilla JS/HTML (simpler, no build step) was considered given the emphasis on "performance first, no unnecessary complexity," but rejected because the filter/sort/search interaction matrix (Section 5 of the spec) is genuinely stateful UI logic that benefits from a component framework's reactivity rather than hand-rolled DOM diffing. Vue was considered and would work equally well; React was chosen for ecosystem familiarity and Firebase SDK documentation density.

---

## ADR-003: Firestore over Realtime Database, Supabase, or a self-hosted DB

**Context:** The board's core value proposition is *live* status; data needs realtime push to clients, tenant isolation per alliance, and a Rules language expressive enough to enforce "write only your own record."

**Decision:** Cloud Firestore, Native mode, with alliances as the tenant root and players nested underneath.

**Consequences:** Realtime listeners give the "five-second comprehension" goal a technical backbone (state changes push instantly, no polling). Firestore Security Rules directly express the ownership constraints the philosophy document treats as non-negotiable ("never assigns/limits/calculates"). Cost stays effectively free at alliance scale (dozens of users, low write volume).

**Alternatives considered:**
- *Firebase Realtime Database:* rejected — weaker compound-query support, and the filter matrix (status AND looking-for AND boss-category) is more naturally expressed in Firestore's query model.
- *Supabase/Postgres:* a reasonable alternative with its own realtime channel and row-level security, but chosen against to avoid a second unnecessary cloud vendor when Firestore already satisfies every requirement, and to keep the Auth + DB + Functions surface within one platform for simpler operations.
- *Self-hosted database:* excluded by the no-VPS constraint.

---

## ADR-004: Anonymous Auth + join-code custom claim, instead of full OAuth

**Context:** Need a low-friction way to gate access to an alliance's board without imposing an OAuth login flow on a casual mobile-game audience, while still preventing outsiders/griefers from writing data.

**Decision:** Firebase Anonymous Authentication, upgraded via a Cloud Function that verifies a per-alliance join code and mints a custom claim (`allianceId`) onto the user's token.

**Consequences:** Onboarding is "enter your IGN + the code your alliance already shares in Discord," which matches how alliances already gate their Discord servers — no new credential to manage. The security boundary is the join code (hashed, server-verified), not the identity of the underlying anonymous account, so the model is intentionally "alliance membership," not "personal identity." This does mean anonymous accounts are somewhat disposable/spoofable if a code leaks — mitigated by treating the join code the same way alliances already treat their Discord invite (rotate it if it leaks).

**Alternatives considered:**
- *Google/Discord OAuth as the primary and only path:* rejected for v1 as unnecessary friction — a player's personal Google identity has no inherent relationship to alliance membership, and OAuth consent screens are a bigger ask for a "tap a button, declare your status" tool. Left open as an optional secondary provider later.
- *No auth, public writes:* rejected — leaves the board open to vandalism from anyone with the URL.
- *Username/password:* rejected — another password for a low-stakes internal tool is pure friction with no real benefit over the join-code model.

**Superseded by:** ADR-011. The Cloud Function this ADR depended on required the paid Blaze plan and was removed; the custom-claim mechanism it describes is no longer how the app determines alliance membership. This entry is left as the historical record of the original reasoning — the underlying UX decision (join code, not OAuth) still holds, only the verification mechanism changed.

---

## ADR-005: Offline handling via Firestore's built-in persistence, not a custom cache layer

**Context:** GitHub Pages users may have inconsistent mobile connectivity; the spec requires the app to behave sensibly offline rather than error out.

**Decision:** Enable Firestore's native offline persistence (IndexedDB-backed) and layer a minimal, explicit "offline / stale as of [time]" UI state on top, rather than building a bespoke caching/sync system.

**Consequences:** Near-zero implementation cost for correct offline read behavior and automatic write-queueing on reconnect; the only custom work is the UI messaging that makes staleness *visible* (a philosophical requirement — the board must never imply live data when it isn't).

**Alternatives considered:** A custom `localStorage`-based cache was considered and rejected — it would duplicate functionality Firestore already provides correctly, including conflict-free write replay on reconnect, for no benefit.

---

## ADR-006: Ship as an installable PWA from v1

**Context:** The board is meant to be checked frequently, briefly, on a phone — the exact usage pattern that benefits from home-screen installability and app-shell caching.

**Decision:** Add a web app manifest and a minimal service worker (app-shell caching) so the tool is installable and its shell loads instantly even on a poor connection.

**Consequences:** Small added build complexity (manifest + service worker registration); meaningfully better perceived performance and habitual usage on mobile, which is the primary device target per the design direction.

**Alternatives considered:** Skipping PWA entirely and relying on "add to home screen via browser bookmark" was considered, but rejected — a real manifest + service worker gives a materially better icon/splash/offline-shell experience for negligible extra cost, and aligns with "performance first."

---

## ADR-007: Alliance-scoped subcollections (`alliances/{id}/players/{uid}`) over a flat top-level collection

**Context:** Multiple alliances may eventually use this same deployed instance (or the pattern needs to at least not preclude it); data isolation between alliances must be structurally enforced, not just filtered at query time.

**Decision:** Nest players under their alliance document rather than using a flat `players` collection with an `allianceId` field.

**Consequences:** Every query and every Security Rule is naturally scoped by path rather than by a `where` clause that rules would otherwise have to independently re-validate on every read — reduces the surface area for a rules bug to leak cross-alliance data.

**Alternatives considered:** A flat collection with an `allianceId` field was considered (simpler for certain cross-alliance admin queries) but rejected because it pushes the isolation guarantee entirely onto rules logic and client-side query correctness, rather than getting it "for free" from document structure.

---

## ADR-008: Document ID = Firebase Auth UID for player records

**Context:** The philosophy document treats "a player can only ever edit their own record" as a hard, non-negotiable rule.

**Decision:** Use the player's own `uid` as the Firestore document ID within their alliance's `players` subcollection, rather than an autogenerated ID with an `ownerUid` field.

**Consequences:** Ownership becomes a one-line, unambiguous Security Rule (`request.auth.uid == resource.id`) instead of a field-comparison that could theoretically be bypassed by a malformed write attempt. It also guarantees one player can never accidentally (or maliciously) create a second record for themselves.

**Alternatives considered:** Autogenerated document IDs with a separate `ownerUid` field were considered (more conventional in some Firestore designs) but rejected here specifically because the "only ever your own record" constraint is central to the product's philosophy — encoding it structurally is more robust than encoding it as a rule that reads a field.

---

## ADR-009: Thin Cloud Functions HTTPS API as the Discord bot's integration point, not direct Admin SDK access to Firestore

**Context:** A future, separate Discord bot repository needs to read/write the same data, but must not require duplicating this project's validation logic or become tightly coupled to Firestore's internal document shape.

**Decision:** Expose a small set of documented HTTPS Cloud Functions (status read, status update, alliance join) as the bot's integration surface, backed by the same Firestore instance, rather than having the bot use the Admin SDK to manipulate documents directly.

**Consequences:** The bot repository depends on a stable, versioned API contract (`API_CONTRACT.md`) instead of on Firestore's schema directly — schema changes here don't necessarily break the bot, as long as the function's external contract is preserved. Validation logic (status enum, length caps) lives once, in the functions layer, rather than being reimplemented in the bot's language/framework of choice.

**Alternatives considered:** Direct Admin SDK access from the bot (simpler initially, no API layer to maintain) was considered and rejected as a long-term choice — it would mean any internal schema refactor here risks silently breaking a separate repository maintained on its own release schedule, which is exactly the kind of hidden coupling a multi-repo ecosystem should avoid.

---

## ADR-010: GitHub Actions `deploy-pages`, not a `gh-pages` branch push

**Context:** Need a repeatable, static deployment pipeline for a Vite build to GitHub Pages.

**Decision:** Use the modern `actions/deploy-pages` GitHub Actions flow (Pages source = "GitHub Actions") rather than pushing built output to a long-lived `gh-pages` branch.

**Consequences:** Deployment history lives in Actions run logs rather than as commits on an orphan branch; no risk of the build branch drifting out of sync with `main` or accumulating unrelated history. Matches the deployment approach implied by the existing Evony Tools site's structure.

**Alternatives considered:** The classic `gh-pages` npm package pushing to a `gh-pages` branch is simpler to reason about for newcomers and still works fine, but was set aside in favor of the officially supported Actions-based flow for a marginally cleaner setup with fewer moving parts to keep in sync.

---

## ADR-011: Firestore-profile membership + client-hashed join-code lookup, replacing the custom-claim Cloud Function (supersedes ADR-004)

**Context:** A prior phase removed the `joinAlliance` Cloud Function and the `firebase-admin`/`firebase-functions` dependencies so the app could run entirely on Firebase's free Spark plan (see `DEVELOPMENT_STATUS.md`). That left `firestore.rules` checking a custom claim nothing mints any more, so joining an alliance — and every alliance-scoped read/write — was dead code pending this decision. Spark has no server compute of any kind: no Cloud Functions, no Admin SDK, no way to run a privileged secret comparison. Whatever replaces the join flow has to work with only the Firestore client SDK and Security Rules.

**Decision:** Two small additions to the schema, both readable/writable only through tightly scoped rules:
- `users/{uid}` — a per-user profile document (own `uid` as the ID, same pattern as ADR-008) holding `allianceId`, `allianceName`, and a server-set `joinedAt`. This is what a signed-in session's alliance membership is now: a Firestore fact the rules `get()` on the same request, not a claim baked into the ID token.
- `joinCodes/{sha256(normalizedCode)}` — a lookup collection mapping a join code's hash to `{ allianceId, allianceName }`. The client hashes the code it was given (Web Crypto's `SHA-256`, matching the hashing convention `docs/DATABASE_SETUP.md` already documented for the removed function) and does a single `get()` — never a `list()` — against this collection. `joinCodeHash` moves off the `alliances/{allianceId}` document (where it could never have been read pre-membership anyway, by rule 5's own design) onto this dedicated collection, which exists specifically to be readable-by-hash before membership is established.

`firestore.rules` no longer references `request.auth.token.allianceId` anywhere; every alliance-scoped rule instead calls a `hasAllianceMembership(allianceId)` helper that reads the caller's own `users/{uid}` document.

**Consequences:** The app now runs end-to-end on Spark with no Cloud Function anywhere in the stack. The tradeoff this decision makes explicit (and ADR-004 didn't have to, because a Cloud Function used to close this gap): Security Rules can verify a profile write points at a *real* alliance (via `exists()`/`get()` against `alliances/{allianceId}`) and reports that alliance's *actual* name, but they cannot verify the caller actually supplied the *correct join code* for it — there is no server left to hold that comparison as a secret. A client that bypassed the app's UI entirely and called the Firestore SDK directly could, in principle, write any real `allianceId` into their own profile without ever knowing that alliance's code. In practice this requires deliberately working around the app rather than using it, and the actual sensitive data (the player roster) is still only ever readable by someone whose profile says they belong to that alliance — but the join code itself is now a shared-secret gate enforced by the client (the same trust model alliances already apply to their own Discord invite links), not a cryptographic access boundary. This is documented plainly in `docs/DATABASE_SETUP.md` Section 6 rather than glossed over, matching this project's existing documentation style.

**Alternatives considered:**
- *Keep `joinCodeHash` on the `alliances/{allianceId}` document and allow a rules-constrained `list()` query filtered to it:* rejected — Firestore Security Rules cannot inspect a list query's `where()` filters, only `limit`/`offset`/`orderBy`, so there is no way to safely restrict such a query to "exact match on `joinCodeHash`" without also allowing a client to page through and enumerate every alliance document. A dedicated `get`-only lookup collection avoids this entirely.
- *Re-introduce a Cloud Function just for the join-code exchange, keep the rest on Spark:* rejected — this is explicitly the thing this phase and the prior one exist to avoid; any Cloud Function at all requires the Blaze plan, regardless of how small.
- *Store the plaintext join code in Firestore instead of a hash:* rejected — costs nothing to avoid (hashing is one `crypto.subtle.digest` call) and keeps the same defense-in-depth posture the original design intended, even though the underlying trust model is now weaker for the reasons above.
- *Skip alliance-membership verification via `get()` in rules and trust `request.auth.token` claims set some other way:* not viable — Spark has no mechanism to mint a custom claim without the Admin SDK, which is exactly what's unavailable here.
