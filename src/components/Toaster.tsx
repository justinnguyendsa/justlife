"use client";

import { toast as sonnerToast } from "sonner";

export { Toaster } from "@/components/ui/sonner";

/**
 * Giữ nguyên chữ ký cũ `toast(message, warn?)` để ~10 nơi gọi không phải sửa,
 * nhưng bên dưới đã chạy bằng sonner (chuẩn shadcn) thay cho toast tự viết.
 */
export function toast(message: string, warn = false) {
  if (warn) sonnerToast.error(message);
  else sonnerToast.success(message);
}

/** Truy cập đầy đủ API sonner khi cần (loading, promise, action...). */
export { sonnerToast };
