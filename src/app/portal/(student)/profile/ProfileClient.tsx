"use client";

import { useState, useTransition } from "react";
import { GraduationCap, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { linkGoogleEmailAction } from "./actions";

// Client island: hiển thị hồ sơ học viên + form liên kết Gmail.
// KHÔNG đọc DB trực tiếp — dữ liệu từ server component (page.tsx).

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

/** Che bớt địa chỉ email: "ten@gmail.com" → "te***@gmail.com" */
function maskEmail(email: string | null): string {
  if (!email) return "";
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  return u.slice(0, 2) + "***@" + d;
}

export function ProfileClient({
  profile,
  stats,
}: {
  profile: Profile;
  stats: Stats;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await linkGoogleEmailAction(email);
      setMsg({
        ok: res.ok,
        text:
          res.error ??
          (res.ok
            ? "Liên kết thành công! Lần tới bạn có thể đăng nhập bằng Gmail."
            : ""),
      });
    });
  }

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
        {profile.gmailLinked ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2
              strokeWidth={2}
              style={{ color: "var(--ok, #16a34a)", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>Gmail đã liên kết</div>
              <div className="portal-sub">
                {maskEmail(profile.gmailEmail)} — Lần tới có thể đăng nhập
                bằng Gmail.
              </div>
            </div>
          </div>
        ) : (
          <>
            <p
              style={{
                marginBottom: 12,
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Đăng ký Gmail để lần sau đăng nhập dễ hơn (không cần mã truy
              cập).
            </p>
            {msg && (
              <div
                className={`portal-err${msg.ok ? " ok" : ""}`}
                role="alert"
                style={{ marginBottom: 12 }}
              >
                {msg.ok ? (
                  <CheckCircle2 strokeWidth={2} aria-hidden />
                ) : (
                  <AlertCircle strokeWidth={2} aria-hidden />
                )}
                <span>{msg.text}</span>
              </div>
            )}
            <form onSubmit={handleLink}>
              <div className="field">
                <label htmlFor="gmail">Địa chỉ Gmail</label>
                <input
                  id="gmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@gmail.com"
                  required
                  disabled={pending}
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                className="btn primary block"
                disabled={pending}
              >
                <Link2 strokeWidth={2} aria-hidden />
                {pending ? "Đang lưu…" : "Liên kết Gmail"}
              </button>
            </form>
          </>
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
