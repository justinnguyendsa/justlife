"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle2, AlertCircle, Link2, Unlink } from "lucide-react";
import { startGmailLink, unlinkGmail } from "./actions";

// Client island: hiển thị hồ sơ học viên + liên kết Gmail QUA GOOGLE (SPEC-SEC-1.2 S11).
// KHÔNG đọc DB trực tiếp — dữ liệu từ server component (page.tsx); email nhận vào đã che sẵn.

export type LinkNotice = { ok: boolean; text: string };

type Profile = {
  name: string;
  studentId: string;
  classes: { id: string; name: string; term: string | null; status: string }[];
  gmailLinked: boolean;
  gmailEmail: string | null;
};
type Stats = {
  submittedCount: number;
  avgScore: number | null;
  attendedCount: number;
};

export function ProfileClient({
  profile,
  stats,
  googleEnabled,
  notice,
}: {
  profile: Profile;
  stats: Stats;
  googleEnabled: boolean;
  notice: LinkNotice | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<LinkNotice | null>(notice);
  const [pending, start] = useTransition();

  function handleUnlink() {
    setMsg(null);
    start(async () => {
      const res = await unlinkGmail();
      setMsg(res.ok ? { ok: true, text: "Đã gỡ liên kết Gmail. Mã truy cập vẫn dùng được." } : { ok: false, text: res.error ?? "Chưa gỡ được, thử lại nhé." });
      if (res.ok) router.refresh();
    });
  }

  const notice_ = msg && (
    <div className={`portal-err${msg.ok ? " ok" : ""}`} role="alert" style={{ marginBottom: 12 }}>
      {msg.ok ? <CheckCircle2 strokeWidth={2} aria-hidden /> : <AlertCircle strokeWidth={2} aria-hidden />}
      <span>{msg.text}</span>
    </div>
  );

  return (
    <>
      {/* Avatar + tên */}
      <div className="portal-hello">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--module-teach)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {profile.name?.[0]?.toUpperCase() ?? "?"}
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>{profile.name}</h1>
            <p className="sub" style={{ margin: 0 }}>
              ID: {profile.studentId.slice(0, 8)}…
            </p>
          </div>
        </div>
      </div>

      {/* Thống kê 28 ngày */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="portal-stats">
          <div className="portal-stat">
            <div className="portal-stat-n">{stats.submittedCount}</div>
            <div className="portal-stat-l">bài đã nộp</div>
          </div>
          <div className="portal-stat">
            <div className="portal-stat-n">{stats.avgScore ?? "—"}</div>
            <div className="portal-stat-l">điểm TB</div>
          </div>
          <div className="portal-stat">
            <div className="portal-stat-n">{stats.attendedCount}</div>
            <div className="portal-stat-l">buổi có mặt</div>
          </div>
        </div>
      </div>

      {/* Lớp đang học */}
      <div className="sec">
        <h2>
          <span className="secdot portal-secdot-teach" />
          Đang học
        </h2>
      </div>
      <div className="stack" style={{ marginBottom: 12 }}>
        {profile.classes.length === 0 ? (
          <div className="empty">Chưa có lớp nào.</div>
        ) : (
          profile.classes.map((c) => (
            <div key={c.id} className="card portal-row">
              <GraduationCap
                strokeWidth={2}
                className="portal-row-ic"
                aria-hidden
              />
              <div className="grow">
                <div className="t portal-strong">{c.name}</div>
                <div className="portal-sub">
                  {c.term ?? "Lớp học"}
                  {c.status === "archived" ? " · đã lưu trữ" : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Liên kết Gmail */}
      <div className="sec">
        <h2>
          <span
            className="secdot"
            style={{ background: "var(--module-teach)" }}
          />
          Liên kết Gmail
        </h2>
      </div>
      <div className="card">
        {notice_}
        {profile.gmailLinked ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <CheckCircle2 strokeWidth={2} style={{ color: "var(--success)", flexShrink: 0 }} aria-hidden />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>Gmail đã liên kết</div>
              <div className="portal-sub">{profile.gmailEmail} · đã xác minh qua Google</div>
            </div>
            <button type="button" className="btn line sm" onClick={handleUnlink} disabled={pending}>
              <Unlink strokeWidth={2} aria-hidden />
              {pending ? "Đang gỡ…" : "Gỡ liên kết"}
            </button>
          </div>
        ) : googleEnabled ? (
          <>
            <p className="portal-sub" style={{ marginBottom: 12 }}>
              Liên kết Gmail để lần sau đăng nhập không cần mã truy cập. Google sẽ hỏi bạn chọn đúng tài khoản Gmail của mình.
            </p>
            <form action={startGmailLink}>
              <button type="submit" className="btn primary block">
                <Link2 strokeWidth={2} aria-hidden />
                Liên kết bằng Google
              </button>
            </form>
          </>
        ) : (
          <p className="portal-sub">Đăng nhập bằng Gmail chưa được bật. Bạn vẫn dùng mã truy cập như bình thường.</p>
        )}
      </div>

      {/* Đăng xuất */}
      <div className="portal-cta" style={{ marginTop: 16 }}>
        <a
          href="/portal/signout"
          className="btn line"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Đăng xuất
        </a>
      </div>
    </>
  );
}
