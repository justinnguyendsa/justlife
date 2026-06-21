"use client";

import { useState, useTransition } from "react";
import { KeyRound, AlertCircle, LogIn } from "lucide-react";
import { loginWithCode } from "./actions";

// Form đăng nhập bằng MÃ TRUY CẬP (client island). useTransition để hiện trạng thái đang xử lý.
// Gọi server action loginWithCode → nó tự signIn + redirect khi đúng; trả lỗi tiếng Việt khi sai.
// KHÔNG tự kiểm mã ở client (bảo mật ở server). KHÔNG lộ "mã tồn tại hay không".

export function LoginForm() {
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
    </form>
  );
}
