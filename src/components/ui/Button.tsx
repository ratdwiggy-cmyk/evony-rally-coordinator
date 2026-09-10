import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-gold text-ink-950 hover:bg-gold-bright disabled:hover:bg-gold',
  secondary: 'bg-ink-800 text-ash-50 border border-ink-600 hover:border-gold hover:text-gold',
  ghost: 'bg-transparent text-ash-200 hover:bg-ink-800 hover:text-gold',
  danger: 'bg-transparent text-status-unavailable border border-ink-600 hover:border-status-unavailable',
};

export function Button({ variant = 'primary', className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={[
        // Minimum 44px touch target height per mobile-first / large-touch-target requirement
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      disabled={disabled}
      {...rest}
    />
  );
}
