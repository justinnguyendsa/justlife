"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, Plus, Trash2, Coffee } from "lucide-react";
import type { RestBlock } from "@/db/schema";
import { addRest, deleteRest } from "@/app/actions/habits";
import { fmtTime } from "@/lib/format";
import { toast } from "@/components/Toaster";

// Nút thêm nhanh các khối nghỉ phổ biến.
const QUICK = [10, 20, 30];

// Phút → chuỗi thân thiện tiếng Việt ("45 phút" / "1 giờ 20 phút").
function fmtMin(min: number): string {
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

export function RestClient({
  todayBlocks, todayMin, weekMin,
}: { todayBlocks: RestBlock[]; todayMin: number; weekMin: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [customMin, setCustomMin] = useState(""); // nhập số phút tùy chỉnh

  function add(minutes: number) {
    const nt = note.trim();
    if (minutes <= 0 || Number.isNaN(minutes)) { toast("Số phút không hợp lệ", true); return; }
    start(async () => {
      await addRest({ minutes, note: nt || undefined });
      setNote(""); setCustomMin("");
      router.refresh();
      toast(`Đã ghi nghỉ ${minutes} phút`);
    });
  }

  function addCustom() {
    const m = parseInt(customMin, 10);
    if (!customMin.trim() || Number.isNaN(m) || m <= 0) { toast("Nhập số phút hợp lệ (> 0)", true); return; }
    add(m);
  }

  function del(b: RestBlock) {
    start(async () => {
      await deleteRest(b.id);
      router.refresh();
      toast("Đã xóa khối nghỉ");
    });
  }

  return (
    <>
      {/* Tóm tắt hôm nay / tuần */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, borderRadius: "var(--radius-pill)",
            background: "var(--teach-weak)", color: "var(--module-teach)", flex: "none",
          }}
        >
          <Moon strokeWidth={1.9} width={22} height={22} />
        </span>
        <div className="b">
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 22, lineHeight: 1, color: "var(--module-teach)" }}>
              {fmtMin(todayMin)}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>nghỉ hôm nay</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Tuần này: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{fmtMin(weekMin)}</strong>
          </div>
        </div>
      </div>

      {/* Thêm khối nghỉ nhanh */}
      <div className="sec">
        <h2>
          <span className="secdot" style={{ background: "var(--module-teach)" }} />
          <Plus strokeWidth={1.8} style={{ width: 15, height: 15 }} />Thêm khối nghỉ
        </h2>
      </div>

      <div className="card">
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Ghi chú (không bắt buộc)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: đi dạo, nghe nhạc, pha trà"
          />
        </div>
        {/* Nhanh: 10 / 20 / 30 phút */}
        <div className="row2" style={{ marginBottom: 10 }}>
          {QUICK.map((m) => (
            <button key={m} className="btn ghost block" disabled={pending} onClick={() => add(m)}>
              <Coffee strokeWidth={1.9} />{m} phút
            </button>
          ))}
        </div>
        {/* Tùy chỉnh số phút */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            id="rest-custom-min"
            type="number"
            min={1}
            max={480}
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !pending) addCustom(); }}
            placeholder="Số phút khác"
            style={{ flex: 1 }}
          />
          <button className="btn ghost" disabled={pending || !customMin.trim()} onClick={addCustom} style={{ whiteSpace: "nowrap" }}>
            <Plus strokeWidth={2} />Thêm
          </button>
        </div>
      </div>

      {/* Danh sách khối nghỉ hôm nay */}
      <div className="sec" style={{ marginTop: 22 }}>
        <h2>
          <span className="secdot" style={{ background: "var(--module-teach)" }} />
          <Moon strokeWidth={1.8} style={{ width: 15, height: 15 }} />Hôm nay
        </h2>
        {todayBlocks.length > 0 && <span className="cnt">{todayBlocks.length}</span>}
      </div>

      {todayBlocks.length === 0 ? (
        <div className="empty">Hôm nay chưa có khối nghỉ nào — chọn 10/20/30 phút ở trên để ghi lại.</div>
      ) : (
        <div>
          {todayBlocks.map((b) => (
            <div key={b.id} className="card task" style={{ alignItems: "center", marginBottom: 10 }}>
              <span className="bar" style={{ background: "var(--module-teach)" }} />
              <div className="b">
                <div className="t" style={{ fontFamily: "var(--font-mono)" }}>{fmtMin(b.minutes)}</div>
                <div className="meta">
                  <span className="chip st">lúc {fmtTime(b.createdAt)}</span>
                  {b.note && <span className="muted" style={{ fontSize: 12 }}>{b.note}</span>}
                </div>
              </div>
              <button className="btn line sm" disabled={pending} onClick={() => del(b)} aria-label="Xóa khối nghỉ">
                <Trash2 strokeWidth={1.9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lời nhắc thân thiện chống burnout */}
      <div
        className="muted"
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginTop: 16, lineHeight: 1.5 }}
      >
        <Coffee strokeWidth={1.8} width={16} height={16} style={{ flex: "none", color: "var(--module-teach)" }} />
        Nghỉ ngắn giữa các khối việc giúp đầu óc tươi lại — nghỉ là một phần của làm việc bền.
      </div>
    </>
  );
}
