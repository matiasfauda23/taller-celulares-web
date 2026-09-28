import Link from "next/link";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  basePath: string;
}

export function Pagination({ page, limit, total, basePath }: PaginationProps) {
  const hasPrev = page > 1;
  const hasNext = page * limit < total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Página {page} de {totalPages} ({total} total)
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={`${basePath}?page=${page - 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
            Anterior
          </Link>
        ) : (
          <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Anterior</span>
        )}
        {hasNext ? (
          <Link href={`${basePath}?page=${page + 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
            Siguiente
          </Link>
        ) : (
          <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Siguiente</span>
        )}
      </div>
    </nav>
  );
}