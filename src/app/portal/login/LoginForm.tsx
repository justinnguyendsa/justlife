"use client";

import { useState, useTransition } from "react";
import { KeyRound, AlertCircle, LogIn } from "lucide-react";
import { loginWithCode } from "./actions";

// Form đăng nhập bằng MÃ TRUY CẬP (client island). useTransition để hiện trạng thái đang xử lý.
// Gọi server action loginWithCode → nó tự signIn + redirect khi đúng; trả lỗi tiếng Việt khi sai.
// KHÔNG tự kiểm mã ở client (bảo mật ở server). KHÔNG lộ "mã tồn tại hay không".
// googleEnabled: server component truyền xuống — true khi có AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET.

export function LoginForm({ googleEnabled }: { googleEnabled?: boolean }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await loginWithCode(null, formData);
      // Chỉ tới đây khi KHÔNG redirect (tức là có lỗi). Đúng mã → server đã redirect, không trả về.
      if (res?.error) setError(res.error);
    });
  }

  function handleGoogleLogin() {
    startTransition(async () => {
      const { loginWithGoogle } = await import("./actions");
      await loginWithGoogle();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <div className="portal-err" role="alert">
          <AlertCircle strokeWidth={2} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="code">Mã truy cập</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          placeholder="VD: ABCD-2345"
          aria-label="Mã truy cập"
          required
          disabled={pending}
        />
      </div>

      <button type="submit" className="btn primary block" disabled={pending}>
        <LogIn strokeWidth={2} aria-hidden />
        {pending ? "Đang kiểm tra…" : "Vào lớp học"}
      </button>

      <p className="hint">
        <KeyRound strokeWidth={2} aria-hidden className="hint-ic" />
        Nhập mã do giảng viên cấp.
      </p>

      {googleEnabled && (
        <>
          <div className="portal-or">
            <span>hoặc</span>
          </div>
          <button
            type="button"
            id="btn-google-signin"
            className="btn line block"
            disabled={pending}
            onClick={handleGoogleLogin}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập bằng Gmail
          </button>
        </>
      )}
    </form>
  );
}
