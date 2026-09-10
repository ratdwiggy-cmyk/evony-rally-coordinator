# Deploying on Firebase Spark + GitHub Pages

This is the single, current deployment path for Evony Rally Coordinator: a static frontend on
GitHub Pages, backed by a Firebase project on the **free Spark plan** — no Cloud Functions, no
`firebase-admin`/`firebase-functions`, no Blaze upgrade, no billing account, anywhere in this
stack. This document is the step-by-step "get it live" checklist; see
[`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md) for the full Firestore data-modeling detail
behind each step, and [`MIGRATION_NOTES.md`](./MIGRATION_NOTES.md) if you're coming from the older
Cloud-Function-based design and want to know exactly what changed.

## What you need

- A GitHub repository (public or private) to push this project to.
- A Firebase project — creating one is free and doesn't require a credit card as long as you stay
  on Spark, which this app is built to do.

Nothing else. No server to provision, no paid tier of anything.

## 1. Create the Firebase project

1. [Create a Firebase project](https://console.firebase.google.com/) (or reuse an existing one).
   Confirm it's on the **Spark** plan — this is the default for a new project; nothing in this
   guide asks you to upgrade it.
2. Add a **Web app** to the project (Project settings → General → Your apps → Web). Firebase gives
   you a config object with six values — you'll need all six in step 3 and step 5.
3. Enable **Firestore Database** (Build → Firestore Database → Create database). Any region;
   production mode is fine since `firestore.rules` (included in this repo) is the actual access
   boundary.
4. Enable **Anonymous** sign-in (Build → Authentication → Sign-in method → Anonymous → Enable). No
   other providers are used by this app.

## 2. Seed your alliance data

The app has no admin UI for creating an alliance — that's done once, directly in the Firestore
console, by whoever is standing up the board. Full instructions, including how to compute a join
code's hash so `firestore.rules` can verify it, are in
[`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md) Section 2. At minimum you'll create:

- One `alliances/{allianceId}` document (name, boss categories, "Looking For" options, staleness
  threshold).
- One `joinCodes/{sha256(code)}` document pointing at it, so players can join with a shared code.

## 3. Deploy Firestore security rules

Rules are the real access-control boundary and are **not** part of the Vite build — they deploy
separately via the Firebase CLI:

```bash
npm install -g firebase-tools   # if you don't already have it
firebase login
firebase use --add              # select/alias your Firebase project
firebase deploy --only firestore:rules
```

Re-run the last command any time `firestore.rules` changes.

## 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the six `VITE_FIREBASE_*` values from step 1.2:

```bash
cp .env.example .env.local
```

These are Firebase's public client-SDK config values — safe to expose in a built bundle by design
(see [`SECURITY.md`](./SECURITY.md)). Without them, the app runs in an "unconfigured" demo state:
Home, Settings, Help, and About still work; the Status Board and Profile show a "not configured"
message instead of a live roster.

## 5. Push to GitHub and enable Pages

1. Push this repository to GitHub.
2. In the repo: **Settings → Pages → Build and deployment → Source → GitHub Actions.**
3. Add the same six `VITE_FIREBASE_*` values as **repository secrets**, using the exact names from
   `.env.example` (**Settings → Secrets and variables → Actions → New repository secret**).
   `.github/workflows/deploy.yml` reads them from there at build time — Vite inlines `VITE_*`
   values into the build, so **without this step the deployed site has no Firebase config and
   permanently shows "not configured"** to every visitor, even though the build itself succeeds.
4. Push to `main` (or run the workflow manually from the **Actions** tab). The workflow
   type-checks, builds, and publishes `dist/` automatically — see the job steps in
   `.github/workflows/deploy.yml`.
5. The site goes live at `https://<your-username>.github.io/<repo-name>/`.

If you fork or rename the repository, update `REPO_NAME` at the top of `vite.config.ts` (used for
both the Vite `base` path and the PWA manifest's `start_url`/`scope`) to match — otherwise built
asset URLs resolve incorrectly on GitHub Pages.

### Why HashRouter

GitHub Pages serves this app from a repo-scoped subpath with no server-side rewrite rules, so a
plain `BrowserRouter` would 404 on a hard refresh of any route other than `/`. This app uses React
Router's `HashRouter` instead (routes look like `.../#/board`): the hash portion of a URL is never
sent to the server, so a refresh or shared deep link always resolves to `index.html` and then
restores the correct route client-side. If a path-style URL is preferred later, the standard
alternative is the [SPA GitHub Pages redirect trick](https://github.com/rafgraph/spa-github-pages).

## 6. Post-deploy verification checklist

Once the Actions workflow finishes, confirm on the live URL:

- [ ] **Anonymous Authentication** — opening the site signs you in silently (check Firebase
      console → Authentication → Users for a new anonymous entry); no sign-in screen is ever
      shown to the player.
- [ ] **Join flow** — entering the join code from step 2 on `/board` or `/profile` succeeds and
      creates `users/{uid}` and an initial `alliances/{allianceId}/players/{uid}` document
      (visible in the Firestore console).
- [ ] **Firestore reads/writes** — the Status Board renders the seeded alliance's roster; saving
      your own status via "Edit my status" updates immediately.
- [ ] **Realtime updates** — with the board open in two browser tabs (or two devices), a status
      change in one appears in the other within a second or two, with no manual refresh.
- [ ] **Profiles** — the `/profile` page loads your own record and saves changes through the same
      path as the board's edit modal.
- [ ] **Sorting/filtering/search** — each sort key, each filter group, and the IGN search box
      narrows/reorders the roster as expected.
- [ ] **Automatic expiration** — a player with a past `availableUntil` shows as Unavailable to
      every viewer without a page reload.
- [ ] **Offline banner** — disabling network in DevTools shows the offline indicator with the
      last-known roster still visible.
- [ ] **Routing** — hard-refreshing `/#/board`, `/#/profile`, `/#/settings`, `/#/about`, and
      `/#/help` each load the correct page (no 404).
- [ ] **PWA install** — the browser offers an "Install"/"Add to Home Screen" prompt for the site.

If any of the Firebase-dependent items show "not configured" instead, double check the repository
secrets in step 5.3 — this is the most common deploy mistake.

## Local build verification

Before pushing, verify the production build locally:

```bash
npm install
npm run typecheck   # tsc -b — no emit, just type errors
npm run build        # tsc -b && vite build — produces dist/
npm run preview      # serves dist/ locally for a final check
npm run lint          # eslint .
```

All four should complete with no errors. `npm run build`'s first step (`tsc -b`) already enforces
`noUnusedLocals`/`noUnusedParameters` (see `tsconfig.json`), so an unused import or variable fails
the build rather than just warning.
