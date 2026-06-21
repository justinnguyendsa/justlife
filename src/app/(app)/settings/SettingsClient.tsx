"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import type { FixedSchedule } from "@/db/schema";
import { addFixedSchedule, deleteFixedSchedule } from "@/app/actions/schedule";
import { setSetting } from "@/app/actions/settings";
import { AREAS, AREA_VAR } from "@/lib/areas";
import { minToHHMM } from "@/lib/format";
import { WEEKDAYS } from "@/lib/scheduler";
import { toast } from "@/components/Toaster";

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const maskLabel = (mask: number) => WEEKDAYS.filter((_, i) => mask & (1 << i)).join(" ");

export function SettingsClient({ fixed, wip }: { fixed: FixedSchedule[]; wip: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [w, setW] = useState(wip);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("work");
  const [s, setS] = useState("08:30");
  const [e, setE] = useState("18:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);

  function saveWip(v: number) { setW(v); start(async () => { await setSetting("wip_limit", String(v)); }); }
  function del(id: string) { start(async () => { await deleteFixedSchedule(id); router.refresh(); toast("Đã xóa khối"); }); }
  function add() {
    if (!label.trim()) { toast("Nhập tên khối", true); return; }
    if (toMin(e) <= toMin(s)) { toast("Giờ kết thúc phải sau giờ bắt đầu", true); return; }
    const mask = days.reduce((m, d) => m | (1 << d), 0);
    start(async () => {
      const r = await addFixedSchedule({ label: label.trim(), area, startMin: toMin(s), endMin: toMin(e), weekdayMask: mask });
      if (!r.ok) { toast(r.error || "Lỗi", true); return; }
      setAdding(false); setLabel(""); router.refresh(); toast("Đã thêm khối cố định");
    });
  }

  return (
    <>
      <div className="sec"><h2><span className="secdot" style={{ background: "var(--brand)" }} />Khối thời gian cố định</h2></div>
      <div className="card">
        {fixed.length === 0 && <div className="empty">Chưa có khối cố định nào.</div>}
        {fixed.map((f) => (
          <div className="setrow" key={f.id}>
            <div>
              <div className="l"><span className="secdot" style={{ background: AREA_VAR[f.area], display: "inline-block", marginRight: 6 }} />{f.label}</div>
              <div className="d">{maskLabel(f.weekdayMask)} · {minToHHMM(f.startMin)}–{minToHHMM(f.endMin)}</div>
            </div>
            <button className="btn line sm" onClick={() => del(f.id)} aria-label="Xóa"><Trash2 strokeWidth={1.9} /></button>
          </div>
        ))}
        {!adding && <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => setAdding(true)}><Plus strokeWidth={2} />Thêm khối cố định</button>}
        {adding && (
          <div style={{ marginTop: 12 }}>
            <div className="field"><label>Tên khối</label><input value={label} onChange={(ev) => setLabel(ev.target.value)} placeholder="VD: Dạy DA02" /></div>
            <div className="field"><label>Mảng</label><div className="areapick">{AREAS.map((a) => <div key={a.key} className={`a ${a.key}${area === a.key ? " on" : ""}`} onClick={() => setArea(a.key)}>{a.label}</div>)}</div></div>
            <div className="row2"><div className="field"><label>Bắt đầu</label><input type="time" value={s} onChange={(ev) => setS(ev.target.value)} /></div><div className="field"><label>Kết thúc</label><input type="time" value={e} onChange={(ev) => setE(ev.target.value)} /></div></div>
            <div className="field"><label>Lặp lại</label><div className="filters">{WEEKDAYS.map((d, i) => <span key={i} className={"fil" + (days.includes(i) ? " on" : "")} onClick={() => setDays((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])}>{d}</span>)}</div></div>
            <div className="row2"><button className="btn line block" onClick={() => setAdding(false)}>Hủy</button><button className="btn primary block" onClick={add}>Lưu khối</button></div>
          </div>
        )}
      </div>

      <div className="sec"><h2><span className="secdot" style={{ background: "var(--accent)" }} />Giới hạn tập trung (WIP)</h2></div>
      <div className="card">
        <div className="setrow">
          <div><div className="l">Số việc làm cùng lúc</div><div className="d">Chống nhảy việc · nhắc nhẹ khi vượt</div></div>
          <div className="stepper"><button onClick={() => saveWip(Math.max(1, w - 1))}>–</button><span className="v">{w}</span><button onClick={() => saveWip(Math.min(10, w + 1))}>+</button></div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, padding: "0 4px" }}>Khi đang làm vượt số này, app nhắc nhẹ — không chặn cứng, vì đôi khi bạn cần linh hoạt.</p>

      <div className="sec"><h2><span className="secdot" style={{ background: "var(--module-study)" }} />Đồng bộ &amp; dữ liệu</h2></div>
      <div className="card"><div className="setrow"><div><div className="l">Đồng bộ máy ↔ điện thoại</div><div className="d">local-first · libSQL/Turso · mã hóa field nhạy cảm</div></div><span className="chip st doing">sẵn sàng</span></div></div>
    </>
  );
}
