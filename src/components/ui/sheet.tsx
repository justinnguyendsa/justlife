"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Sheet = Dialog của Base UI trượt từ cạnh (ADR-005 3c.2; registry base của shadcn cũng dựng Sheet trên Dialog).
// Trạng thái: data-open / data-closed. Lớp phủ dùng token --overlay. Nút X có vùng chạm 44px trên điện thoại.
type WithClassName<P> = Omit<P, "className"> & { className?: string };

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({ className, ...props }: WithClassName<SheetPrimitive.Backdrop.Props>) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0 data-open:fade-in-0 bg-overlay absolute inset-0 z-50",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: WithClassName<SheetPrimitive.Popup.Props> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "bg-background data-open:animate-in data-closed:animate-out data-closed:fill-mode-forwards fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out outline-none data-closed:duration-300 data-open:duration-500",
          side === "right" &&
            "data-closed:slide-out-to-right data-open:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-closed:slide-out-to-left data-open:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-closed:slide-out-to-top data-open:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-closed:slide-out-to-bottom data-open:slide-in-from-bottom inset-x-0 bottom-0 h-auto rounded-t-2xl border-t",
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          className="focus-visible:ring-ring/50 absolute top-2 right-2 grid size-11 place-items-center rounded-md opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:pointer-events-none md:top-3 md:right-3 md:size-8"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Đóng</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: WithClassName<SheetPrimitive.Title.Props>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: WithClassName<SheetPrimitive.Description.Props>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
