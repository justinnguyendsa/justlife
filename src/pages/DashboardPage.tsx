import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTaskStore } from '../hooks/useTaskStore';
import Badge from '../components/ui/Badge';
import DateInput from '../components/ui/DateInput';
import type { Priority, Role } from '../types';

const ROLE_CARDS = [
  {
    role: 'WORK' as Role,
    label: 'Công sở',
    icon: '🏢',
    gradient: 'from-blue-600/20 to-blue-800/10',
    border: 'border-blue-500/20',
    accent: 'text-blue-400',
    ring: 'ring-blue-500/20',
  },
  {
    role: 'TEACH' as Role,
    label: 'Giảng dạy',
    icon: '👨‍🏫',
    gradient: 'from-emerald-600/20 to-emerald-800/10',
    border: 'border-emerald-500/20',
    accent: 'text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
  {
    role: 'MASTER' as Role,
    label: 'Cao học',
    icon: '🎓',
    gradient: 'from-purple-600/20 to-purple-800/10',
    border: 'border-purple-500/20',
    accent: 'text-purple-400',
    ring: 'ring-purple-500/20',
  },
];

function QuickAddForm({
  onAdd,
}: {
  onAdd: (title: string, role: Role, deadline: string, priority: Priority) => void;
}) {
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<Role>('WORK');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), role, deadline, priority);
    setTitle('');
    setDeadline('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thêm việc nhanh vào hàng chờ..."
          className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 text-sm shrink-0"
        >
          Thêm
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="WORK">🏢 Công sở</option>
          <option value="TEACH">👨‍🏫 Giảng dạy</option>
          <option value="MASTER">🎓 Cao học</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="HIGH">🔴 Ưu tiên Cao</option>
          <option value="MEDIUM">🟡 Trung bình</option>
          <option value="LOW">🟢 Thấp</option>
        </select>
        <DateInput
          value={deadline}
          onChange={setDeadline}
          title="Hạn chót thực tế"
          className="bg-slate-800/50 border border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 w-44"
        />
      </div>
      {/* Note removed because it is handled by the useTaskStore logic globally now */}
    </form>
  );
}

export default function DashboardPage() {
  const { tasks, addTask, toggleTask, getTodayTasks, getOverdueTasks, getUpcomingTasks } = useTaskStore();

  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();
  const upcomingTasks = getUpcomingTasks();
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;

  const today = new Date();
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[today.getDay()];
  const dateStr = today.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">
          {dayName}, {dateStr}
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Xin chào! 👋
        </h1>
        <p className="text-slate-400 mt-1.5">
          {pendingCount === 0
            ? 'Tuyệt vời! Bạn đã hoàn thành tất cả công việc hôm nay.'
            : `Bạn còn ${pendingCount} việc đang chờ. Hãy bắt đầu với việc ưu tiên cao nhất!`}
        </p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng việc', value: tasks.length, icon: '📋', color: 'text-slate-300' },
          { label: 'Hoàn thành', value: completedCount, icon: '✅', color: 'text-emerald-400' },
          { label: 'Đang chờ', value: pendingCount, icon: '⏳', color: 'text-indigo-400' },
          { label: 'Quá hạn', value: overdueTasks.length, icon: '🚨', color: 'text-red-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-slate-500 text-xs font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLE_CARDS.map(({ role, label, icon, gradient, border, accent, ring }) => {
          const roleTasks = tasks.filter((t) => t.role === role && !t.completed);
          const roleCompleted = tasks.filter((t) => t.role === role && t.completed).length;
          const roleTotal = tasks.filter((t) => t.role === role).length;
          const pct = roleTotal > 0 ? Math.round((roleCompleted / roleTotal) * 100) : 0;

          return (
            <Link
              key={role}
              to={`/tasks?role=${role}`}
              className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 hover:ring-2 ${ring} transition-all duration-200 group`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{icon}</span>
                <span className={`text-xs font-bold ${accent}`}>{pct}%</span>
              </div>
              <p className="font-semibold text-slate-200 mb-0.5">{label}</p>
              <p className="text-slate-400 text-sm">
                {roleTasks.length} việc đang chờ
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${gradient.replace('/20', '').replace('/10', '')} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Add */}
      <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="text-indigo-400">⚡</span> Thêm nhanh
        </h2>
        <QuickAddForm onAdd={addTask} />
      </section>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <section className="bg-red-950/30 backdrop-blur-sm border border-red-800/40 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            🚨 Quá hạn ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-3 bg-red-900/20 rounded-xl border border-red-800/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-5 h-5 shrink-0 rounded-full border-2 border-red-500/50 hover:border-red-400 hover:bg-red-500/20 transition-colors"
                  />
                  <span className="text-sm text-slate-300 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="role" value={task.role} />
                  <span className="text-xs text-red-400 font-medium">
                    {new Date(task.deadline).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            ))}
            {overdueTasks.length > 3 && (
              <Link to="/tasks" className="text-xs text-red-400/70 hover:text-red-400 transition-colors block text-center pt-1">
                + {overdueTasks.length - 3} việc quá hạn khác →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Upcoming Alert */}
      {upcomingTasks.length > 0 && (
        <section className="bg-amber-950/30 backdrop-blur-sm border border-amber-800/40 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
            ⚠️ Sắp đến hạn ({upcomingTasks.length})
          </h2>
          <div className="space-y-2">
            {upcomingTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-3 bg-amber-900/20 rounded-xl border border-amber-800/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-5 h-5 shrink-0 rounded-full border-2 border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/20 transition-colors"
                  />
                  <span className="text-sm text-slate-300 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="role" value={task.role} />
                  <span className="text-xs text-amber-500 font-medium">
                    {new Date(task.deadline).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            ))}
            {upcomingTasks.length > 3 && (
              <Link to="/tasks" className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors block text-center pt-1">
                + {upcomingTasks.length - 3} việc sắp hạn khác →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Today's Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <span className="text-amber-400">📅</span> Hôm nay
          </h2>
          <Link to="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Xem tất cả →
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 border border-slate-800/50 border-dashed rounded-2xl">
            <div className="text-5xl mb-3 opacity-60">🌙</div>
            <p className="text-slate-400 text-sm">Không có việc deadline hôm nay.</p>
            <p className="text-slate-600 text-xs mt-1">
              Hoặc bạn có thể đang làm việc rất tốt! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-5 h-5 shrink-0 rounded-full border-2 border-slate-500 hover:border-indigo-400 hover:bg-indigo-500/20 transition-colors"
                  />
                  <span className="text-sm text-slate-200 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="priority" value={task.priority} />
                  <Badge variant="role" value={task.role} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
