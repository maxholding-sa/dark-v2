import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Locale } from "@/config/site";

interface PriceProps {
  value: number | null | undefined;
  locale?: Locale;
  className?: string;
  /** Copy shown when the price is zero or unset. */
  fallback?: string;
}

/**
 * Renders an amount followed by the Saudi riyal glyph.
 *
 * A component rather than a formatting helper, because v1's `helper.js`
 * returned JSX from a util module — which meant server code and page metadata
 * could not reuse the number formatting at all. Text formatting lives in
 * `lib/format.ts`; only the markup lives here.
 */
export function Price({ value, locale = "ar", className, fallback }: PriceProps) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return <span className={className}>{fallback ?? "—"}</span>;
  }

  return (
    <span className={cn("numeric inline-flex items-center gap-1", className)}>
      <span>{formatAmount(numeric, locale)}</span>
      <span className="icon-saudi_riyal" aria-hidden="true">
        &#xea;
      </span>
      <span className="sr-only">SAR</span>
    </span>
  );
}
