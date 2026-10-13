import Link from "next/link";
import { NavLinks } from "@/components/Nav";
import { AddTask } from "@/components/AddTask";

// Khung khu cá nhân (SPEC-UI-P2.0 T05): thanh bên 232px trên web, thanh dưới 5 mục trên điện thoại.
// Không còn nút gạt "Cá nhân / Dạy học" — dạy học đi qua lối justudy ở thanh bên.
// Chế độ sáng/tối và Đăng xuất nằm trong Cài đặt (SPEC-UI-P2.5).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r px-3 py-4 md:flex">
        <Link href="/today" className="px-3 pt-1 pb-4 text-xl leading-7 font-bold tracking-tight">
          just<b className="text-primary font-bold">life</b>
        </Link>
        <NavLinks variant="side" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1120px] px-4 pt-2 pb-24 md:px-7 md:pt-0 md:pb-10">{children}</main>
      </div>

      <NavLinks variant="bottom" />
      <AddTask />
    </div>
  );
}
