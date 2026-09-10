import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Slightly lighter surface, e.g. for a card nested inside another card or a hovered/selected state. */
  elevated?: boolean;
}

export function Card({ children, elevated = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={[
        'rounded-card border border-ink-700 p-4 shadow-card',
        elevated ? 'bg-ink-800' : 'bg-ink-900',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
