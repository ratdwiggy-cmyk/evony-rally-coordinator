// -----------------------------------------------------------------------------
// Display-only time formatting for the Status Board.
// Per docs/PROJECT_SPECIFICATION.md Section 3: "Last Updated" older than the
// alliance's configured threshold (`staleAfterMinutes`, default 720 = 12h)
// must be visually de-emphasized so a stale declaration never masquerades as
// current. This module only formats/labels — it never mutates data.
//
// Automatic expiration (Available Until passing) is a *separate* concept
// from staleness and lives in `utils/expiration.ts` /
// `hooks/useExpirationClock.ts`, not here — this file still only ever
// formats a timestamp for display; it never decides what a player's status
// currently is.
// -----------------------------------------------------------------------------

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** True when `lastUpdated` is older than the alliance's staleness threshold. */
export function isStale(lastUpdatedMs: number, staleAfterMinutes: number): boolean {
  if (!lastUpdatedMs) return true;
  return Date.now() - lastUpdatedMs > staleAfterMinutes * MINUTE_MS;
}

/** Short, relative "time ago" label for a past timestamp (e.g. "5m ago"). */
export function formatRelativeTime(ms: number): string {
  if (!ms) return 'Unknown';

  const diff = Date.now() - ms;
  if (diff < 0) return 'Just now';
  if (diff < MINUTE_MS) return 'Just now';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`;

  const days = Math.floor(diff / DAY_MS);
  if (days < 7) return `${days}d ago`;

  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Label for a future "Available Until" timestamp (e.g. "Today, 9:40 PM"). */
export function formatAvailableUntil(ms: number | null): string | null {
  if (ms === null) return null;

  const target = new Date(ms);
  const now = new Date();
  const isToday = target.toDateString() === now.toDateString();
  const time = target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today, ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (target.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;

  const date = target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
}

// -----------------------------------------------------------------------------
// Added for self-editing (EditMyStatusFields/EditMyStatusModal): converts
// between epoch millis (the schema's `availableUntil` shape, Section 12.2)
// and the string format `<input type="datetime-local">` requires/produces.
// Display-only helpers, like the rest of this file — no validation lives here.
// -----------------------------------------------------------------------------

/** Epoch millis (or null) -> `datetime-local` input value, in the viewer's local time. */
export function toDatetimeLocalValue(ms: number | null): string {
  if (ms === null) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** `datetime-local` input value -> epoch millis, or null if empty/invalid. */
export function fromDatetimeLocalValue(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}
