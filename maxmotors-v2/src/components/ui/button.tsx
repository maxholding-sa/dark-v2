import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:bg-brand/90",
        secondary:
          "bg-surface-raised text-surface-foreground border border-border hover:bg-surface-raised/70",
        outline: "border border-border bg-transparent hover:bg-surface-raised",
        ghost: "bg-transparent hover:bg-surface-raised",
        danger: "bg-danger text-danger-foreground hover:bg-danger/90",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", fullWidth: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders the child element instead of a <button> — for links styled as buttons. */
  asChild?: boolean;
  /** Disables the button and swaps the leading icon for a spinner. */
  isLoading?: boolean;
}

/**
 * `isLoading` is part of the primitive on purpose: every v1 form re-implemented
 * "disable and show a spinner", and several forgot the `disabled`, so a double
 * click submitted twice.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, fullWidth, asChild = false, isLoading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {/* `Slot` merges props onto exactly one child, so the spinner must not
            be added alongside it — `asChild` is for links, which never load. */}
        {asChild ? (
          children
        ) : (
          <>
            {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);

Button.displayName = "Button";
export { buttonVariants };
