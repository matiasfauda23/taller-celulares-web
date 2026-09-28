interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "No records found." }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}