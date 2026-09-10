import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ash-200">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={Boolean(error)}
          className={[
            'min-h-[44px] rounded-md border bg-ink-900 px-3 text-sm text-ash-50 placeholder:text-ash-500',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
            error ? 'border-status-unavailable' : 'border-ink-600',
            className,
          ].join(' ')}
          {...rest}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-ash-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-status-unavailable">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
