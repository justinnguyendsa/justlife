import Link from "next/link";
import { NavLinks } from "@/components/Nav";
import { AddTask } from "@/components/AddTask";
import { Toaster } from "@/components/Toaster";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModeSwitch } from "@/components/ModeSwitch";
import { OwnerMenu } from "@/components/OwnerMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/today" className="brand">just<b>life</b></Link>
        <nav>
          <NavLinks variant="side" />
        </nav>
        <div className="sidebar-foot">
          <ThemeToggle />
          <OwnerMenu />
        </div>
      </aside>
      <div className="main">
        <main className="content"><ModeSwitch />{children}</main>
      </div>
      <NavLinks variant="bottom" />
      <AddTask />
      <Toaster />
    </div>
  );
}
