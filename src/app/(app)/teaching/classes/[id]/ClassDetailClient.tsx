"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserPlus, ClipboardCheck, FileText, CheckCheck, Download, KeyRound, Copy, Check, Link2, Video, ExternalLink, BookOpen } from "lucide-react";
import type { TcClass, TcStudent, TcSession, TcAssignment, TcAttendance, TcGrade, TcMaterial } from "@/db/lms/schema";

// Bài nộp 1 HV cho 1 bài tập (instructor xem để chấm). originalName đã giải mã ở server.
export type SubmissionRow = {
  id: string;
  studentId: string;
  fileRef: string;
  originalName: string | null;
  size: number | null;
  submittedAt: number | null;
  status: string;
};
import {
  addStudent, removeStudent,
  createSession, setAttendance, deleteSession,
  createAssignment, setGrade, deleteAssignment,
  addMaterialLink, deleteMaterial,
} from "@/app/actions/teaching";
import { provisionStudentAccess } from "@/app/actions/lms-admin";
import { getEmbed } from "@/lib/lms/embed";
import { fmtDate, fmtTime } from "@/lib/format";
import { toast } from "@/components/Toaster";

type Detail = { cls: TcClass; students: TcStudent[]; sessions: TcSession[]; assignments: TcAssignment[] };
type Summary = { studentCount: number; assignmentCount: number; avgSubmissionPct: number; avgScore: number | null };
type SubmissionStat = { totalStudents: number; submittedCount: number; pendingGradeCount: number };
type StudentProgress = { submitted: number; total: number; avgScore: number | null };
type Props = {
  detail: Detail;
  attendanceBySession: Record<string, TcAttendance[]>;
  gradesByAssignment: Record<string, TcGrade[]>;
  submissionsByAssignment: Record<string, SubmissionRow[]>;
  summary: Summary;
  submissionStats: Record<string, SubmissionStat>;
  studentProgress: Record<string, StudentProgress>;
  materials: TcMaterial[];
};

type Tab = "students" | "attendance" | "grading" | "materials";
type AttStatus = "present" | "absent" | "late";

const ATT: { key: AttStatus; label: string }[] = [
  { key: "present", label: "Có mặt" },
  { key: "absent", label: "Vắng" },
  { key: "late", label: "Muộn" },
];
const ATT_LABEL: Record<string, string> = { present: "có mặt", absent: "vắng", late: "muộn" };

// Mẫu nhận xét: placeholder điền sẵn, [tên] sẽ được thay bằng tên học viên thật.
const FEEDBACK_TPL = "Em [tên]: điểm mạnh là ...; cần cải thiện ...";

// Mặc định input datetime-local theo ngày hiện tại, làm tròn về đầu giờ kế tiếp.
function defaultSessionDate(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClassDetailClient({ detail, attendanceBySession, gradesByAssignment, submissionsByAssignment, summary, submissionStats, studentProgress, materials }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("students");
  const { students, sessions, assignments } = detail;

  return (
    <>
      <div className="class-summary">
        <div className="class-summary-item">
          <span className="class-summary-n">{summary.studentCount}</span>
          <span className="class-summary-l">Học viên</span>
        </div>
        <div className="class-summary-item">
          <span className="class-summary-n">{summary.assignmentCount}</span>
          <span className="class-summary-l">Bài tập</span>
        </div>
        <div className="class-summary-item">
          <span className="class-summary-n">{summary.avgSubmissionPct}%</span>
          <span className="class-summary-l">Nộp TB</span>
        </div>
        <div className="class-summary-item">
          <span className="class-summary-n">{summary.avgScore ?? '—'}</span>
          <span className="class-summary-l">Điểm TB</span>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" className={tab === "students" ? "on" : ""} onClick={() => setTab("students")}>Học viên</button>
        <button role="tab" className={tab === "attendance" ? "on" : ""} onClick={() => setTab("attendance")}>Điểm danh</button>
        <button role="tab" className={tab === "grading" ? "on" : ""} onClick={() => setTab("grading")}>Chấm bài</button>
        <button role="tab" className={tab === "materials" ? "on" : ""} onClick={() => setTab("materials")}>Tài liệu</button>
      </div>

      {tab === "students" && (
        <StudentsTab classId={detail.cls.id} students={students} pending={pending} start={start} router={router} studentProgress={studentProgress} />
      )}
      {tab === "attendance" && (
        <AttendanceTab
          classId={detail.cls.id}
          students={students}
          sessions={sessions}
          attendanceBySession={attendanceBySession}
          pending={pending}
          start={start}
          router={router}
        />
      )}
      {tab === "grading" && (
        <GradingTab
          classId={detail.cls.id}
          students={students}
          assignments={assignments}
          gradesByAssignment={gradesByAssignment}
          submissionsByAssignment={submissionsByAssignment}
          submissionStats={submissionStats}
          pending={pending}
          start={start}
          router={router}
        />
      )}
      {tab === "materials" && (
        <MaterialsTab classId={detail.cls.id} materials={materials} pending={pending} start={start} router={router} />
      )}
    </>
  );
}

/* ============ TAB: HỌC VIÊN ============ */
type Router = ReturnType<typeof useRouter>;
type Start = ReturnType<typeof useTransition>[1];

function StudentsTab({ classId, students, pending, start, router, studentProgress }: {
  classId: string; students: TcStudent[]; pending: boolean; start: Start; router: Router;
  studentProgress: Record<string, StudentProgress>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Học viên đang mở sheet "Cấp mã truy cập".
  const [provSid, setProvSid] = useState<string | null>(null);
  const provStudent = provSid ? students.find((s) => s.id === provSid) ?? null : null;

  function add() {
    const nm = name.trim();
    if (!nm) { toast("Nhập tên học viên", true); return; }
    start(async () => {
      await addStudent({ classId, name: nm, email: email.trim() || undefined });
      setName(""); setEmail("");
      router.refresh();
      toast("Đã thêm học viên");
    });
  }
  function del(s: TcStudent) {
    start(async () => {
      await removeStudent(s.id, classId);
      router.refresh();
      toast("Đã xóa học viên");
    });
  }

  return (
    <>
      <div className="card">
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Tên học viên</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Email (không bắt buộc)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vidu.com" autoComplete="off" />
        </div>
        <button className="btn ghost block" disabled={pending} onClick={add}><UserPlus strokeWidth={1.9} />Thêm học viên</button>
      </div>

      <div className="sec"><h2><span className="secdot" style={{ background: "var(--module-teach)" }} />Danh sách</h2><span className="cnt">{students.length}</span></div>
      {students.length === 0 ? (
        <div className="empty">Chưa có học viên — thêm ở trên để bắt đầu điểm danh & chấm bài.</div>
      ) : (
        <div className="card">
          {students.map((s) => (
            <div className="setrow" key={s.id} style={{ gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="l">{s.name}</div>
                {s.email && <div className="d" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.email}</div>}
                {studentProgress[s.id] && (
                  <div className="stu-prog">
                    <span className="stu-prog-n">{studentProgress[s.id].submitted}/{studentProgress[s.id].total} bài</span>
                    {studentProgress[s.id].avgScore != null && (
                      <span className="stu-prog-score">ĐTB: {studentProgress[s.id].avgScore}</span>
                    )}
                  </div>
                )}
              </div>
              <button className="btn line sm" disabled={pending} onClick={() => setProvSid(s.id)} aria-label={`Cấp mã truy cập cho ${s.name}`} title="Cấp mã truy cập">
                <KeyRound strokeWidth={1.9} />
              </button>
              <button className="btn line sm" disabled={pending} onClick={() => del(s)} aria-label={`Xóa ${s.name}`}><Trash2 strokeWidth={1.9} /></button>
            </div>
          ))}
        </div>
      )}

      {provStudent && (
        <ProvisionSheet
          classId={classId}
          student={provStudent}
          pending={pending}
          start={start}
          onClose={() => setProvSid(null)}
        />
      )}
    </>
  );
}

/* ---- Sheet: Cấp mã truy cập + ghi đồng ý (S5) ---- */
function ProvisionSheet({ classId, student, pending, start, onClose }: {
  classId: string; student: TcStudent; pending: boolean; start: Start; onClose: () => void;
}) {
  const [isMinor, setIsMinor] = useState(false);
  const [guardian, setGuardian] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [issued, setIssued] = useState<string | null>(null); // mã thô hiện 1 lần
  const [copied, setCopied] = useState(false);

  // Esc đóng sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function issue() {
    if (isMinor) {
      if (!guardian.trim()) { toast("Nhập liên hệ phụ huynh", true); return; }
      if (!confirmed) { toast("Cần xác nhận đã có đồng ý của phụ huynh", true); return; }
    }
    start(async () => {
      const r = await provisionStudentAccess({
        studentId: student.id,
        classId,
        isMinor,
        guardianContact: isMinor ? guardian.trim() : null,
      });
      if (!r.ok) { toast(r.error, true); return; }
      setIssued(r.code); // mã chỉ hiện 1 lần ở client; không cần reload trang
      toast("Đã cấp mã truy cập");
    });
  }

  async function copyCode() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Không sao chép được — hãy chép tay", true);
    }
  }

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-label={`Cấp mã truy cập cho ${student.name}`}>
        <h3>{student.name}</h3>

        {issued ? (
          <>
            <div className="setrow" style={{ border: "none", padding: "8px 0 4px" }}>
              <div><div className="l">Mã truy cập</div><div className="d">Chỉ hiện MỘT LẦN — gửi cho học viên ngay</div></div>
            </div>
            <div className="prov-code">
              <code>{issued}</code>
              <button className="btn line sm" onClick={copyCode} aria-label="Sao chép mã">
                {copied ? <Check strokeWidth={2} /> : <Copy strokeWidth={1.9} />}
              </button>
            </div>
            <p className="prov-hint">
              Học viên nhập mã này ở trang đăng nhập lớp. Hệ thống không lưu lại mã gốc — mất thì cấp mã mới.
            </p>
            <button className="btn primary block" onClick={onClose}>Xong</button>
          </>
        ) : (
          <>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Độ tuổi học viên</label>
              <div className="seg" style={{ margin: 0 }}>
                <button className={!isMinor ? "on" : ""} disabled={pending} onClick={() => setIsMinor(false)}>Đủ 18 tuổi</button>
                <button className={isMinor ? "on" : ""} disabled={pending} onClick={() => setIsMinor(true)}>Chưa thành niên</button>
              </div>
            </div>

            {isMinor && (
              <>
                <div className="field" style={{ marginTop: 10 }}>
                  <label>Liên hệ phụ huynh</label>
                  <input value={guardian} onChange={(e) => setGuardian(e.target.value)} placeholder="SĐT / email phụ huynh" autoComplete="off" />
                </div>
                <label className="prov-confirm">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  <span>Tôi xác nhận đã có sự đồng ý của phụ huynh/người giám hộ.</span>
                </label>
              </>
            )}

            <div className="row2" style={{ marginTop: 14 }}>
              <button className="btn line block" disabled={pending} onClick={onClose}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={issue}>{pending ? "Đang cấp..." : "Cấp mã"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============ TAB: ĐIỂM DANH ============ */
function AttendanceTab({ classId, students, sessions, attendanceBySession, pending, start, router }: {
  classId: string; students: TcStudent[]; sessions: TcSession[];
  attendanceBySession: Record<string, TcAttendance[]>; pending: boolean; start: Start; router: Router;
}) {
  function delSes(id: string) {
    if (!confirm("Xóa buổi học này và toàn bộ điểm danh?")) return;
    start(async () => {
      await deleteSession(id, classId);
      setSel(sessions.filter((s) => s.id !== id)[0]?.id ?? "");
      router.refresh();
      toast("Đã xóa buổi học");
    });
  }
  const [sel, setSel] = useState<string>(sessions[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [dateAt, setDateAt] = useState(defaultSessionDate());
  const [topic, setTopic] = useState("");
  // Bản nháp điểm danh tại client; lưu khi bấm "Lưu điểm danh".
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});

  const session = sessions.find((s) => s.id === sel) ?? null;

  // Mỗi khi đổi buổi: nạp điểm danh đã lưu; HV chưa có bản ghi mặc định "có mặt".
  useEffect(() => {
    if (!session) { setMarks({}); return; }
    const saved = attendanceBySession[session.id] ?? [];
    const map: Record<string, AttStatus> = {};
    for (const st of students) {
      const row = saved.find((r) => r.studentId === st.id);
      map[st.id] = (row?.status as AttStatus) ?? "present";
    }
    setMarks(map);
  }, [session, students, attendanceBySession]);

  const presentCount = useMemo(() => Object.values(marks).filter((m) => m === "present").length, [marks]);

  function createSes() {
    if (!dateAt) { toast("Chọn ngày giờ buổi học", true); return; }
    const ms = new Date(dateAt).getTime();
    if (Number.isNaN(ms)) { toast("Ngày giờ không hợp lệ", true); return; }
    start(async () => {
      const r = await createSession({ classId, dateAt: ms, topic: topic.trim() || undefined });
      setCreating(false); setTopic("");
      if (r.ok) setSel(r.id);
      router.refresh();
      toast("Đã tạo buổi học");
    });
  }
  function allPresent() {
    const map: Record<string, AttStatus> = {};
    for (const st of students) map[st.id] = "present";
    setMarks(map);
  }
  function save() {
    if (!session) return;
    const entries = students.map((st) => ({ studentId: st.id, status: marks[st.id] ?? "present" }));
    start(async () => {
      await setAttendance(session.id, classId, entries);
      router.refresh();
      toast(`Đã lưu điểm danh · ${presentCount}/${students.length} có mặt`);
    });
  }

  return (
    <>
      <div className="card">
        <div className="field" style={{ marginBottom: creating ? 10 : 0 }}>
          <label>Buổi học</label>
          {sessions.length === 0 ? (
            <div className="d">Chưa có buổi nào — tạo buổi mới bên dưới.</div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select style={{ flex: 1 }} value={sel} onChange={(e) => setSel(e.target.value)}>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fmtDate(s.dateAt)} {fmtTime(s.dateAt)}{s.topic ? ` · ${s.topic}` : ""}
                  </option>
                ))}
              </select>
              {sel && (
                <button className="btn line sm" disabled={pending} onClick={() => delSes(sel)} aria-label="Xóa buổi học">
                  <Trash2 strokeWidth={1.9} />
                </button>
              )}
            </div>
          )}
        </div>

        {!creating ? (
          <button className="btn line block" style={{ marginTop: 10 }} disabled={pending} onClick={() => { setDateAt(defaultSessionDate()); setCreating(true); }}>
            <Plus strokeWidth={2} />Tạo buổi
          </button>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Ngày giờ</label>
              <input type="datetime-local" value={dateAt} onChange={(e) => setDateAt(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Chủ đề (không bắt buộc)</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="VD: Trực quan hóa dữ liệu" />
            </div>
            <div className="row2">
              <button className="btn line block" disabled={pending} onClick={() => setCreating(false)}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={createSes}>{pending ? "Đang lưu..." : "Lưu buổi"}</button>
            </div>
          </>
        )}
      </div>

      {session && (
        students.length === 0 ? (
          <div className="empty">Chưa có học viên — thêm ở tab “Học viên” trước khi điểm danh.</div>
        ) : (
          <>
            <div className="sec">
              <h2><span className="secdot" style={{ background: "var(--module-teach)" }} /><ClipboardCheck strokeWidth={1.8} style={{ width: 15, height: 15 }} />Điểm danh</h2>
              <span className="cnt">{presentCount}/{students.length} có mặt</span>
            </div>

            <button className="btn line block sm" style={{ marginBottom: 8 }} disabled={pending} onClick={allPresent}>
              <CheckCheck strokeWidth={1.9} />Tất cả có mặt
            </button>

            <div className="card">
              {students.map((st) => (
                <div className="setrow" key={st.id} style={{ flexWrap: "wrap", gap: 8 }}>
                  <div className="l" style={{ flex: 1, minWidth: 120 }}>{st.name}</div>
                  <div className="seg" style={{ margin: 0, flex: "1 1 200px" }}>
                    {ATT.map((a) => (
                      <button
                        key={a.key}
                        className={marks[st.id] === a.key ? "on" : ""}
                        disabled={pending}
                        onClick={() => setMarks((p) => ({ ...p, [st.id]: a.key }))}
                      >{a.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn primary block" style={{ marginTop: 4 }} disabled={pending} onClick={save}>
              {pending ? "Đang lưu..." : "Lưu điểm danh"}
            </button>
          </>
        )
      )}
    </>
  );
}

/* ============ TAB: CHẤM BÀI ============ */
function GradingTab({ classId, students, assignments, gradesByAssignment, submissionsByAssignment, submissionStats, pending, start, router }: {
  classId: string; students: TcStudent[]; assignments: TcAssignment[];
  gradesByAssignment: Record<string, TcGrade[]>;
  submissionsByAssignment: Record<string, SubmissionRow[]>;
  submissionStats: Record<string, SubmissionStat>;
  pending: boolean; start: Start; router: Router;
}) {
  function delAsg(id: string) {
    if (!confirm("Xóa bài tập này và toàn bộ điểm đã chấm?")) return;
    start(async () => {
      await deleteAssignment(id, classId);
      setSel(assignments.filter((a) => a.id !== id)[0]?.id ?? "");
      router.refresh();
      toast("Đã xóa bài tập");
    });
  }
  const [sel, setSel] = useState<string>(assignments[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState(10);

  // Sheet nhập điểm cho 1 học viên.
  const [openSid, setOpenSid] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const assignment = assignments.find((a) => a.id === sel) ?? null;
  const grades = assignment ? gradesByAssignment[assignment.id] ?? [] : [];
  const gradeOf = (sid: string) => grades.find((g) => g.studentId === sid) ?? null;
  // Bài nộp của bài tập đang chọn → map theo studentId (mới nhất nếu nhiều).
  const submissions = assignment ? submissionsByAssignment[assignment.id] ?? [] : [];
  const submissionOf = (sid: string): SubmissionRow | null => {
    const subs = submissions.filter((s) => s.studentId === sid);
    if (subs.length === 0) return null;
    return [...subs].sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))[0];
  };
  const openStudent = openSid ? students.find((s) => s.id === openSid) ?? null : null;
  const max = assignment?.maxScore ?? 10;

  const gradedCount = grades.filter((g) => g.score != null).length;

  // Khi mở sheet 1 HV: nạp điểm/nhận xét hiện có.
  useEffect(() => {
    if (!openStudent) return;
    const g = gradeOf(openStudent.id);
    setScore(g?.score != null ? String(g.score) : "");
    setFeedback(g?.feedback ?? "");
  }, [openSid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc đóng sheet.
  useEffect(() => {
    if (!openSid) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenSid(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSid]);

  function createAsg() {
    const t = title.trim();
    if (!t) { toast("Nhập tên bài tập", true); return; }
    start(async () => {
      const r = await createAssignment({ classId, title: t, maxScore });
      setCreating(false); setTitle(""); setMaxScore(10);
      if (r.ok) setSel(r.id);
      router.refresh();
      toast("Đã tạo bài tập");
    });
  }

  function insertTemplate() {
    if (!openStudent) return;
    setFeedback(FEEDBACK_TPL.replace("[tên]", openStudent.name));
  }

  function saveGrade() {
    if (!assignment || !openStudent) return;
    const raw = score.trim();
    let num: number | null = null;
    if (raw !== "") {
      num = Number(raw);
      if (Number.isNaN(num)) { toast("Điểm không hợp lệ", true); return; }
      if (num < 0 || num > max) { toast(`Điểm phải trong khoảng 0–${max}`, true); return; }
    }
    start(async () => {
      await setGrade({ assignmentId: assignment.id, studentId: openStudent.id, classId, score: num, feedback: feedback.trim() || null });
      setOpenSid(null);
      router.refresh();
      toast("Đã lưu điểm & nhận xét");
    });
  }

  return (
    <>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Bài tập</label>
          {assignments.length === 0 ? (
            <div className="d">Chưa có bài tập nào — tạo bài mới bên dưới.</div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select style={{ flex: 1 }} value={sel} onChange={(e) => setSel(e.target.value)}>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title} · thang {a.maxScore}</option>
                ))}
              </select>
              {sel && (
                <button className="btn line sm" disabled={pending} onClick={() => delAsg(sel)} aria-label="Xóa bài tập">
                  <Trash2 strokeWidth={1.9} />
                </button>
              )}
            </div>
          )}
        </div>

        {!creating ? (
          <button className="btn line block" style={{ marginTop: 10 }} disabled={pending} onClick={() => setCreating(true)}>
            <Plus strokeWidth={2} />Tạo bài tập
          </button>
        ) : (
          <>
            <div className="field" style={{ margin: "10px 0 8px" }}>
              <label>Tên bài tập</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Dashboard cuối khóa" />
            </div>
            <div className="setrow" style={{ border: "none", padding: "4px 0 12px" }}>
              <div><div className="l">Điểm tối đa</div><div className="d">thang điểm chấm</div></div>
              <div className="stepper">
                <button onClick={() => setMaxScore((v) => Math.max(1, v - 1))} aria-label="Giảm thang điểm">–</button>
                <span className="v">{maxScore}</span>
                <button onClick={() => setMaxScore((v) => Math.min(100, v + 1))} aria-label="Tăng thang điểm">+</button>
              </div>
            </div>
            <div className="row2">
              <button className="btn line block" disabled={pending} onClick={() => setCreating(false)}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={createAsg}>{pending ? "Đang lưu..." : "Lưu bài tập"}</button>
            </div>
          </>
        )}
      </div>

      {assignment && (
        students.length === 0 ? (
          <div className="empty">Chưa có học viên — thêm ở tab “Học viên” trước khi chấm bài.</div>
        ) : (
          <>
            {submissionStats[assignment.id] && submissionStats[assignment.id].totalStudents > 0 && (
              <div className="assign-stats">
                <div className="assign-stats-bar-wrap">
                  <div
                    className="assign-stats-bar"
                    style={{ width: `${Math.round((submissionStats[assignment.id].submittedCount / submissionStats[assignment.id].totalStudents) * 100)}%` }}
                  />
                </div>
                <div className="assign-stats-label">
                  {submissionStats[assignment.id].submittedCount}/{submissionStats[assignment.id].totalStudents} học viên đã nộp
                  {submissionStats[assignment.id].pendingGradeCount > 0 && (
                    <span className="chip warn" style={{ marginLeft: 8 }}>{submissionStats[assignment.id].pendingGradeCount} chờ chấm</span>
                  )}
                </div>
              </div>
            )}
            <div className="sec">
              <h2><span className="secdot" style={{ background: "var(--module-teach)" }} /><FileText strokeWidth={1.8} style={{ width: 15, height: 15 }} />Bảng điểm</h2>
              <span className="cnt">{gradedCount}/{students.length} đã chấm</span>
            </div>
            <div className="card">
              {students.map((st) => {
                const g = gradeOf(st.id);
                const sub = submissionOf(st.id);
                return (
                  <div key={st.id} className="setrow" style={{ gap: 8 }}>
                    <button
                      className="grow"
                      style={{ minWidth: 0, flex: 1, background: "none", border: "none", textAlign: "left", padding: 0, cursor: "pointer" }}
                      onClick={() => setOpenSid(st.id)}
                    >
                      <div className="l">{st.name}</div>
                      {sub ? (
                        <div className="d" style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub.originalName ?? undefined}>
                          <FileText strokeWidth={1.8} style={{ width: 12, height: 12, flex: "none" }} />
                          đã nộp{sub.status === "late" ? " (muộn)" : ""}: {sub.originalName ?? "tệp"}
                        </div>
                      ) : g?.feedback ? (
                        <div className="d" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.feedback}</div>
                      ) : (
                        <div className="d">chưa nộp bài</div>
                      )}
                    </button>
                    {sub && (
                      <a
                        className="btn line sm"
                        href={`/api/teaching/submission/${sub.id}`}
                        download
                        aria-label={`Tải bài nộp của ${st.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download strokeWidth={1.9} />
                      </a>
                    )}
                    {g?.score != null
                      ? <span className="chip score">{g.score}/{max}</span>
                      : <span className="chip st">chưa chấm</span>}
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      {openStudent && assignment && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpenSid(null); }}>
          <div className="sheet" role="dialog" aria-label={`Chấm bài ${openStudent.name}`}>
            <h3>{openStudent.name}</h3>
            <div className="setrow">
              <div><div className="l">Bài tập</div><div className="d">đang chấm</div></div>
              <span className="chip teach">{assignment.title}</span>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Điểm (0–{max})</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={max}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={`0 – ${max}`}
              />
            </div>

            <div className="field">
              <label>Nhận xét</label>
              <textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Nhận xét cho học viên..." />
            </div>
            <button className="btn line block sm" style={{ marginBottom: 12 }} onClick={insertTemplate}>Chèn mẫu nhận xét</button>

            <div className="row2">
              <button className="btn line block" disabled={pending} onClick={() => setOpenSid(null)}>Đóng</button>
              <button className="btn primary block" disabled={pending} onClick={saveGrade}>{pending ? "Đang lưu..." : "Lưu điểm"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============ TAB: TÀI LIỆU ============ */
function MaterialsTab({ classId, materials, pending, start, router }: {
  classId: string; materials: TcMaterial[]; pending: boolean; start: Start; router: Router;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  function add() {
    const t = title.trim();
    const u = url.trim();
    if (!t) { toast("Nhập tiêu đề tài liệu", true); return; }
    if (!u) { toast("Dán link tài liệu/video", true); return; }
    start(async () => {
      const r = await addMaterialLink({ classId, title: t, url: u });
      if (!r.ok) { toast(r.error ?? "Không thêm được", true); return; }
      setTitle(""); setUrl(""); setAdding(false);
      router.refresh();
      toast("Đã thêm tài liệu");
    });
  }
  function del(m: TcMaterial) {
    if (!confirm(`Xóa tài liệu "${m.title}"?`)) return;
    start(async () => {
      await deleteMaterial(m.id, classId);
      router.refresh();
      toast("Đã xóa tài liệu");
    });
  }

  return (
    <>
      <div className="card">
        {!adding ? (
          <button className="btn line block" disabled={pending} onClick={() => setAdding(true)}>
            <Plus strokeWidth={2} />Thêm tài liệu / video
          </button>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Tiêu đề</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bài giảng tuần 1 — Biến & vòng lặp" />
            </div>
            <div className="field" style={{ marginBottom: 6 }}>
              <label>Đường dẫn (YouTube, Vimeo, Google Drive, hoặc link tài liệu)</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/..." autoComplete="off" />
            </div>
            <p className="d" style={{ margin: "0 0 10px" }}>Link YouTube/Vimeo/Drive sẽ hiện video xem ngay trong cổng học viên.</p>
            <div className="row2">
              <button className="btn line block" disabled={pending} onClick={() => { setAdding(false); setTitle(""); setUrl(""); }}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={add}>{pending ? "Đang lưu..." : "Lưu tài liệu"}</button>
            </div>
          </>
        )}
      </div>

      <div className="sec">
        <h2><span className="secdot" style={{ background: "var(--module-teach)" }} /><BookOpen strokeWidth={1.8} style={{ width: 15, height: 15 }} />Tài liệu lớp</h2>
        <span className="cnt">{materials.length}</span>
      </div>
      {materials.length === 0 ? (
        <div className="empty">Chưa có tài liệu — thêm link bài giảng/video ở trên để học viên xem trong cổng.</div>
      ) : (
        <div className="card">
          {materials.map((m) => {
            const embed = getEmbed(m.url);
            return (
              <div className="setrow" key={m.id} style={{ gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="l" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                  <div className="d" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {embed ? (<><Video strokeWidth={1.8} style={{ width: 12, height: 12 }} />Video · {embed.kind}</>)
                      : m.url ? (<><Link2 strokeWidth={1.8} style={{ width: 12, height: 12 }} />Liên kết</>)
                      : (<><FileText strokeWidth={1.8} style={{ width: 12, height: 12 }} />Tệp</>)}
                  </div>
                </div>
                {m.url && (
                  <a className="btn line sm" href={m.url} target="_blank" rel="noopener noreferrer" aria-label="Mở tài liệu"><ExternalLink strokeWidth={1.9} /></a>
                )}
                <button className="btn line sm" disabled={pending} onClick={() => del(m)} aria-label={`Xóa ${m.title}`}><Trash2 strokeWidth={1.9} /></button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
