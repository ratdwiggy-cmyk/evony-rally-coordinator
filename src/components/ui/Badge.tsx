import type { ReactNode } from 'react';

type Tone = 'gold' | 'available' | 'maybe' | 'unavailable' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
}

const TONE_CLASSES: Record<Tone, string> = {
  gold: 'bg-gold/15 text-gold border-gold/30',
  available: 'bg-status-available/15 text-status-available border-status-available/30',
  maybe: 'bg-status-maybe/15 text-status-maybe border-status-maybe/30',
  unavailable: 'bg-status-unavailable/15 text-status-unavailable border-status-unavailable/30',
  neutral: 'bg-ink-700/60 text-ash-200 border-ink-600',
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
