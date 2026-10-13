"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

// Thanh tiến độ (ADR-005 3c.3 — Base UI tự đặt độ rộng Indicator, bỏ mẹo translateX của Radix).
// Bỏ trống `value` = 0% như bản cũ (null của Base UI là "không xác định" → thanh đầy).
function Progress({
  className,
  value,
  ...props
}: Omit<ProgressPrimitive.Root.Props, "className" | "value"> & { className?: string; value?: number | null }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value ?? 0} {...props}>
      <ProgressPrimitive.Track className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}>
        <ProgressPrimitive.Indicator data-slot="progress-indicator" className="bg-primary h-full transition-all" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
