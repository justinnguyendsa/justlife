import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { Task } from "@/db/schema";
import type { DeadlineEntry } from "@/db/deadlines";
import { DeadlineRow } from "@/components/DeadlineRow";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { TaskCard } from "@/components/TaskCard";
import { AREA_VAR } from "@/lib/areas";

export const metadata: Metadata = {
  title: "Bộ UI · justlife",
  description: "Trang tham chiếu design system — shadcn/ui.",
};

const TOKENS = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["success", "success-foreground"],
  ["warning", "warning-foreground"],
] as const;

const AREAS = [
  ["area-work", "Công việc"],
  ["area-teach", "Dạy học"],
  ["area-study", "Học tập"],
  ["area-growth", "Phát triển"],
] as const;

// Dữ liệu mẫu CỐ ĐỊNH (không đọc DB) chỉ để soi giao diện component thật.
const NOW = Date.UTC(2026, 8, 18, 3, 0, 0);

function sampleTask(over: Partial<Task>): Task {
  return {
    id: "demo",
    title: "Việc mẫu",
    note: null,
    area: "work",
    status: "todo",
    effort: 3,
    impact: 4,
    deadlineAt: null,
    priorityScore: 72,
    createdAt: NOW,
    updatedAt: NOW,
    doneAt: null,
    ...over,
  };
}

const SAMPLE_DEADLINES: DeadlineEntry[] = [
  {
    id: "d1",
    title: "Nộp bài tập Thống kê nhiều biến",
    area: "study",
    dueAt: NOW + 3 * 3600_000,
    source: "study",
    sub: "Phân tích dữ liệu",
    href: "#",
  },
  {
    id: "d2",
    title: "Gửi báo cáo tuần cho sếp",
    area: "work",
    dueAt: NOW - 2 * 3600_000,
    source: "task",
    sub: "Việc",
    href: "#",
  },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="rounded-xl border p-4">{children}</div>
    </section>
  );
}

export default function UiKitPage() {
  // Trang tham chiếu nội bộ — không lộ ra production.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Bộ UI — justlife · justudy</h1>
        <p className="text-muted-foreground text-sm">
          Trang tham chiếu design system. Mọi màu lấy từ biến trong{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">src/styles/tokens.css</code> — đổi
          theme chỉ sửa đúng một file đó.
        </p>
      </header>

      <Block title="Bảng màu ngữ nghĩa">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TOKENS.map(([bg, fg]) => (
            <div
              key={bg}
              className="flex h-16 flex-col justify-center rounded-lg border px-3"
              style={{ background: `var(--${bg})`, color: `var(--${fg})` }}
            >
              <span className="text-xs font-semibold">--{bg}</span>
              <span className="text-[10px] opacity-80">--{fg}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Mảng đời sống (chart tokens)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AREAS.map(([token, label]) => (
            <div key={token} className="space-y-2">
              <div className="h-12 rounded-lg" style={{ background: `var(--${token})` }} />
              <div className="text-xs font-medium">{label}</div>
              <div className="text-muted-foreground text-[10px]">--{token}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Button">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Mặc định</Button>
          <Button variant="secondary">Phụ</Button>
          <Button variant="outline">Viền</Button>
          <Button variant="ghost">Trong suốt</Button>
          <Button variant="link">Liên kết</Button>
          <Button variant="destructive">Xoá</Button>
          <Button variant="success">Hoàn thành</Button>
          <Button variant="warning">Cảnh báo</Button>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">
            <Plus /> Thêm việc
          </Button>
          <Button size="default">
            <CalendarDays /> Xếp lịch
          </Button>
          <Button size="lg">
            <Check /> Xong
          </Button>
          <Button size="icon" variant="outline" aria-label="Xoá">
            <Trash2 />
          </Button>
          <Button disabled>Vô hiệu</Button>
        </div>
      </Block>

      <Block title="Badge">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Mặc định</Badge>
          <Badge variant="secondary">Phụ</Badge>
          <Badge variant="outline">Viền</Badge>
          <Badge variant="destructive">Quá hạn</Badge>
          <Badge variant="success">Đúng hạn</Badge>
          <Badge variant="warning">Sắp tới</Badge>
          <Badge variant="work">Công việc</Badge>
          <Badge variant="teach">Dạy học</Badge>
          <Badge variant="study">Học tập</Badge>
          <Badge variant="growth">Phát triển</Badge>
        </div>
      </Block>

      <Block title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Ôn tiếng Anh</CardTitle>
            <CardDescription>Chuỗi 12 ngày liên tiếp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={68} />
            <p className="text-muted-foreground text-xs">68% mục tiêu tuần này</p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Ghi nhận</Button>
            <Button size="sm" variant="outline">
              Bỏ qua
            </Button>
          </CardFooter>
        </Card>
      </Block>

      <Block title="Form">
        <div className="max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t">Tên việc</Label>
            <Input id="t" placeholder="Ví dụ: Đọc 10 trang sách" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="n">Ghi chú</Label>
            <Textarea id="n" placeholder="Mô tả ngắn…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a">Mảng</Label>
            <Select>
              <SelectTrigger id="a" className="w-full">
                <SelectValue placeholder="Chọn mảng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Công việc</SelectItem>
                <SelectItem value="teach">Dạy học</SelectItem>
                <SelectItem value="study">Học tập</SelectItem>
                <SelectItem value="growth">Phát triển</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c" />
            <Label htmlFor="c">Việc quan trọng</Label>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="s">Nhắc trước 15 phút</Label>
            <Switch id="s" />
          </div>
        </div>
      </Block>

      <Block title="Tabs">
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Hôm nay</TabsTrigger>
            <TabsTrigger value="week">Tuần</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="text-muted-foreground pt-3 text-sm">
            Việc trong ngày.
          </TabsContent>
          <TabsContent value="week" className="text-muted-foreground pt-3 text-sm">
            Việc trong tuần.
          </TabsContent>
          <TabsContent value="all" className="text-muted-foreground pt-3 text-sm">
            Toàn bộ việc.
          </TabsContent>
        </Tabs>
      </Block>

      <Block title="Skeleton">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Block>

      <Block title="Component thật của app (đã migrate sang shadcn)">
        <PageHeader
          title="Hôm nay"
          sub="Thứ Sáu, 18/09 · 3 việc cần xong"
          action={<Button size="sm">Xếp lịch</Button>}
        />
        <Section color={AREA_VAR.work} title="ĐANG LÀM" cnt="1 việc" />
        <TaskCard
          task={sampleTask({
            title: "Chuẩn bị báo cáo tuần",
            status: "doing",
            deadlineAt: NOW + 5 * 3600_000,
          })}
          now={NOW}
        />
        <Section color={AREA_VAR.study} title="ƯU TIÊN CAO" cnt="2 việc" />
        <TaskCard
          task={sampleTask({
            title: "Đọc chương 4 — Hồi quy logistic",
            area: "study",
            priorityScore: 88,
          })}
          trailingScore
          now={NOW}
        />
        <TaskCard
          task={sampleTask({
            title: "Soạn đề kiểm tra lớp Python",
            area: "teach",
            priorityScore: null,
          })}
          now={NOW}
        />
        <Section color={AREA_VAR.growth} title="DEADLINE GẦN" cnt="2 mục" />
        {SAMPLE_DEADLINES.map((d) => (
          <DeadlineRow key={d.id} e={d} now={NOW} />
        ))}
      </Block>

      <Block title="Lớp cũ (compat) — tự nhận design system mới">
        <p className="text-muted-foreground mb-3 text-xs">
          Các class cũ (<code>.card</code>, <code>.btn</code>, <code>.chip</code>) vẫn chạy vì token
          cũ đã trỏ sang biến shadcn. Đây là phần sẽ thay dần bằng component ở trên.
        </p>
        <div className="card">
          <div className="task">
            <div className="bar" style={{ background: "var(--module-work)" }} />
            <div className="b">
              <div className="t">Chuẩn bị báo cáo tuần</div>
              <div className="meta">
                <span className="chip work">Công việc</span>
                <span className="chip dl">Hạn 17:00</span>
                <span className="chip st doing">Đang làm</span>
              </div>
            </div>
            <div className="pscore">8.5</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn primary">Nút chính</button>
          <button className="btn ghost">Nút nhạt</button>
          <button className="btn amber">Nút vàng</button>
          <button className="btn line">Nút viền</button>
        </div>
      </Block>
    </main>
  );
}
