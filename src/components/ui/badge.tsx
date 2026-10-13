import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-xs leading-4 font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline: "text-muted-foreground font-medium [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        /* Chip trạng thái nền nhạt (Lam & Nắng) — chữ *-soft-foreground đạt ≥ 4.5:1 */
        ok: "border-transparent bg-success-soft text-success-soft-foreground",
        warn: "border-transparent bg-warning-soft text-warning-soft-foreground",
        danger: "border-transparent bg-destructive-soft text-destructive-soft-foreground",
        primary: "border-transparent bg-primary-soft text-primary-soft-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        /* Mảng đời sống của justlife — nền soft + chữ *-foreground riêng để đạt WCAG AA */
        work: "border-transparent bg-area-work-soft text-area-work-foreground",
        teach: "border-transparent bg-area-teach-soft text-area-teach-foreground",
        study: "border-transparent bg-area-study-soft text-area-study-foreground",
        growth: "border-transparent bg-area-growth-soft text-area-growth-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

// Chip tĩnh — không cần primitive (ADR-005 3c.1: không ai dùng asChild cho Badge).
function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
