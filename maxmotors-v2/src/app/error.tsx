"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/i18n";

/**
 * Route-level error boundary.
 *
 * Renders a translated message only. The `error` object reaching the client is
 * already redacted by Next.js in production, and nothing here re-exposes it —
 * the real cause is in the server logs, keyed by `error.digest`.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = createTranslator();

  React.useEffect(() => {
    console.error("route.error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">{t("errors.unexpected")}</h1>
      <p className="text-sm text-muted">{t("errors.internal")}</p>
      <Button onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
