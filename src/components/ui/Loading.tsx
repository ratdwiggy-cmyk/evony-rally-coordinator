export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-ash-400">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-ink-600 border-t-gold"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
