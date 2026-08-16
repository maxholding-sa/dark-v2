import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field-level message. Presence also wires up `aria-invalid` for screen readers. */
  error?: string | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm",
            "placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </>
    );
  },
);

Input.displayName = "Input";
