import Link from "next/link";
import { NavLinks } from "@/components/Nav";
import { AddTask } from "@/components/AddTask";
import { Toaster } from "@/components/Toaster";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModeSwitch } from "@/components/ModeSwitch";
import { OwnerMenu } from "@/components/OwnerMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r px-3 py-5 md:flex">
        <Link href="/today" className="px-3 pb-5 text-xl font-extrabold">
          just<b className="text-primary">life</b>
        </Link>
        <nav>
          <NavLinks variant="side" />
        </nav>
        <div className="mt-auto flex flex-col items-start gap-2 pt-4">
          <ThemeToggle />
          <OwnerMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[880px] px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-8">
          <ModeSwitch />
          {children}
        </main>
      </div>

      <NavLinks variant="bottom" />
      <AddTask />
      <Toaster />
    </div>
  );
}
