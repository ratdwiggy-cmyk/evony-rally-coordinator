// -----------------------------------------------------------------------------
// Maps the raw errors that can surface from a Firestore write (either the
// client-side validation in `firebase/firestore.ts`, or a Firebase SDK error
// like a rejected Security Rule) into short, non-technical messages a player
// can act on. Never invents detail the underlying error didn't have — falls
// back to a generic, still-friendly message when the shape is unrecognized.
// -----------------------------------------------------------------------------

/** Turns a caught error into a short, friendly, user-facing message. */
export function friendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
    return "You don't have permission to save that — try rejoining your alliance and saving again.";
  }
  if (raw.includes('unavailable') || raw.includes('network')) {
    return "Couldn't reach the server — check your connection and try again.";
  }
  if (raw.includes('must join an alliance')) {
    return 'Join an alliance before setting your status.';
  }

  // Validation messages from `validatePlayerWriteInput` are already
  // short and friendly (e.g. "Note exceeds 140 characters.") — pass through.
  if (raw && raw.length < 120) return raw;

  return 'Something went wrong saving your status. Please try again.';
}
