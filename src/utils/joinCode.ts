// -----------------------------------------------------------------------------
// Join-code normalization + hashing (ADR-011). The plaintext code a player
// types is never sent to Firestore or stored anywhere — only its SHA-256 hex
// digest is, matching the convention `docs/DATABASE_SETUP.md` already
// documented for the (removed) Cloud Function's `hashJoinCode()`. Hashing
// now happens client-side via the Web Crypto API instead of Node's `crypto`
// module, since there's no server to run the old implementation on.
// -----------------------------------------------------------------------------

/** Trims whitespace and lowercases, matching the hash used when the code was created. */
export function normalizeJoinCode(rawCode: string): string {
  return rawCode.trim().toLowerCase();
}

/**
 * SHA-256 hex digest of a normalized join code. This is the document ID
 * under the `joinCodes` collection (see `JoinCodeLookup` in
 * `types/models.ts`) — deterministic, one-way, and never reversible back to
 * the plaintext code from Firestore data alone.
 */
export async function hashJoinCode(rawCode: string): Promise<string> {
  const normalized = normalizeJoinCode(rawCode);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
