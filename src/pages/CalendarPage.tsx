import { useState, useMemo } from 'react';
import { useTaskStore } from '../hooks/useTaskStore';
import Badge from '../components/ui/Badge';
import type { Task } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_NAMES_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  // Fill leading blanks (0 = Sunday, start week from Sunday like Google Calendar)
  for (let i = 0; i < first.getDay(); i++) {
    const d = new Date(year, month, 1 - (first.getDay() - i));
    days.push(d);
  }
  const last = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= last; i++) days.push(new Date(year, month, i));
  // Fill trailing blanks to complete last row
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return days;
}

function getWeekDays(date: Date): Date[] {
  const week: Date[] = [];
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // go to Sunday
  for (let i = 0; i < 7; i++) {
    week.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return week;
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-emerald-500',
};

// ─── Mini calendar (sidebar) ─────────────────────────────────────────────────
function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const [view, setView] = useState(new Date(selected));
  const days = useMemo(() => getDaysInMonth(view.getFullYear(), view.getMonth()), [view]);
  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selected);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-200">
          {MONTH_NAMES[view.getMonth()]} {view.getFullYear()}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
          </button>
          <button
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
          </button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          const key = toDateKey(d);
          const isCurrentMonth = d.getMonth() === view.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return (
            <button
              key={i}
              onClick={() => { onSelect(new Date(d)); setView(new Date(d.getFullYear(), d.getMonth(), 1)); }}
              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs transition-all
                ${isSelected && isToday ? 'bg-blue-500 text-white font-bold' : ''}
                ${isSelected && !isToday ? 'bg-slate-600 text-white font-semibold' : ''}
                ${isToday && !isSelected ? 'text-blue-400 font-bold ring-1 ring-blue-500' : ''}
                ${!isSelected && !isToday && isCurrentMonth ? 'text-slate-300 hover:bg-slate-700' : ''}
                ${!isCurrentMonth ? 'text-slate-600 hover:bg-slate-800' : ''}
              `}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event pill ──────────────────────────────────────────────────────────────
function EventPill({ task, onClick }: { task: Task; onClick?: () => void }) {
  const color = PRIORITY_COLORS[task.priority] ?? 'bg-indigo-500';
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-white cursor-pointer truncate max-w-full hover:opacity-80 transition-opacity ${color} ${task.completed ? 'opacity-40 line-through' : ''}`}
      title={task.title}
    >
      <span className="truncate">{task.title}</span>
    </div>
  );
}

// ─── Month view ──────────────────────────────────────────────────────────────
function MonthView({
  year, month, tasks, selectedKey, onDayClick,
}: {
  year: number;
  month: number;
  tasks: Task[];
  selectedKey: string;
  onDayClick: (key: string) => void;
}) {
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const todayKey = toDateKey(new Date());

  const taskMap = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach((t) => { if (!t.deadline) return; const arr = m.get(t.deadline) ?? []; arr.push(t); m.set(t.deadline, arr); });
    return m;
  }, [tasks]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Day header row */}
      <div className="grid grid-cols-7 border-b border-slate-800">
        {DAY_NAMES_FULL.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-slate-800/30 overflow-auto">
        {days.map((d, i) => {
          const key = toDateKey(d);
          const isCurrentMonth = d.getMonth() === month;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const dayTasks = taskMap.get(key) ?? [];

          return (
            <div
              key={i}
              onClick={() => onDayClick(key)}
              className={`flex flex-col p-1.5 min-h-[90px] cursor-pointer transition-colors
                ${isCurrentMonth ? 'bg-slate-900/60' : 'bg-slate-900/30'}
                ${isSelected ? 'ring-1 ring-inset ring-blue-500/60' : 'hover:bg-slate-800/50'}
              `}
            >
              <div className="flex justify-end mb-1">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-colors
                  ${isToday ? 'bg-blue-500 text-white' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <EventPill key={t.id} task={t} />
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-slate-500 pl-1">+{dayTasks.length - 3} việc</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week view ───────────────────────────────────────────────────────────────
function WeekView({
  anchor, tasks, selectedKey, onDayClick,
}: {
  anchor: Date;
  tasks: Task[];
  selectedKey: string;
  onDayClick: (key: string) => void;
}) {
  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);
  const todayKey = toDateKey(new Date());

  const taskMap = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach((t) => { if (!t.deadline) return; const arr = m.get(t.deadline) ?? []; arr.push(t); m.set(t.deadline, arr); });
    return m;
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-800">
        {weekDays.map((d) => {
          const key = toDateKey(d);
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex flex-col items-center py-2 gap-0.5">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">{DAY_NAMES[d.getDay()]}</span>
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                ${isToday ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex-1 grid grid-cols-7 gap-px bg-slate-800/30 overflow-auto p-px">
        {weekDays.map((d) => {
          const key = toDateKey(d);
          const isSelected = key === selectedKey;
          const dayTasks = taskMap.get(key) ?? [];
          return (
            <div
              key={key}
              onClick={() => onDayClick(key)}
              className={`p-1.5 flex flex-col gap-1 min-h-[200px] cursor-pointer transition-colors rounded-lg
                ${isSelected ? 'ring-1 ring-inset ring-blue-500/60 bg-blue-500/5' : 'bg-slate-900/60 hover:bg-slate-800/50'}`}
            >
              {dayTasks.map((t) => <EventPill key={t.id} task={t} />)}
              {dayTasks.length === 0 && (
                <span className="text-xs text-slate-700 text-center mt-4">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day detail panel ─────────────────────────────────────────────────────────
function DayPanel({ dateKey, tasks, onToggle }: { dateKey: string; tasks: Task[]; onToggle: (id: string) => void }) {
  const d = new Date(dateKey + 'T00:00:00');
  const dayTasks = tasks.filter((t) => t.deadline === dateKey);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-300">
        {d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </h3>
      {dayTasks.length === 0 ? (
        <p className="text-xs text-slate-600 italic">Không có việc nào hôm này.</p>
      ) : (
        dayTasks.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all
              ${t.completed ? 'bg-slate-900/40 border-slate-800/50 opacity-60' : 'bg-slate-800/60 border-slate-700'}`}
          >
            <button
              onClick={() => onToggle(t.id)}
              className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                ${t.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 hover:border-indigo-400'}`}
            >
              {t.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{t.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="priority" value={t.priority} size="sm" />
                <Badge variant="role" value={t.role} size="sm" />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { tasks, toggleTask } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(toDateKey(new Date()));

  const todayKey = toDateKey(new Date());
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const nav = (dir: 1 | -1) => {
    setAnchor((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
      else d.setDate(d.getDate() + 7 * dir);
      return d;
    });
  };

  const goToday = () => { setAnchor(new Date()); setSelectedKey(todayKey); };

  const periodLabel = viewMode === 'month'
    ? `${MONTH_NAMES[month]} ${year}`
    : (() => {
        const week = getWeekDays(anchor);
        const s = week[0].toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
        const e = week[6].toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
        return `${s} – ${e}`;
      })();

  // tasks enriched with soft-deadline visual
  const enrichedTasks = useMemo(() => tasks, [tasks]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-0 -mt-2">
      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between py-3 mb-1 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">Lịch</h1>
          <button
            onClick={goToday}
            className="hidden sm:block px-3 py-1.5 text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Hôm nay
          </button>
          <div className="flex gap-1">
            <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
            </button>
            <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </button>
          </div>
          <span className="text-sm font-semibold text-slate-200">{periodLabel}</span>
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-800/60 border border-slate-700 p-0.5 rounded-xl gap-0.5">
          {(['month', 'week'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === v ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {v === 'month' ? 'Tháng' : 'Tuần'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden lg:flex flex-col gap-4 w-52 shrink-0">
          <MiniCalendar
            selected={anchor}
            onSelect={(d) => { setAnchor(d); setSelectedKey(toDateKey(d)); }}
          />
          {/* Selected day panel */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 overflow-auto custom-scrollbar">
            <DayPanel dateKey={selectedKey} tasks={enrichedTasks} onToggle={toggleTask} />
          </div>
        </div>

        {/* Main calendar */}
        <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800/70 rounded-2xl overflow-hidden">
          {viewMode === 'month' ? (
            <MonthView
              year={year}
              month={month}
              tasks={enrichedTasks}
              selectedKey={selectedKey}
              onDayClick={setSelectedKey}
            />
          ) : (
            <WeekView
              anchor={anchor}
              tasks={enrichedTasks}
              selectedKey={selectedKey}
              onDayClick={setSelectedKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}
