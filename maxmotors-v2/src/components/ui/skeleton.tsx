import type * as React from "react";
import { cn } from "@/lib/cn";

/** Loading placeholder. Sized by the caller so it matches the real content box. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-raised", className)}
      {...props}
    />
  );
}
