import { useEffect, useState } from 'react';

/**
 * Returns `value`, but delayed by `delayMs` of no further changes — the
 * standard debounce pattern. Used so the Search box's underlying filter
 * (Section 5.3) doesn't re-run the roster filter on every single keystroke
 * (cheap here, since the roster is alliance-sized, but still the requested
 * behavior), while the input element itself stays fully controlled and
 * responsive — callers should bind the *input* to the raw, un-debounced
 * value and only use this debounced value for the derived filtering.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
