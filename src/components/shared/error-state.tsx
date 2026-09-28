interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <p role="alert" className="text-sm text-destructive">
        {message}
      </p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted"
        >
          Intentar de nuevo
        </button>
      ) : null}
    </div>
  );
}