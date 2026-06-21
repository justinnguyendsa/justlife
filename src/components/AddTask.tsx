"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTask } from "@/app/actions/tasks";
import { calcPriorityScore } from "@/lib/priority";
import { AREAS } from "@/lib/areas";
import { toast } from "@/components/Toaster";

// Capture toàn cục: bắt việc nhanh từ mọi màn, đặt Effort/Impact/Deadline NGAY lúc tạo (điểm ưu tiên tự tính).
export function AddTask() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("work");
  const [deadline, setDeadline] = useState(""); // yyyy-mm-dd
  const [effort, setEffort] = useState(3);
  const [impact, setImpact] = useState(3);
  const [pending, start] = useTransition();
  const router = useRouter();

  const deadlineAt = deadline ? new Date(deadline + "T23:59:59").getTime() : null;
  const score = calcPriorityScore({ effort, impact, deadlineAt });

  function reset() { setTitle(""); setArea("work"); setDeadline(""); setEffort(3); setImpact(3); }
  function save() {
    if (!title.trim()) { toast("Nhập tên việc đã nhé", true); return; }
    start(async () => {
      await createTask({ title: title.trim(), area, deadlineAt, effort, impact });
      setOpen(false); reset(); router.refresh();
      toast(`Đã thêm vào Inbox · ưu tiên ${score ?? "—"}`);
    });
  }

  return (
    <>
      <button className="fab" aria-label="Thêm việc" onClick={() => setOpen(true)}><Plus strokeWidth={2.2} /></button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="sheet" role="dialog" aria-label="Thêm việc">
            <h3>Thêm việc nhanh</h3>
            <div className="field">
              <label>Việc cần làm</label>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Chuẩn bị slide buổi 6..." onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
            </div>
            <div className="field">
              <label>Mảng</label>
              <div className="areapick">
                {AREAS.map((a) => (
                  <div key={a.key} className={`a ${a.key}${area === a.key ? " on" : ""}`} onClick={() => setArea(a.key)}>{a.label}</div>
                ))}
              </div>
            </div>
            <div className="field"><label>Deadline (không bắt buộc)</label><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
            <div className="scorebox"><span>Điểm ưu tiên (tự tính)</span><span className="n">{score ?? "—"}</span></div>
            <div className="row2">
              <div className="setrow" style={{ border: "none", padding: "4px 0" }}>
                <div className="l">Effort</div>
                <div className="stepper"><button onClick={() => setEffort((v) => Math.max(1, v - 1))}>–</button><span className="v">{effort}</span><button onClick={() => setEffort((v) => Math.min(5, v + 1))}>+</button></div>
              </div>
              <div className="setrow" style={{ border: "none", padding: "4px 0" }}>
                <div className="l">Impact</div>
                <div className="stepper"><button onClick={() => setImpact((v) => Math.max(1, v - 1))}>–</button><span className="v">{impact}</span><button onClick={() => setImpact((v) => Math.min(5, v + 1))}>+</button></div>
              </div>
            </div>
            <button className="btn primary block" style={{ marginTop: 8 }} disabled={pending} onClick={save}>{pending ? "Đang lưu..." : "Lưu vào Inbox"}</button>
          </div>
        </div>
      )}
    </>
  );
}
