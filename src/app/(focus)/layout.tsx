import { Toaster } from "@/components/Toaster";

// Khung Tập trung (SPEC-UI-P2.4 F01): toàn màn hình, không thanh bên / thanh dưới — "tắt bớt thế giới".
// Quyền truy cập vẫn do middleware chặn theo đường dẫn /focus (route group không ảnh hưởng URL).
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      {children}
      <Toaster />
    </div>
  );
}
