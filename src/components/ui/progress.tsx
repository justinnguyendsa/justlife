"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

// Thanh tiến độ (ADR-005 3c.3 — Base UI tự đặt độ rộng Indicator, bỏ mẹo translateX của Radix).
function Progress({
  className,
  value,
  ...props
}: Omit<ProgressPrimitive.Root.Props, "className" | "value"> & { className?: string; value?: number | null }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value ?? null} {...props}>
      <ProgressPrimitive.Track className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}>
        <ProgressPrimitive.Indicator data-slot="progress-indicator" className="bg-primary h-full transition-all" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
