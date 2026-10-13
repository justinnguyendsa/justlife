"use client";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Coffee, Pause, Play, Plus, Shuffle } from "lucide-react";

import type { Task } from "@/db/schema";
import { addRest } from "@/app/actions/habits";
import { createTask, setTaskStatus } from "@/app/actions/tasks";
import { areaBadge, areaTitle } from "@/lib/areas";
import { countdown, dateKey, fmtDuration } from "@/lib/format";
import {
  SESSION_MS,
  SESSIONS_PER_DAY,
  addStats,
  type FocusClock,
  fmtClock,
  loadStats,
  loadTimer,
  pauseTimer,
  progressPct,
  remainingOf,
  resumeTimer,
  saveTimer,
  startTimer,
} from "@/lib/focus-timer";
import { toast } from "@/components/Toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Clock = FocusClock;

const subscribeNothing = () => () => {};

// Màn Tập trung (SPEC-UI-P2.4): một việc + đồng hồ 25 phút + ghi nhanh vào Hộp việc.
// Đồng hồ tính theo endsAt (tab ẩn vẫn đúng giờ), nhớ trong sessionStorage; số phút/phiên trong ngày ở localStorage.
// `persist={false}`: bản xem trước ở /ui-kit — không đọc/ghi bộ nhớ trình duyệt, không cộng thống kê.
export function FocusClient({ doing, next, persist = true }: { doing: Task[]; next: Task | null; persist?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [clock, setClock] = useState<Clock | null>(() => {
    if (typeof window === "undefined") return null;
    const t = Date.now();
    const saved = persist ? loadTimer() : null;
    // Đồng hồ cũ của ngày khác thì bỏ — không cộng phút hôm qua vào hôm nay.
    if (saved && dateKey(saved.segStart) === dateKey(t)) return saved;
    return doing[0] ? { ...startTimer(doing[0].id, t), segStart: t } : null;
  });
  const [stats, setStats] = useState(() => (typeof window === "undefined" || !persist ? { sessions: 0, minutes: 0 } : loadStats(dateKey())));
  const [idea, setIdea] = useState("");
  const clockRef = useRef(clock);
  const capturing = useRef(false);

  const task = doing[index % Math.max(1, doing.length)] ?? null;

  // Ghi đồng hồ mỗi khi đổi trạng thái; ref dùng cho nhịp 1 giây (đọc giá trị mới nhất).
  useEffect(() => {
    clockRef.current = clock;
    if (persist) saveTimer(clock);
  }, [clock, persist]);

  // Nhịp 1 giây + phát hiện hết phiên (so endsAt với giờ thật).
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const c = clockRef.current;
      if (c && c.running && !c.ended && c.endsAt <= t) {
        if (persist) setStats(addStats(dateKey(t), { sessions: 1, minutes: (c.endsAt - c.segStart) / 60_000 }));
        setClock({ ...pauseTimer(c, c.endsAt), remainingMs: 0, ended: true, segStart: c.endsAt });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [persist]);

  // Chỉ dùng đồng hồ sau khi gắn vào trình duyệt — server luôn thấy 25:00 (tránh lệch hydrate khi khôi phục).
  const remaining = mounted && clock ? remainingOf(clock, now) : SESSION_MS;
  const ended = mounted && Boolean(clock?.ended);
  const running = mounted && Boolean(clock?.running) && !ended;
  const liveMin = stats.minutes + (running && clock ? Math.max(0, now - clock.segStart) / 60_000 : 0);
  const sessionNo = Math.min(stats.sessions + (ended ? 0 : 1), SESSIONS_PER_DAY);

  // Cộng phần đã chạy của đoạn hiện tại vào thống kê ngày, rồi đặt mốc mới.
  const bank = (c: Clock, t: number) => {
    if (persist && c.running && !c.ended) setStats(addStats(dateKey(t), { minutes: Math.max(0, t - c.segStart) / 60_000 }));
  };

  const togglePause = () => {
    const t = Date.now();
    if (!clock) {
      if (task) setClock({ ...startTimer(task.id, t), segStart: t });
      return;
    }
    if (running) {
      bank(clock, t);
      setClock({ ...pauseTimer(clock, t), segStart: t });
    } else {
      setClock({ ...resumeTimer(clock, t), segStart: t });
    }
  };

  const newSession = () => {
    const t = Date.now();
    setClock({ ...startTimer(task?.id ?? "", t), segStart: t });
  };

  const rest5 = () =>
    start(async () => {
      try {
        const r = await addRest({ minutes: 5 });
        if (!r?.ok) return toast("Chưa ghi được giờ nghỉ, thử lại nhé", true);
        toast("Đã ghi 5 phút nghỉ — đứng dậy, uống nước nhé");
        newSession();
      } catch {
        toast("Chưa ghi được — kiểm tra kết nối rồi thử lại", true);
      }
    });

  const done = () => {
    if (!task) return;
    start(async () => {
      try {
        const r = await setTaskStatus(task.id, "done");
        if (!r.ok) return toast("Chưa lưu được, thử lại nhé", true);
        const c = clockRef.current;
        const t = Date.now();
        if (c && c.running && !c.ended) {
          bank(c, t);
          // Hết việc đang làm thì dừng đồng hồ; còn việc thì phiên chạy tiếp với việc kế.
          setClock(doing.length > 1 ? { ...c, segStart: t } : null);
        } else if (doing.length <= 1) {
          setClock(null);
        }
        toast(`Đã xong: ${task.title}`);
        setIndex(0);
        router.refresh();
      } catch {
        toast("Chưa lưu được — kiểm tra kết nối rồi thử lại", true);
      }
    });
  };

  const switchTask = () => {
    if (doing.length > 1) setIndex((i) => (i + 1) % doing.length);
    else router.push("/tasks");
  };

  const capture = () => {
    const title = idea.trim();
    if (!title || capturing.current) return;
    capturing.current = true;
    setIdea(""); // xoá ngay để Enter lần hai không tạo việc trùng
    const restore = () => setIdea((cur) => cur || title);
    start(async () => {
      try {
        const r = await createTask({ title, area: task?.area ?? "work", deadlineAt: null, effort: null, impact: null });
        if (r && "ok" in r && !r.ok) {
          restore();
          return toast("Chưa ghi được ý này, thử lại nhé", true);
        }
        toast("Đã ghi vào Hộp việc — quay lại việc đang làm thôi");
      } catch {
        restore();
        toast("Chưa ghi được — kiểm tra kết nối rồi thử lại", true);
      } finally {
        capturing.current = false;
      }
    });
  };

  const dl = task?.deadlineAt != null ? countdown(task.deadlineAt, now) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 px-3 pt-4 md:px-7 md:pt-5">
        <Button asChild variant="ghost" size="sm" className="h-11 md:h-9">
          <Link href="/today"><ChevronLeft aria-hidden="true" />Thoát tập trung</Link>
        </Button>
        {mounted && (
          <span className="text-muted-foreground pr-2 text-xs md:text-[13px]">
            Phiên {sessionNo} trên {SESSIONS_PER_DAY}
            <span className="hidden md:inline"> · nghỉ 5 phút sau phiên này</span>
          </span>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center gap-7 px-6 py-8 text-center">
        {!task ? (
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Không có việc nào đang làm</h1>
            <p className="text-muted-foreground text-sm">Chọn một việc để bắt đầu phiên tập trung.</p>
            <div className="flex gap-2">
              <Button asChild className="h-11 md:h-10"><Link href="/today">Về Hôm nay</Link></Button>
              <Button asChild variant="outline" className="h-11 md:h-10"><Link href="/tasks">Mở Việc</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <span className="text-muted-foreground text-xs font-semibold">Đang tập trung vào một việc</span>
              <h1 className="max-w-[640px] text-2xl leading-8 font-bold tracking-tight md:text-[32px] md:leading-10">{task.title}</h1>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Badge variant={areaBadge(task.area)}>{areaTitle(task.area)}</Badge>
                {dl && <Badge variant={dl.level === "over" ? "danger" : "warn"} className="font-mono">{dl.label}</Badge>}
              </div>
            </div>

            <div className="flex w-full max-w-[420px] flex-col items-center gap-3" aria-live="off">
              <span className="font-mono text-[72px] leading-[76px] font-bold tabular-nums md:text-[96px] md:leading-[100px]" role="timer" aria-label={`Còn ${fmtClock(remaining)}`}>
                {mounted ? fmtClock(remaining) : "25:00"}
              </span>
              <div role="progressbar" aria-label="Tiến độ phiên" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct(remaining)} className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div className="bg-highlight h-full rounded-full transition-[width] duration-1000" style={{ width: `${mounted ? progressPct(remaining) : 0}%` }} />
              </div>
              <span className="text-muted-foreground text-[13px]">
                {ended ? "Hết phiên — nghỉ 5 phút rồi làm tiếp nhé" : `còn ${Math.ceil(remaining / 60_000)} phút trong phiên 25 phút`}
              </span>
            </div>

            {ended ? (
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <Button className="h-11 md:h-10 md:min-w-[180px]" onClick={rest5} disabled={pending}><Coffee aria-hidden="true" />Nghỉ 5 phút</Button>
                <Button variant="outline" className="h-11 md:h-10" onClick={newSession}><Play aria-hidden="true" />Phiên tiếp</Button>
                <Button variant="ghost" className="h-11 md:h-10" onClick={done} disabled={pending}><Check aria-hidden="true" />Xong việc này</Button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
                <Button variant="outline" className="order-2 h-11 md:order-1 md:h-10 md:min-w-[140px]" onClick={togglePause} disabled={!mounted}>
                  {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  {running ? "Tạm dừng" : mounted && !clock ? "Bắt đầu" : "Tiếp tục"}
                </Button>
                <Button className="order-1 h-11 md:order-2 md:h-10 md:min-w-[200px]" onClick={done} disabled={pending}>
                  <Check aria-hidden="true" />
                  Xong việc này
                </Button>
                <Button variant="ghost" className="order-3 h-11 md:h-10" onClick={switchTask}>
                  <Shuffle aria-hidden="true" />
                  Đổi việc khác
                </Button>
              </div>
            )}

            <form
              className="bg-card flex w-full max-w-[560px] items-center gap-3 rounded-lg border p-3 text-left"
              onSubmit={(e) => { e.preventDefault(); capture(); }}
            >
              <Plus className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
              <label htmlFor="focus-idea" className="text-muted-foreground hidden text-[13px] whitespace-nowrap sm:block">Nảy ra ý khác?</label>
              <Input id="focus-idea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ghi vào Hộp việc rồi quay lại" className="h-11 flex-1 md:h-9" aria-label="Ghi nhanh ý mới vào Hộp việc" />
              <kbd className="text-muted-foreground hidden rounded-sm border px-1.5 text-[11px] leading-5 font-semibold md:inline">Enter</kbd>
            </form>
            <span className="text-muted-foreground -mt-4 text-xs">Ghi vào Hộp việc rồi quay lại ngay — không cần rời màn này.</span>
          </>
        )}
      </main>

      <footer className="flex flex-col gap-1 border-t px-4 py-4 text-[13px] md:flex-row md:items-center md:justify-between md:px-7">
        <span className="text-muted-foreground truncate">
          Tiếp theo: <span className="text-foreground font-semibold">{(doing.length > 1 ? doing[(index + 1) % doing.length]?.title : next?.title) ?? "—"}</span>
        </span>
        {mounted && (
          <span className="text-muted-foreground">
            Hôm nay đã tập trung <span className="text-foreground font-mono font-semibold">{fmtDuration(Math.floor(liveMin))}</span>
          </span>
        )}
      </footer>
    </div>
  );
}
