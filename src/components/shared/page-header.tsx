import Link from "next/link";

interface PageHeaderProps {
  title: string;
  newHref?: string;
  newLabel?: string;
}

export function PageHeader({ title, newHref, newLabel = "New" }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-base leading-snug font-medium">{title}</h1>
      {newHref && (
        <Link href={newHref} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          {newLabel}
        </Link>
      )}
    </div>
  );
}