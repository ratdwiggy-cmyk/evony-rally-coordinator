# Release Notes — Evony Rally Coordinator

## Public Beta

The Evony Rally Coordinator is a live alliance status board: who's available, who's scouting, who
can lead, and who's looking for a specific boss — self-declared, updated in real time, visible to
your whole alliance at a glance.

### What's included

- **Join your alliance** with a join code shared by your leadership (Discord, same as today) — no
  account or password to manage.
- **Live Status Board:** every player's declared status (Available / Maybe / Unavailable),
  scouting flag, "Looking For" tags, "Can Lead" categories, and per-boss capability, updating
  instantly for everyone whenever anyone saves a change.
- **Search, filter, and sort** the roster — by name, by any combination of status/scouting/looking
  for/can lead/boss category, and by six different sort orders.
- **Edit your own status** — and only your own; this is enforced by the server, not just hidden in
  the UI.
- **Automatic expiration:** set an "Available Until" time and your status automatically switches to
  Unavailable for everyone once it passes — no one has to remember to update it for you.
- **Works offline:** the last-synced roster stays visible with a clear "Offline — showing data as
  of [time]" banner; anything you change while offline sends automatically once you're back.
- **Installable:** add it to your phone's home screen or your desktop browser for a faster,
  full-screen experience.

### Before you deploy this yourself

This is a public *beta* release. Before pointing a real alliance at it:

1. Follow [`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md) to create your own Firebase
   project, first alliance document, and join code.
2. Set the six `VITE_FIREBASE_*` values as GitHub Actions repository secrets (documented in
   `README.md`) — **required** for the deployed site to actually connect to your Firebase project.
3. Run the verification checklist in `README.md` once, yourself, in a real browser, before sharing
   the link with your alliance.

### Known limitations in this release

- No admin UI yet for creating an alliance or rotating a join code — a one-off manual step via the
  Firebase console ([`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md) Section 2). Reasonable at
  "one alliance per deployed instance" scale.
- No automated test suite — every function has been manually reviewed and traced, but there's
  nothing checked in yet to automatically catch a future regression.
- Not yet integrated with Discord (bot integration, scheduling, notifications, attendance,
  leaderboards, or alliance management are all intentionally out of scope for this release — see
  [`docs/PROJECT_SPECIFICATION.md`](./docs/PROJECT_SPECIFICATION.md) Section 15 for the planned
  future architecture).

### Feedback

This tool only shows what your alliance has already declared — it never assigns leaders, ranks
players, or tracks attendance. If something looks wrong or missing, that's almost always a
declaration issue (check your own status on the Profile page) rather than a board bug — but if you
do find a bug, please report it.
