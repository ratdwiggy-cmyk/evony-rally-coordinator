# Security Policy

## Reporting a vulnerability

If you find a security vulnerability in Evony Rally Coordinator, please **do not open a public
GitHub issue**. Instead, use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **"Report a vulnerability"** to open a private advisory.

This lets the issue be discussed and fixed before it's publicly disclosed.

## Scope

This is a static, client-side React app backed by Firebase (Auth and Firestore — no Cloud
Functions; see ADR-011 in
[`docs/ARCHITECTURE_DECISIONS.md`](./docs/ARCHITECTURE_DECISIONS.md)). The real security boundary
is **`firestore.rules`** — every read/write is enforced there; anything in the client (`src/`) is
UX only and should never be treated as an access control mechanism on its own. See
[`docs/ARCHITECTURE_DECISIONS.md`](./docs/ARCHITECTURE_DECISIONS.md) and
[`docs/PROJECT_SPECIFICATION.md`](./docs/PROJECT_SPECIFICATION.md) Section 13 for the full
security model.

Reports about the following are especially useful:

- Ways to bypass or weaken `firestore.rules` (unauthorized reads/writes across alliances, or of
  another player's document or another user's profile document).
- Ways to write to a `users/{uid}` profile document that isn't your own, or to make
  `hasAllianceMembership()` return true without a matching `users/{uid}` document actually saying
  so.
- Any way to `list`/enumerate the `alliances`, `joinCodes`, or `users` collections (all three are
  `get`-only or fully closed by design).
- Any accidental exposure of a join code's plaintext value anywhere in Firestore data, logs, or the
  client bundle (only its SHA-256 hash should ever appear in Firestore, as a `joinCodes` document
  ID).

**Known, accepted limitation (not a vulnerability report):** as of ADR-011, `firestore.rules`
cannot verify that a caller who set a given `allianceId` on their own profile actually knew that
alliance's correct join code — there's no Cloud Function left to hold that comparison as a secret
on the Spark plan. Rules do verify the `allianceId` refers to a real alliance and that
`allianceName` matches it. This is documented, intentional, and explained in full in ADR-011 and
`docs/DATABASE_SETUP.md` Section 6 — please don't file it as a new report, though follow-up ideas
for closing this gap without reintroducing a paid backend are welcome as a discussion, not an
advisory.

## Supported versions

This project does not yet follow a formal versioning/release-branch scheme (see
[`RELEASE_NOTES.md`](./RELEASE_NOTES.md)) — only the latest code on `main` is supported.

## A note on Firebase client config

The `VITE_FIREBASE_*` values in `.env.example` / GitHub Actions secrets are Firebase's public
client-SDK configuration. They are safe to expose in a built client bundle by design — Firebase's
own documentation confirms this — and are **not** the security boundary. Please don't report
their presence in a built bundle as a vulnerability; if you believe `firestore.rules` itself has a
gap, that's the report we want.
