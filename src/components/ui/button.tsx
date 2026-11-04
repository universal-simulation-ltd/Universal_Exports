import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { buttonClass } from "@unisim/sdk";

import { cn } from "@/lib/utils";

// The shadcn look, kept only for what is not a key button: icon-only buttons
// (size "icon"), text links, and the calendar's day cells and the date field.
const legacyButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        field: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type Variant = NonNullable<VariantProps<typeof legacyButtonVariants>["variant"]>;
type Size = NonNullable<VariantProps<typeof legacyButtonVariants>["size"]>;

// Every other button is the suite's key button (SDK 0.216, BRANDING.md →
// Buttons): default → primary (once per view), outline/secondary → secondary,
// ghost → quiet, destructive → danger. main.tsx installs the CSS. Its look sits
// in a cascade layer, so a className here should only carry layout (w-full,
// flex-1, justify-start), never colour, border, radius or font size.
const RANK = {
  default: "primary",
  destructive: "danger",
  outline: undefined,
  secondary: undefined,
  ghost: "quiet",
} as const;

function buttonVariants({
  variant,
  size,
  className,
}: { variant?: Variant | null; size?: Size | null; className?: string } = {}) {
  const v = variant ?? "default";
  if (size === "icon" || v === "link" || v === "field") {
    return legacyButtonVariants({ variant: v, size, className });
  }
  return cn(buttonClass(RANK[v], size === "sm" ? "sm" : undefined), "[&_svg]:pointer-events-none [&>svg]:mx-0", className);
}

/** A key button's icon block, its first child (primary, secondary and danger). */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="u-btn__key" aria-hidden>
      {children}
    </span>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant | null;
  size?: Size | null;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants, legacyButtonVariants, Key };
