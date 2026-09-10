# Evony Rally Coordinator — Project Specification

**Status:** Authoritative. All future implementation work must conform to this document.
**Part of:** Evony Tools ecosystem (standalone repo, independent GitHub Pages deployment)

---

## 1. Purpose & Philosophy

The Rally Coordinator is a **live status board**, not a management system. It answers one question for any alliance member, in under five seconds of looking at the page:

> "Who is around right now, what are they doing, and who can lead what?"

It **never decides anything**. It does not assign leaders, does not rank players, does not track attendance history, and does not enforce process. Every piece of information on the board is a self-declared statement from a player about their own current situation. The alliance uses that shared information to coordinate itself, in Discord or in game — the tool's job stops at *displaying accurate, current, and easy-to-scan information*.

### 1.1 Explicit Non-Goals
- Not an alliance manager
- Not a scheduler / calendar
- Not a Discord replacement
- Not an attendance tracker
- Not a task or assignment system
- Never computes "who should lead" or ranks players against each other

### 1.2 What the site is allowed to do
Sort, filter, search, display, and highlight. Nothing more.

---

## 2. Primary Design Goal

**Five-second comprehension.** The default view (the Status Board) must be legible at a glance on a phone screen: status color, IGN, and key badges (Looking For / Can Lead / Scouting) visible without scrolling into detail. Anything requiring more than a glance (notes, per-boss capability) is a secondary disclosure (tap/expand), not part of the primary scan.

---

## 3. Visual & UX Design Direction

- **Theme:** Dark mode base, gold accent color, matching the visual language of the existing Evony Tools site (`ratdwiggy-cmyk.github.io/evony-tools`).
- **Layout:** Mobile-first card grid; desktop enhances into a denser multi-column grid or optional table view — same data, not different data.
- **Cards, not tables, on mobile.** Optional dense table view on desktop for players who prefer scanning rows.
- **Large touch targets** for status toggles (Available / Maybe / Unavailable) — this is the single most frequent interaction and must be a one-tap action.
- **No decorative animation.** Transitions are functional only (e.g., filter re-sort), never purely cosmetic. Performance and instant legibility outrank polish.
- **Status color coding:** Green (Available), Amber (Maybe), Gray/Red (Unavailable) — color plus text label, never color alone (accessibility).
- **Staleness indicator:** Any "Last Updated" older than a configurable threshold (default 12h) is visually de-emphasized (dimmed/muted) so stale declarations don't masquerade as current.

---

## 4. Core Data Concepts

### 4.1 Player Status
One of: `available`, `maybe`, `unavailable`.
Each player record carries:
- **IGN** (display name)
- **Status** (above)
- **Available Until** (optional timestamp — when the availability window ends)
- **Last Updated** (timestamp, system-set on every write)
- **Note** (optional free text, short)

### 4.2 Looking For
Multi-select tags describing what a player wants to do right now. Built-in examples: Pan, Aglaope, Garuda, Alliance Boss, Hydra, Cerberus, Vikings, World Boss. Alliances may add **Custom** tags. Purely informational — the board does not match players to each other.

### 4.3 Can Lead
Multi-select. A player may declare themselves able to lead any number of boss/event categories. **Unlimited leaders allowed per category** — the site never limits, ranks, or picks among them.

### 4.4 Currently Scouting
Boolean flag. Unlimited players may be scouting simultaneously.

### 4.5 Capability
Self-declared **maximum comfortable solo level** per boss category — not troop power, not buff level. Free-form short strings per category, e.g. `Pan Lv5`, `Cerberus Lv16`, `Vikings Hard 60`, `Alliance Boss Hell`. Informational only; never used to compute or suggest anything.

---

## 5. Interaction Model

### 5.1 Sorting
Sortable by: Status, Last Updated, IGN, Scouting, Looking For, Can Lead, and Capability *per individual boss category* (each boss category is its own sort key, e.g. "sort by Cerberus level").

### 5.2 Filtering
Filterable by: Available / Maybe / Unavailable, Scouting, Looking For (per tag), Leading (per category), Boss category (shows players with any declared capability in that category). Filters are combinable (AND semantics across filter groups, OR within a group — e.g., Looking For: Hydra OR Cerberus, AND Status: Available).

### 5.3 Search
Free-text search by IGN, live-filtering as the user types.

### 5.4 Editing
A player may only ever edit **their own** record. There is no concept of editing another player's declared status, capability, or tags — this is a hard rule enforced at the security-rules layer, not just the UI.

---

## 6. Authentication

**Recommendation: Firebase Authentication, Anonymous provider, upgraded via an Alliance Join Code exchanged through a Cloud Function, which sets a custom claim (`allianceId`) on the user's token.**

### Reasoning
- GitHub Pages is static hosting — there is no server to run session logic, so auth must be entirely client-SDK-driven against a cloud identity provider. Firebase Auth is designed exactly for this (SPA + hosted elsewhere pattern) and requires zero backend of your own to operate day-to-day.
- Evony alliance members are not guaranteed to have a Google account they want to use, and forcing an OAuth provider (Google/Discord/etc.) adds friction for a casual mobile audience who just want to tap a status button. **Anonymous Auth** removes that friction entirely — a player opens the link, is silently signed in, and only needs to enter their IGN and the alliance's join code once.
- The **join code** is the actual access control boundary (equivalent to "you're in our Discord, you have the code"), not the identity provider. It is verified server-side by a **Cloud Function** (never trust a client-side check for this), which compares against a hashed code stored in the alliance's document and, on success, mints a custom claim (`allianceId`, and optionally `role: member`) onto the user's Firebase ID token via the Admin SDK.
- This keeps 100% of the authentication logic inside Firebase/Cloud Functions (both are "cloud services," explicitly permitted) with **no Node/Express server to host** — compliant with the GitHub Pages-only constraint for the web app itself.
- Anonymous accounts persist per-browser via Firebase's local persistence, so a returning player doesn't need to re-enter the code every visit. If they clear storage or switch devices, they simply re-enter the join code (low friction, no password to forget).
- **Future compatibility:** because the Discord bot will operate against the same Firestore/Cloud Functions, the join-code-to-claim pattern generalizes cleanly — the bot can use the same Cloud Function (or a sibling one) to verify a Discord user against an alliance and mint a matching custom token, without redesigning the auth model.

### Explicitly rejected alternatives
- **Full OAuth (Google/Discord sign-in)** as the *primary* path: adds real friction for a mobile game audience and doesn't map cleanly to "alliance membership" (a person's Google account has no relationship to their in-game alliance). Kept open as an **optional secondary provider** later, not required for v1.
- **Username/password auth:** another password for players to manage and support; rejected for a low-stakes internal tool.
- **No auth / fully public writes:** rejected — a public write-anywhere Firestore is an abuse and vandalism risk (griefers editing other alliances' or players' boards).

---

## 7. Database

**Recommendation: Cloud Firestore (Firebase), Native mode.**

### Reasoning
- **Realtime by default.** Firestore's `onSnapshot` listeners push live updates to every connected client the instant any player changes their status — this is the mechanism that makes "five-second comprehension" actually true in practice; the board updates itself, no polling, no refresh button.
- **No server required.** The client SDK talks directly to Firestore from the static GitHub Pages site; reads and writes are governed entirely by declarative Security Rules (Section 10) rather than API endpoints you'd have to host.
- **Security Rules model fits the access pattern precisely:** "a user may write only their own player doc, only inside their own alliance" is a natural, first-class Firestore Rules expression (`request.auth.uid == resource.id` style constraints scoped by custom claims).
- **Offline persistence is built in** (IndexedDB-backed cache with automatic sync on reconnect) — directly supports the offline behavior in Section 8 with no extra library.
- **Generous free tier** appropriate for an alliance-sized user base (dozens of players, low write frequency — status changes, not high-frequency telemetry).
- **Shared with the Discord bot** — a second, independent repo/service can use the Firebase Admin SDK (server-side, privileged) to read/write the exact same collections, with its own elevated trust boundary (Section 12).

### Explicitly rejected alternatives
- **Realtime Database (Firebase's older product):** weaker query capabilities (no compound/range queries across multiple fields), which the filter/sort matrix in Section 5 needs. Firestore is the modern, more capable successor for this shape of data.
- **Supabase / Postgres:** a fine product in general, but its realtime layer and per-row security model are less turn-key for a small static-site + no-backend project than Firestore's rules language, and would add a second cloud vendor for no functional gain here.
- **Self-hosted DB (Mongo/Postgres on a VPS):** explicitly excluded by the "no Node/Express/VPS" constraint.

---

## 8. Offline Behavior

**Recommendation:**
- Enable Firestore's built-in offline persistence (IndexedDB cache) on app load.
- On load with no network: render the **last cached snapshot** of the board immediately, with a persistent, unmissable **"Offline — showing data as of [last cached timestamp]"** banner. Never silently show stale data as if it were live.
- Status-change writes made while offline are queued by the Firestore SDK and committed automatically the moment connectivity returns; the UI should show a small "pending sync" indicator on any card with an unsynced local write so the player knows their tap hasn't reached the server yet.
- Because "Last Updated" staleness is already a first-class visual concept (Section 3), a reconnect naturally resolves any confusion — timestamps refresh live once synced.
- No offline *editing of other players'* data is possible in any case (rules-enforced, not just a UI restriction), so there's no offline conflict-resolution problem to design around beyond "did my own write sync yet."

---

## 9. Progressive Web App (PWA)

**Recommendation: Yes, ship as an installable PWA from v1.**

### Reasoning
- The core audience opens this tool repeatedly, briefly, on a phone — exactly the usage pattern PWAs are built for (home-screen icon, app-like framing, no browser chrome eating screen space on a small device).
- A service worker caches the app shell (HTML/CSS/JS), which both speeds up repeat visits and is what makes the offline "last known board" behavior in Section 8 feel instant rather than showing a browser error page.
- Zero conflict with the GitHub Pages constraint — PWAs are just static assets (manifest.json + service worker JS) plus HTTPS, which GitHub Pages provides natively.
- Low cost to add (Workbox or a hand-rolled minimal service worker), high payoff for the target usage pattern.

---

## 10. Folder Structure

```
evony-rally-coordinator/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # GitHub Actions: build + deploy to Pages
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── icons/                         # PWA / favicon icon set
│   └── robots.txt
├── src/
│   ├── main.tsx                       # App entry point
│   ├── App.tsx                        # Root component, routing/auth gate
│   ├── firebase/
│   │   ├── config.ts                  # Firebase client config (public keys)
│   │   ├── auth.ts                    # Anonymous sign-in, join-code exchange call
│   │   └── firestore.ts               # Firestore instance, collection refs, converters
│   ├── functions-client/
│   │   └── joinAlliance.ts            # Callable-function wrapper for join-code exchange
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Current user + allianceId claim
│   │   └── AllianceContext.tsx        # Current alliance settings (boss categories, etc.)
│   ├── hooks/
│   │   ├── usePlayers.ts              # Realtime subscription to players collection
│   │   ├── useFilters.ts              # Filter/sort state management
│   │   └── useOfflineStatus.ts        # Connectivity + cache-age tracking
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── OfflineBanner.tsx
│   │   ├── auth/
│   │   │   ├── AllianceJoinScreen.tsx # Enter IGN + join code
│   │   │   └── AuthGate.tsx           # Wraps app, blocks until authed+claimed
│   │   ├── board/
│   │   │   ├── StatusBoard.tsx        # Main grid/list container
│   │   │   ├── PlayerCard.tsx         # Single player card (mobile + desktop)
│   │   │   ├── PlayerTableRow.tsx     # Desktop dense-table alternative row
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── LookingForTags.tsx
│   │   │   ├── CanLeadTags.tsx
│   │   │   ├── ScoutingBadge.tsx
│   │   │   └── CapabilityList.tsx
│   │   ├── controls/
│   │   │   ├── FilterBar.tsx
│   │   │   ├── SortControl.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── editor/
│   │   │   └── EditMyStatusModal.tsx  # The only place a user can write data
│   │   └── shared/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Toggle.tsx
│   ├── types/
│   │   └── models.ts                  # TS types for Player, Alliance, BossCategory
│   ├── styles/
│   │   └── theme.css                  # Dark mode + gold accent tokens
│   └── utils/
│       ├── time.ts                    # Staleness / "available until" formatting
│       └── sorting.ts                 # Sort comparators per field
├── functions/                          # Firebase Cloud Functions (separate deploy target)
│   ├── src/
│   │   └── joinAlliance.ts            # Verifies join code, mints custom claim
│   ├── package.json
│   └── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── index.html
├── vite.config.ts
├── package.json
└── docs/
    ├── PROJECT_SPECIFICATION.md
    └── ARCHITECTURE_DECISIONS.md
```

---

## 11. Component Tree

```
App
└── AuthGate
    ├── AllianceJoinScreen            (shown if no allianceId claim yet)
    └── AuthenticatedApp
        ├── Header
        │   ├── AllianceName
        │   └── ConnectionStatusDot
        ├── OfflineBanner              (conditional)
        ├── FilterBar
        │   ├── StatusFilterToggles
        │   ├── LookingForFilterMenu
        │   ├── LeadingFilterMenu
        │   ├── ScoutingFilterToggle
        │   └── BossCategoryFilterMenu
        ├── SearchBar
        ├── SortControl
        ├── StatusBoard
        │   ├── PlayerCard (× N)        [mobile / card-view default]
        │   │   ├── StatusBadge
        │   │   ├── AvailableUntilLabel
        │   │   ├── LastUpdatedLabel
        │   │   ├── NoteText
        │   │   ├── LookingForTags
        │   │   ├── CanLeadTags
        │   │   ├── ScoutingBadge
        │   │   └── CapabilityList (expand/collapse)
        │   └── PlayerTableRow (× N)    [desktop dense-table alternative]
        ├── EditMyStatusModal           (opened from own card / floating action button)
        │   ├── StatusToggle
        │   ├── AvailableUntilPicker
        │   ├── NoteInput
        │   ├── LookingForMultiSelect
        │   ├── CanLeadMultiSelect
        │   ├── ScoutingToggle
        │   └── CapabilityEditor (per boss category)
        └── Footer
```

---

## 12. Database Schema

### 12.1 Collection: `alliances/{allianceId}`
| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `createdAt` | timestamp | |
| `bossCategories` | array<map> | `{ id, label, order }` — built-ins + alliance-added customs |
| `lookingForOptions` | array<map> | `{ id, label, order }` — built-ins + customs |
| `staleAfterMinutes` | number | Configurable "Last Updated" dimming threshold, default 720 |

> **Note (ADR-011):** this table originally also listed `joinCodeHash` here. As of ADR-011 the join
> code lives in the separate `joinCodes` collection (12.5) instead, since the alliance document
> can only ever be read by an already-a-member client — a code lookup has to work *before*
> membership exists, which a field on this document structurally can't support.

### 12.2 Collection: `alliances/{allianceId}/players/{uid}`
Document ID = the player's Firebase Auth `uid`, guaranteeing a player can only ever have one record and can only write to the doc matching their own uid.

| Field | Type | Notes |
|---|---|---|
| `ign` | string | Player-chosen display name |
| `status` | string enum | `available` \| `maybe` \| `unavailable` |
| `availableUntil` | timestamp \| null | Optional |
| `note` | string \| null | Short free text, length-capped |
| `lookingFor` | array<string> | References `lookingForOptions[].id`, plus free-text customs |
| `canLead` | array<string> | References `bossCategories[].id` |
| `scouting` | boolean | |
| `capability` | map<string, string> | key = `bossCategories[].id`, value = free-text level (e.g. `"Lv5"`, `"Hard 60"`, `"Hell"`) |
| `lastUpdated` | timestamp | Server-set on every write (`serverTimestamp()`), never client-supplied |
| `createdAt` | timestamp | Server-set once |

### 12.3 Relationships
- `alliances/{allianceId}` is the tenant root; every player document is nested under exactly one alliance — this is both the data model and the security boundary.
- No cross-alliance references exist anywhere in the schema; alliances are fully isolated.
- `bossCategories` and `lookingForOptions` are denormalized onto the alliance document (small, slow-changing lists) rather than separate collections, since they're read on every page load alongside the alliance itself and rarely change — avoids an extra round-trip for data that's effectively configuration.

### 12.4 Why not a top-level `players` collection with an `allianceId` field?
Nesting under `alliances/{allianceId}/players` lets a single Firestore query (`alliances/{allianceId}/players`) and a single realtime listener retrieve exactly and only the current alliance's roster, with the tenant isolation expressed structurally rather than via a `where('allianceId', '==', ...)` filter that Security Rules would otherwise have to re-verify on every document.

### 12.5 Collection: `users/{uid}` *(added by ADR-011)*
Document ID = the player's Firebase Auth `uid` — same pattern as 12.2's player documents (ADR-008).

| Field | Type | Notes |
|---|---|---|
| `allianceId` | string | Must reference an existing `alliances/{allianceId}` document (enforced in rules) |
| `allianceName` | string | Must exactly match that alliance's `name` field (enforced in rules) |
| `joinedAt` | timestamp | Server-set on every write (`serverTimestamp()`), never client-supplied |

This is what replaced the `allianceId` custom auth-token claim (ADR-004): Security Rules establish
alliance membership by reading this document (`get()`), rather than by inspecting a signed token.
It is the single source of truth `AllianceContext`, `usePlayers`, and every alliance-scoped
Firestore read in this app key off, surfaced to the UI as `CurrentUser.allianceId` (12.6).

### 12.6 Collection: `joinCodes/{hash}` *(added by ADR-011)*
Document ID = the hex SHA-256 digest of the join code, normalized (trimmed, lowercased) before
hashing — never the plaintext code itself.

| Field | Type | Notes |
|---|---|---|
| `allianceId` | string | The alliance this code grants membership to |
| `allianceName` | string | Denormalized so the client can display/validate it without a second read |

Readable via `get` (never `list`) by any signed-in session, which is what makes a Spark-only join
flow possible: a client can resolve a code it already knows without first having any alliance
membership. See ADR-011 for why this is a shared-secret gate rather than a cryptographic boundary,
and `docs/DATABASE_SETUP.md` Section 6 for the same caveat in setup-guide form.

---

## 13. Security Rules (Design)

> **Superseded by ADR-011 — updated below to reflect the current implementation.** This section
> originally read *"Rules are expressed against `request.auth.token.allianceId` (the custom claim
> set by the join-code Cloud Function)."* That Cloud Function was removed to keep the app on the
> Spark plan, and ADR-011 replaced the claim with a Firestore-native membership check. The
> principles below are the same in spirit — one alliance's data stays invisible and unwritable to
> everyone outside it, and a player can only ever touch their own record — just re-expressed
> against the mechanism that actually exists now.

Rules are expressed against the caller's own `users/{request.auth.uid}` profile document (12.5), read via `get()` inside the rules themselves, instead of a signed token claim.

**Principles enforced:**
1. A signed-in session with no `users/{uid}` profile, or a profile pointing at a different alliance, can read or write nothing alliance-scoped.
2. Reads of `alliances/{allianceId}` and its `players` subcollection are allowed only when the caller's own profile document's `allianceId` equals `allianceId`.
3. Writes to a player document are allowed only when **both**: the caller's profile `allianceId` matches **and** `request.auth.uid == playerId` (the document ID). A player can never write to any document but their own.
4. `lastUpdated`/`createdAt` (player documents) and `joinedAt` (profile documents) must be rejected if the client attempts to set them directly — only `request.time` (via `serverTimestamp()`) is accepted, preventing spoofed timestamps.
5. The `alliances/{allianceId}` document itself (name, boss category config) is **read-only from the client** entirely; any change to alliance configuration is a console/CLI-only action (12.1, 12.5's note) — there is no privileged backend left to do it any other way.
6. Field-level validation: `status` must be one of the three enum values; `note` length-capped; arrays capped to a sane max length; a profile's `allianceId` must reference a real alliance document and `allianceName` must match it exactly — all enforced in rules, not just client-side, so a modified client can't bypass them.
7. Document creation is allowed once per uid (no overwriting another player's doc even if somehow the same uid pattern were guessed) — enforced via `request.resource.id == request.auth.uid` on create.
8. *(new, ADR-011)* The `joinCodes/{hash}` collection allows `get` for any signed-in session but never `list` — a document is only reachable by someone who already knows (and hashed) the plaintext code; the collection can never be browsed or enumerated.
9. *(new, ADR-011)* A user's `users/{uid}` profile is readable and writable only by that same `uid`; `list` is denied so no session can enumerate other members' alliance affiliations.

**Explicitly denied by rules, not just by absence of a UI button:**
- Any write where the target document ID does not equal the requester's own uid (player documents *or* their own profile document).
- Any write to another alliance's subtree, regardless of what the caller's own profile document claims (rules re-derive membership from Firestore on every request; there's no cached/stale claim to exploit).
- Any attempt to write alliance-level config (`alliances/{allianceId}` itself) from a normal member's authenticated session.
- Any attempt to `list` the `alliances`, `joinCodes`, or `users` collections from a client session.

**What rules cannot enforce (ADR-011, stated plainly rather than glossed over):** whether the
caller who wrote a given `allianceId` into their own profile actually supplied the correct join
code for it. Rules can (and do) confirm the `allianceId` refers to a real alliance and that
`allianceName` matches, but the code comparison itself happens client-side (`lookupJoinCode()` in
`firebase/firestore.ts`), because Spark has no server-side location to hold that comparison as a
secret. See ADR-011's "Consequences" section for the full reasoning.

---

## 14. Hosting & Deployment (GitHub Pages)

1. **Repository:** `evony-rally-coordinator`, its own repo, independent of the main `evony-tools` repo and any future Discord bot repo.
2. **Build:** Vite production build (`vite build`) produces static assets in `dist/`. Firebase config keys (project ID, API key, etc.) are **public by design** in Firebase's client-SDK model — security lives in Firestore Rules, not in hiding these values, so they can be safely committed/baked into the static build.
3. **CI/CD:** A GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `main`:
   - Install dependencies → run build → deploy `dist/` using `actions/deploy-pages` (the modern GitHub Pages Actions deployment, not a `gh-pages` branch push) to keep deployment fully declarative and avoid a stray long-lived branch.
4. **Pages configuration:** Repository Settings → Pages → Source: "GitHub Actions."
5. **Custom domain / subpath:** If served at `https://ratdwiggy-cmyk.github.io/evony-rally-coordinator/`, `vite.config.ts`'s `base` must be set to `/evony-rally-coordinator/` so all asset paths resolve correctly under the repo-scoped Pages URL, matching the pattern of the existing `evony-tools` site.
6. **Cloud Functions deploy separately** via the Firebase CLI (`firebase deploy --only functions`), independent of the GitHub Pages pipeline — the static frontend and the privileged backend function have separate deployment lifecycles, which is expected and fine (Cloud Functions are explicitly permitted "cloud services," not a violation of the no-Node-hosting rule since you are not hosting or maintaining the server yourself).

---

## 15. Discord Bot API Architecture (Future Repository)

The Discord bot lives in its own repository and is **not** part of this one. This repo must, however, expose a stable way for that future bot to read and write the same alliance data.

### Recommended architecture: a thin Cloud Functions HTTPS API, shared by both consumers
- Deploy a small set of **HTTPS Cloud Functions** (in the `functions/` directory of *this* repo, since they're tied to this schema) that act as the single source of truth for how *any* client — the web app or the bot — reads/writes player data:
  - `GET /status?allianceId=...` → current roster snapshot
  - `POST /players/:uid/status` → update a player's status (used by bot commands like `/available`)
  - `POST /alliances/:id/join` → the join-code exchange endpoint already described in Section 6
- The **web app** mostly bypasses this API and talks to Firestore directly via the client SDK (that's the whole point of Firestore + Rules — no API server needed for the primary use case).
- The **Discord bot**, however, authenticates as a **privileged service** using a Firebase **service account** (Admin SDK), and calls either these HTTPS functions or Firestore directly with admin privileges — bypassing client Security Rules entirely, which is the standard, expected pattern for a trusted backend service.
- Using a thin API layer (rather than having the bot hit Firestore directly with the Admin SDK for everything) is recommended so that:
  - The bot's commands map to **stable, documented endpoints** rather than needing to know Firestore's internal document shape — if the schema evolves, only the Cloud Function needs updating, not the bot's command logic.
  - Write validation logic (status enum, string length caps, etc.) lives in **one place** shared by both the rules layer and the function layer, rather than being duplicated in the bot's own code.
- **Cross-repo contract:** this repo publishes an `API_CONTRACT.md` (endpoint list, request/response shapes, auth header format) that the Discord bot repo treats as an external dependency — the same relationship the bot would have with any third-party API.

---

## 16. Summary of Recommended Stack

> Table below reflects the **original v1 recommendation**, including Section 15's Cloud
> Functions-based Discord bot integration, which remains a future/unimplemented plan. The **Auth**
> and **Backend logic** rows no longer match the current implementation as of ADR-011 — see the
> superseded-notice at the top of Section 13 for what actually runs today (no Cloud Functions
> anywhere in this repo; join verification and alliance membership are handled entirely by the
> client SDK and `firestore.rules`).

| Concern | Choice |
|---|---|
| Frontend framework | React + Vite + TypeScript |
| Styling | Tailwind CSS (dark mode + gold accent design tokens) |
| Hosting | GitHub Pages (via GitHub Actions, `actions/deploy-pages`) |
| Auth | ~~Firebase Anonymous Auth + join-code Cloud Function → custom claims~~ **As built (ADR-011): Firebase Anonymous Auth + client-hashed join-code lookup → Firestore `users/{uid}` profile** |
| Database | Cloud Firestore |
| Backend logic | ~~Firebase Cloud Functions (join code exchange, Discord bot API)~~ **As built: none — Spark plan, no Cloud Functions** |
| Offline | Firestore built-in persistence + explicit staleness UI |
| PWA | Yes — manifest + service worker (Workbox) |
| Discord integration | Shared Firestore via Admin SDK + thin HTTPS Cloud Functions API *(Section 15 — still just a future plan, not built)* |
