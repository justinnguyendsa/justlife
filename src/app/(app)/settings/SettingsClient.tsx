"use client";
import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import type { FixedSchedule } from "@/db/schema";
import { setWipLimit } from "@/app/actions/settings";
import { toast } from "@/components/Toaster";
import { Segmented } from "@/components/Segmented";
import { ThemeSetting } from "@/components/ThemeSetting";
import { OwnerSignOutButton } from "@/components/OwnerSignOutButton";
import { Button } from "@/components/ui/button";
import { FixedEditor } from "./FixedEditor";
import { FixedList } from "./FixedList";

export type Account = { enabled: boolean; email: string | null };

const WIP_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "0", label: "Không giới hạn" },
];

// Màn Cài đặt (SPEC-UI-P2.5, canvas J08). Web: trái Giờ bận, phải Giới hạn · Giao diện · Tài khoản.
// Phần Đồng bộ với justudy chưa hiện cho tới F6. `email` nhận vào đã được che ở server.
export function SettingsClient({ fixed, wip, account }: { fixed: FixedSchedule[]; wip: number; account: Account }) {
  const [editing, setEditing] = useState<FixedSchedule | "new" | null>(null);
  const [w, setW] = useState(String(wip));
  const saved = useRef(String(wip)); // giá trị server đã nhận gần nhất
  const latest = useRef(String(wip)); // lựa chọn mới nhất của người dùng
  const [, start] = useTransition();

  // Giá trị cũ ngoài 1/2/3/không giới hạn (vd. 5) vẫn hiện để không mất.
  const wipOptions = WIP_OPTIONS.some((o) => o.value === w) ? WIP_OPTIONS : [...WIP_OPTIONS.slice(0, 3), { value: w, label: w }, WIP_OPTIONS[3]];

  const saveWip = (v: string) => {
    latest.current = v;
    setW(v);
    // Lỗi chỉ trả về giá trị đã lưu khi đây vẫn là lựa chọn mới nhất (bấm nhanh 2 lần không bị lệch).
    const revert = () => { if (latest.current === v) { latest.current = saved.current; setW(saved.current); } };
    start(async () => {
      try {
        const r = await setWipLimit(Number(v));
        if (!r.ok) {
          revert();
          return toast(r.error, true);
        }
        saved.current = v;
        toast(v === "0" ? "Đã bỏ giới hạn việc đang làm" : `Tối đa ${v} việc đang làm cùng lúc`);
      } catch {
        revert();
        toast("Chưa lưu được — kiểm tra kết nối rồi thử lại", true);
      }
    });
  };

  const block = editing === "new" ? null : editing;

  return (
    <div className="grid max-w-[1000px] items-start gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-labelledby="set-fixed" className="bg-card flex flex-col gap-3 rounded-lg border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="set-fixed" className="text-[17px] leading-6 font-semibold">Giờ bận cố định</h2>
            <p className="text-muted-foreground text-[13px]">Lịch và gợi ý xếp việc sẽ né các khung này.</p>
          </div>
          <Button variant="outline" size="sm" className="h-11 shrink-0 md:h-8" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Thêm khung
          </Button>
        </div>
        <FixedList fixed={fixed} onEdit={setEditing} />
      </section>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="set-wip" className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 id="set-wip" className="text-[17px] leading-6 font-semibold">Giới hạn đang làm</h2>
          <p className="text-muted-foreground text-[13px]">Khi đã đủ số việc đang làm, app nhắc bạn tạm dừng một việc trước khi bắt đầu việc mới.</p>
          <Segmented options={wipOptions} value={w} onChange={saveWip} ariaLabel="Số việc đang làm cùng lúc" className="flex [&>button]:flex-auto [&>button]:px-3 [&>button]:whitespace-nowrap" />
        </section>

        <section aria-labelledby="set-theme" className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 id="set-theme" className="text-[17px] leading-6 font-semibold">Giao diện</h2>
          <p className="text-muted-foreground text-[13px]">Áp cho cả justlife và justudy trên máy này.</p>
          <ThemeSetting />
        </section>

        <section aria-labelledby="set-account" className="bg-card flex flex-col items-start gap-3 rounded-lg border p-5">
          <h2 id="set-account" className="text-[17px] leading-6 font-semibold">Tài khoản</h2>
          {account.enabled ? (
            <>
              <p className="text-muted-foreground text-[13px]">Đăng nhập bằng Google{account.email ? ` · ${account.email}` : ""}</p>
              <OwnerSignOutButton />
            </>
          ) : (
            <p className="text-muted-foreground text-[13px]">Đăng nhập chủ sở hữu đang tắt trên máy này.</p>
          )}
        </section>
      </div>

      {editing !== null && (
        <FixedEditor key={block?.id ?? "new"} open block={block} onOpenChange={(v) => { if (!v) setEditing(null); }} />
      )}
    </div>
  );
}
