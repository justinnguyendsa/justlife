"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/Toaster";

// Mẫu bấm được cho Dialog / Sheet (ADR-005 3c.2) — để kiểm mở/đóng, Esc, bấm nền, focus quay về nút,
// chuyển cảnh và Sheet dưới trên điện thoại. Chỉ ở /ui-kit (dev).
export function OverlayPreview() {
  const [sheet, setSheet] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>Mở hộp thoại</DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Hộp thoại mẫu</DialogTitle>
            <DialogDescription>Esc hoặc bấm nền để đóng; focus quay về nút mở.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(String(new FormData(e.currentTarget).get("demo") ?? ""));
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ov-demo">Tên</Label>
              <Input id="ov-demo" name="demo" className="h-11 md:h-10" placeholder="Gõ rồi Enter" />
            </div>
            <Button type="submit" className="h-11 md:h-10">Lưu</Button>
            <Button type="button" variant="outline" className="h-11 md:h-10" onClick={() => toast("Thông báo nằm trên lớp phủ", true)}>
              Thử thông báo
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Button variant="outline" onClick={() => setSheet(true)}>Mở sheet dưới</Button>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[22px] px-5 pt-3 pb-6">
          <SheetTitle>Sheet mẫu</SheetTitle>
          <SheetDescription>Trượt lên từ cạnh dưới, như bảng chi tiết việc trên điện thoại.</SheetDescription>
          <Button className="h-11" onClick={() => setSheet(false)}>Đóng sheet</Button>
        </SheetContent>
      </Sheet>
      {saved !== null && <span className="text-muted-foreground text-sm" data-testid="ov-saved">Đã lưu: {saved || "(trống)"}</span>}
    </div>
  );
}
