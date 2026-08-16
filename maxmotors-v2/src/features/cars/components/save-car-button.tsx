"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { toggleSavedCarAction } from "@/server/modules/cars/client";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/cn";

interface SaveCarButtonProps {
  carId: string;
  initialSaved: boolean;
  labels: { save: string; unsave: string };
  className?: string;
}

/**
 * The only interactive island inside a car card — everything else renders on
 * the server. Updates optimistically and rolls back if the action fails, so a
 * tap feels instant on a phone connection.
 */
export function SaveCarButton({
  carId,
  initialSaved,
  labels,
  className,
}: SaveCarButtonProps) {
  const [isSaved, setIsSaved] = React.useState(initialSaved);

  const { execute, isPending } = useAction(toggleSavedCarAction);

  async function handleClick(event: React.MouseEvent) {
    // The card is wrapped in a link; saving must not navigate.
    event.preventDefault();
    event.stopPropagation();

    const optimistic = !isSaved;
    setIsSaved(optimistic);

    const result = await execute(carId);
    if (!result.ok) setIsSaved(!optimistic);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSaved}
      aria-label={isSaved ? labels.unsave : labels.save}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-surface/90 backdrop-blur transition-colors hover:bg-surface disabled:opacity-60",
        className,
      )}
    >
      <Heart
        className={cn("size-4 transition-colors", isSaved && "fill-danger text-danger")}
        aria-hidden
      />
    </button>
  );
}
