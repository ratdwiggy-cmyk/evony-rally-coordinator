import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-status-unavailable/30 bg-status-unavailable/5 px-6 py-10 text-center"
    >
      <h3 className="font-display text-base text-ash-50">{title}</h3>
      <p className="max-w-sm text-sm text-ash-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
