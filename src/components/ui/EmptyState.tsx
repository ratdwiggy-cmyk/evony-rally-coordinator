import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-ink-600 px-6 py-12 text-center">
      <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 bg-gold/60" />
      <h3 className="font-display text-base text-ash-50">{title}</h3>
      {message && <p className="max-w-sm text-sm text-ash-400">{message}</p>}
      {action}
    </div>
  );
}
