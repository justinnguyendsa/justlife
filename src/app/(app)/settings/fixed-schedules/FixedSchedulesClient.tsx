"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Pencil, ChevronLeft, Zap } from "lucide-react";
import type { FixedSchedule } from "@/db/schema";
import { addFixedSchedule, deleteFixedSchedule, updateFixedSchedule } from "@/app/actions/schedule";
import { AREAS, AREA_VAR } from "@/lib/areas";
import { minToHHMM } from "@/lib/format";
import { WEEKDAYS } from "@/lib/scheduler";
import { toast } from "@/components/Toaster";
import { PageHeader } from "@/components/PageHeader";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const maskLabel = (mask: number) => WEEKDAYS.filter((_, i) => mask & (1 << i)).join(" · ");

const PRESETS = [
  { label: "Giờ làm", area: "work", startMin: 510, endMin: 1080, weekdayMask: 31 },    // T2-T6 = 0b0011111
  { label: "Dạy tối", area: "teach", startMin: 1110, endMin: 1260, weekdayMask: 127 }, // cả 7 ngày
  { label: "Học cao học", area: "study", startMin: 1140, endMin: 1320, weekdayMask: 85 }, // T3/T5/T7/CN = 0b1010101
];

export function FixedSchedulesClient({ schedules }: { schedules: FixedSchedule[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  // Add form state
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("work");
  const [s, setS] = useState("08:30");
  const [e, setE] = useState("18:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);

  // Edit form state
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editArea, setEditArea] = useState("work");
  const [editS, setEditS] = useState("08:30");
  const [editE, setEditE] = useState("18:00");
  const [editDays, setEditDays] = useState<number[]>([0, 1, 2, 3, 4]);

  const [loadingPreset, setLoadingPreset] = useState(false);

  function del(id: string) {
    start(async () => {
      await deleteFixedSchedule(id);
      router.refresh();
      toast("Đã xóa khối");
    });
  }

  function add() {
    if (!label.trim()) { toast("Nhập tên khối", true); return; }
    if (toMin(e) <= toMin(s)) { toast("Giờ kết thúc phải sau giờ bắt đầu", true); return; }
    const mask = days.reduce((m, d) => m | (1 << d), 0);
    start(async () => {
      const r = await addFixedSchedule({ label: label.trim(), area, startMin: toMin(s), endMin: toMin(e), weekdayMask: mask });
      if (!r.ok) { toast(r.error || "Lỗi", true); return; }
      setAdding(false); setLabel(""); setDays([0, 1, 2, 3, 4]);
      router.refresh(); toast("Đã thêm khối cố định");
    });
  }

  function openEdit(f: FixedSchedule) {
    setEditId(f.id);
    setEditLabel(f.label);
    setEditArea(f.area);
    setEditS(minToHHMM(f.startMin));
    setEditE(minToHHMM(f.endMin));
    const selectedDays: number[] = [];
    for (let i = 0; i < 7; i++) { if (f.weekdayMask & (1 << i)) selectedDays.push(i); }
    setEditDays(selectedDays);
  }

  function saveEdit() {
    if (!editId) return;
    if (!editLabel.trim()) { toast("Nhập tên khối", true); return; }
    if (toMin(editE) <= toMin(editS)) { toast("Giờ kết thúc phải sau giờ bắt đầu", true); return; }
    const mask = editDays.reduce((m, d) => m | (1 << d), 0);
    start(async () => {
      const r = await updateFixedSchedule(editId!, { label: editLabel.trim(), area: editArea, startMin: toMin(editS), endMin: toMin(editE), weekdayMask: mask });
      if (!r.ok) { toast(r.error || "Lỗi", true); return; }
      setEditId(null);
      router.refresh(); toast("Đã cập nhật khối");
    });
  }

  async function loadPresets() {
    setLoadingPreset(true);
    try {
      for (const p of PRESETS) {
        await addFixedSchedule(p);
      }
      router.refresh();
      toast("Đã nạp 3 khối mẫu");
    } catch {
      toast("Lỗi nạp mẫu", true);
    } finally {
      setLoadingPreset(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 4 }}>
        <Link href="/settings" className="btn ghost sm" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={15} strokeWidth={2} />
          Trở về Cài đặt
        </Link>
      </div>

      <PageHeader
        title="Khối cố định"
        sub="Lịch cố định ngăn xếp việc vào giờ bận"
        action={
          <button
            className="btn line sm"
            onClick={loadPresets}
            disabled={loadingPreset}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            title="Nạp 3 khối mẫu: Giờ làm, Dạy tối, Học cao học"
          >
            <Zap size={14} strokeWidth={2} />
            {loadingPreset ? "Đang nạp..." : "Nạp mẫu"}
          </button>
        }
      />

      <div className="card" style={{ marginTop: 12 }}>
        {schedules.length === 0 && (
          <div className="empty">
            Chưa có khối cố định nào.
            <br />
            <span style={{ fontSize: 12, opacity: 0.65 }}>Thêm thủ công hoặc dùng nút &ldquo;Nạp mẫu&rdquo; để bắt đầu nhanh.</span>
          </div>
        )}

        {schedules.map((f) => (
          <div key={f.id}>
            {editId === f.id ? (
              /* --- Inline edit form --- */
              <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                <div className="field">
                  <label>Tên khối</label>
                  <input value={editLabel} onChange={(ev) => setEditLabel(ev.target.value)} placeholder="VD: Dạy DA02" />
                </div>
                <div className="field">
                  <label>Mảng</label>
                  <div className="areapick">
                    {AREAS.map((a) => (
                      <div key={a.key} className={`a ${a.key}${editArea === a.key ? " on" : ""}`} onClick={() => setEditArea(a.key)}>
                        {a.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="row2">
                  <div className="field"><label>Bắt đầu</label><input type="time" value={editS} onChange={(ev) => setEditS(ev.target.value)} /></div>
                  <div className="field"><label>Kết thúc</label><input type="time" value={editE} onChange={(ev) => setEditE(ev.target.value)} /></div>
                </div>
                <div className="field">
                  <label>Lặp lại</label>
                  <div className="filters">
                    {WEEKDAYS.map((d, i) => (
                      <span
                        key={i}
                        className={"fil" + (editDays.includes(i) ? " on" : "")}
                        onClick={() => setEditDays((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])}
                      >{d}</span>
                    ))}
                  </div>
                </div>
                <div className="row2" style={{ marginTop: 8 }}>
                  <button className="btn line block" onClick={() => setEditId(null)}>Hủy</button>
                  <button className="btn primary block" onClick={saveEdit}>Lưu thay đổi</button>
                </div>
              </div>
            ) : (
              /* --- Display row --- */
              <div className="setrow">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="l" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      className="secdot"
                      style={{ background: AREA_VAR[f.area] ?? "var(--brand)", display: "inline-block", marginRight: 2, flexShrink: 0 }}
                    />
                    {f.label}
                    <span className="chip" style={{ background: AREA_VAR[f.area] ?? "var(--brand)", opacity: 0.85, fontSize: 11 }}>
                      {AREAS.find((a) => a.key === f.area)?.label ?? f.area}
                    </span>
                  </div>
                  <div className="d" style={{ marginTop: 2 }}>
                    {minToHHMM(f.startMin)}–{minToHHMM(f.endMin)} · {maskLabel(f.weekdayMask)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn ghost sm" onClick={() => openEdit(f)} aria-label="Sửa">
                    <Pencil size={14} strokeWidth={1.9} />
                  </button>
                  <button className="btn line sm" onClick={() => del(f.id)} aria-label="Xóa">
                    <Trash2 size={14} strokeWidth={1.9} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        {!adding && (
          <button
            className="btn ghost block"
            style={{ marginTop: schedules.length > 0 ? 10 : 4 }}
            onClick={() => setAdding(true)}
          >
            <Plus strokeWidth={2} size={16} />
            Thêm khối cố định
          </button>
        )}
        {adding && (
          <div style={{ marginTop: 12 }}>
            <div className="field">
              <label>Tên khối</label>
              <input value={label} onChange={(ev) => setLabel(ev.target.value)} placeholder="VD: Dạy DA02" autoFocus />
            </div>
            <div className="field">
              <label>Mảng</label>
              <div className="areapick">
                {AREAS.map((a) => (
                  <div key={a.key} className={`a ${a.key}${area === a.key ? " on" : ""}`} onClick={() => setArea(a.key)}>
                    {a.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="row2">
              <div className="field"><label>Bắt đầu</label><input type="time" value={s} onChange={(ev) => setS(ev.target.value)} /></div>
              <div className="field"><label>Kết thúc</label><input type="time" value={e} onChange={(ev) => setE(ev.target.value)} /></div>
            </div>
            <div className="field">
              <label>Lặp lại</label>
              <div className="filters">
                {WEEKDAYS.map((d, i) => (
                  <span
                    key={i}
                    className={"fil" + (days.includes(i) ? " on" : "")}
                    onClick={() => setDays((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])}
                  >{d}</span>
                ))}
              </div>
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" onClick={() => { setAdding(false); setLabel(""); }}>Hủy</button>
              <button className="btn primary block" onClick={add}>Lưu khối</button>
            </div>
          </div>
        )}
      </div>

      <p className="muted" style={{ fontSize: 12, padding: "8px 4px" }}>
        Khối cố định được dùng để phát hiện xung đột khi xếp việc vào lịch. Thay đổi có hiệu lực ngay.
      </p>
    </div>
  );
}
