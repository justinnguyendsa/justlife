"use client";

import { AlertCircle, RotateCw } from "lucide-react";

// Error boundary khu học viên — KHÔNG lộ chi tiết kỹ thuật/đường dẫn server (chỉ thông báo chung tiếng Việt).

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card portal-errcard">
      <AlertCircle strokeWidth={2} aria-hidden className="portal-errcard-ic" />
      <h2>Không tải được dữ liệu</h2>
      <p>Đã có lỗi xảy ra. Vui lòng thử lại sau giây lát.</p>
      <button type="button" className="btn line sm" onClick={() => reset()}>
        <RotateCw strokeWidth={2} aria-hidden />
        Thử lại
      </button>
    </div>
  );
}
