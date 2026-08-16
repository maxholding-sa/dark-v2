import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Paginated } from "@/lib/pagination";

interface PaginationProps {
  /** Only the counters are needed — not the items themselves. */
  page: Pick<Paginated<unknown>, "page" | "totalPages" | "hasNext" | "hasPrevious">;
  /** Builds the href for a page number, preserving the caller's other params. */
  buildHref: (page: number) => string;
  labels: { previous: string; next: string };
}

/** Page numbers with ellipses, always showing first, last and the neighbours. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) result.push("gap");
    result.push(value);
  });

  return result;
}

/**
 * Links, not buttons — so pages are crawlable, shareable and work with the
 * back button. v1 paginated with client state, which meant a filtered result
 * page could not be linked to at all.
 */
export function Pagination({ page, buildHref, labels }: PaginationProps) {
  if (page.totalPages <= 1) return null;

  const itemClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border px-3 text-sm";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page.hasPrevious ? (
        <Link href={buildHref(page.page - 1)} className={itemClass} rel="prev">
          <ChevronRight className="size-4 rtl:hidden" aria-hidden />
          <ChevronLeft className="hidden size-4 rtl:block" aria-hidden />
          <span className="sr-only">{labels.previous}</span>
        </Link>
      ) : null}

      {pageWindow(page.page, page.totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-2 text-muted" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page.page ? "page" : undefined}
            className={cn(
              itemClass,
              entry === page.page && "border-brand bg-brand text-brand-foreground",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      {page.hasNext ? (
        <Link href={buildHref(page.page + 1)} className={itemClass} rel="next">
          <ChevronLeft className="size-4 rtl:hidden" aria-hidden />
          <ChevronRight className="hidden size-4 rtl:block" aria-hidden />
          <span className="sr-only">{labels.next}</span>
        </Link>
      ) : null}
    </nav>
  );
}
