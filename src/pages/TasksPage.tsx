import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTaskStore } from '../hooks/useTaskStore';
import { useSettingsStore } from '../hooks/useSettingsStore';
import Badge from '../components/ui/Badge';
import DateInput from '../components/ui/DateInput';
import AITaskPanel from '../components/AITaskPanel';
import type { Task, Role, Priority } from '../types';
import type { ParsedTask } from '../utils/aiParser';

type ViewMode = 'card' | 'table';

function getStatusFlags(task: Task, softOffset: number) {
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  if (!task.deadline) return { isOverdue: false, isUpcoming: false };
  const d = new Date(task.deadline);
  const isOverdue = d < todayObj;
  const softD = new Date(task.deadline);
  softD.setDate(softD.getDate() - softOffset);
  const isUpcoming = !isOverdue && softD <= todayObj;
  return { isOverdue, isUpcoming };
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ task, softOffset }: { task: Task; softOffset: number }) {
  if (task.completed) return null;
  const { isOverdue, isUpcoming } = getStatusFlags(task, softOffset);
  if (isOverdue) return <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded animate-pulse">Quá hạn</span>;
  if (isUpcoming) return <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">Sắp đến hạn</span>;
  return null;
}

// ─── Card View ───────────────────────────────────────────────────────────────
function CardView({
  tasks, softOffset, editingId, editTitle, editPriority,
  onToggle, onDelete, onStartEdit, onSaveEdit, onCancelEdit,
  onEditTitleChange, onEditPriorityChange,
}: {
  tasks: Task[];
  softOffset: number;
  editingId: string | null;
  editTitle: string;
  editPriority: Priority;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (t: Task) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditTitleChange: (v: string) => void;
  onEditPriorityChange: (v: Priority) => void;
}) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const { isOverdue, isUpcoming } = getStatusFlags(task, softOffset);
        const rowClass = task.completed
          ? 'bg-slate-900/40 border-slate-800/50 opacity-60 hover:opacity-100'
          : isOverdue ? 'bg-red-500/5 border-red-500/20'
          : isUpcoming ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 backdrop-blur-md';
        return (
          <div key={task.id} className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl ${rowClass}`}>
            <div className="flex items-start gap-4 flex-1">
              <button onClick={() => onToggle(task.id)} className={`mt-1 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 hover:border-indigo-400'}`}>
                {task.completed && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
              </button>
              {editingId === task.id ? (
                <div className="flex-1 flex flex-col gap-3">
                  <input autoFocus value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSaveEdit(task.id)} className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <div className="flex gap-2">
                    <select value={editPriority} onChange={(e) => onEditPriorityChange(e.target.value as Priority)} className="bg-slate-900/50 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="HIGH">🔴 Ưu tiên Cao</option>
                      <option value="MEDIUM">🟡 Trung bình</option>
                      <option value="LOW">🟢 Thấp</option>
                    </select>
                    <button onClick={() => onSaveEdit(task.id)} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Lưu</button>
                    <button onClick={onCancelEdit} className="bg-slate-700/50 text-slate-300 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Hủy</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-lg font-medium transition-all ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>{task.title}</span>
                  {task.deadline && (
                    <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 flex-wrap">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                      {new Date(task.deadline + 'T00:00:00').toLocaleDateString('vi-VN')}
                      <StatusBadge task={task} softOffset={softOffset} />
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-10 md:pl-0">
              <Badge variant="priority" value={task.priority} />
              <Badge variant="role" value={task.role} />
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onStartEdit(task)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors" title="Sửa">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                </button>
                <button onClick={() => onDelete(task.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Xóa">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────
function TableView({
  tasks, softOffset, onToggle, onDelete, onStartEdit,
}: {
  tasks: Task[];
  softOffset: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (t: Task) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
            <th className="w-10 py-3 pl-4"></th>
            <th className="py-3 px-3 text-left font-semibold">Công việc</th>
            <th className="py-3 px-3 text-left font-semibold hidden md:table-cell">Ưu tiên</th>
            <th className="py-3 px-3 text-left font-semibold hidden sm:table-cell">Vai trò</th>
            <th className="py-3 px-3 text-left font-semibold hidden lg:table-cell">Hạn chót</th>
            <th className="py-3 px-3 text-left font-semibold hidden lg:table-cell">Trạng thái</th>
            <th className="py-3 pr-4 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {tasks.map((task) => {
            const { isOverdue, isUpcoming } = getStatusFlags(task, softOffset);
            const rowHighlight = !task.completed && isOverdue
              ? 'bg-red-500/5'
              : !task.completed && isUpcoming
              ? 'bg-amber-500/5'
              : '';
            return (
              <tr key={task.id} className={`group transition-colors hover:bg-slate-800/40 ${rowHighlight} ${task.completed ? 'opacity-50' : ''}`}>
                {/* Checkbox */}
                <td className="pl-4 py-3 w-10">
                  <button onClick={() => onToggle(task.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 hover:border-indigo-400'}`}>
                    {task.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </button>
                </td>
                {/* Title */}
                <td className="py-3 px-3">
                  <span className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>{task.title}</span>
                </td>
                {/* Priority */}
                <td className="py-3 px-3 hidden md:table-cell">
                  <Badge variant="priority" value={task.priority} size="sm" />
                </td>
                {/* Role */}
                <td className="py-3 px-3 hidden sm:table-cell">
                  <Badge variant="role" value={task.role} size="sm" />
                </td>
                {/* Deadline */}
                <td className="py-3 px-3 text-slate-400 text-xs hidden lg:table-cell">
                  {task.deadline ? new Date(task.deadline + 'T00:00:00').toLocaleDateString('vi-VN') : '—'}
                </td>
                {/* Status */}
                <td className="py-3 px-3 hidden lg:table-cell">
                  <StatusBadge task={task} softOffset={softOffset} />
                  {task.completed && <span className="text-[10px] text-emerald-400 font-semibold">✓ Hoàn thành</span>}
                </td>
                {/* Actions */}
                <td className="py-3 pr-4">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onStartEdit(task)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors" title="Sửa">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                    </button>
                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Xóa">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { tasks, addTask, toggleTask, deleteTask, updateTask } = useTaskStore();
  const { settings } = useSettingsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showAI, setShowAI] = useState(false);

  const handleAIConfirm = (aiTasks: ParsedTask[]) => {
    aiTasks.forEach((t) => addTask(t.title, t.role, t.deadline, t.priority, t.notes));
  };

  const [activeRole, setActiveRole] = useState<Role | 'ALL'>((searchParams.get('role') as Role) || 'ALL');

  // Add form state
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<Role>('WORK');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [deadline, setDeadline] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM');

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeRole !== 'ALL') result = result.filter((t) => t.role === activeRole);
    return [...result].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      return 0;
    });
  }, [tasks, activeRole]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), role, deadline, priority);
    setTitle(''); setDeadline('');
  };

  const startEdit = (task: Task) => { setEditingId(task.id); setEditTitle(task.title); setEditPriority(task.priority); };
  const saveEdit = (id: string) => { if (editTitle.trim()) updateTask(id, { title: editTitle.trim(), priority: editPriority }); setEditingId(null); };

  const ROLE_LABELS: Record<string, string> = { ALL: 'Tất cả', WORK: '🏢 Công sở', TEACH: '👨‍🏫 Giảng dạy', MASTER: '🎓 Cao học' };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-1">Quản lý công việc</h1>
          <p className="text-slate-400 text-sm">{filteredTasks.length} công việc · {filteredTasks.filter(t => t.completed).length} đã hoàn thành</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Role Filters */}
          <div className="flex flex-wrap bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm">
            {(['ALL', 'WORK', 'TEACH', 'MASTER'] as const).map((r) => (
              <button key={r} onClick={() => { setActiveRole(r); if (r === 'ALL') searchParams.delete('role'); else searchParams.set('role', r); setSearchParams(searchParams); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeRole === r ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-800/50 border border-slate-700 p-0.5 rounded-xl gap-0.5">
            {(['card', 'table'] as const).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                title={v === 'card' ? 'Dạng thẻ' : 'Dạng bảng'}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {v === 'card' ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>
                )}
              </button>
            ))}
          </div>

          {/* AI Button */}
          <button
            onClick={() => setShowAI(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25"
          >
            <span className="text-base leading-none">✨</span> AI Tạo Task
          </button>
        </div>
      </header>

      {/* ── Add Task Form ── */}
      <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
          <input type="text" placeholder="Bạn cần làm gì tiếp theo?" value={title} onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[200px]" />
          <div className="flex flex-wrap gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-sm">
              <option value="WORK">🏢 Công sở</option>
              <option value="TEACH">👨‍🏫 Giảng dạy</option>
              <option value="MASTER">🎓 Cao học</option>
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-sm">
              <option value="HIGH">🔴 Cao</option>
              <option value="MEDIUM">🟡 TB</option>
              <option value="LOW">🟢 Thấp</option>
            </select>
            <DateInput title="Hạn chót" value={deadline} onChange={setDeadline}
              className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 w-40" />
            <button type="submit" disabled={!title.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 text-sm">
              Thêm
            </button>
          </div>
        </form>
      </section>

      {/* ── Task List / Table ── */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-slate-800/50 border-dashed">
          <div className="text-6xl mb-4 opacity-50">✨</div>
          <h3 className="text-xl font-medium text-slate-300 mb-2">Trống rỗng</h3>
          <p className="text-slate-500 text-sm">Không còn việc gì vướng bận trong không gian này.</p>
        </div>
      ) : viewMode === 'card' ? (
        <CardView
          tasks={filteredTasks}
          softOffset={settings.softDeadlineOffset}
          editingId={editingId}
          editTitle={editTitle}
          editPriority={editPriority}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingId(null)}
          onEditTitleChange={setEditTitle}
          onEditPriorityChange={setEditPriority}
        />
      ) : (
        <TableView
          tasks={filteredTasks}
          softOffset={settings.softDeadlineOffset}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onStartEdit={startEdit}
        />
      )}

      {/* AI Panel */}
      {showAI && (
        <AITaskPanel
          apiKey={settings.geminiApiKey}
          onConfirm={handleAIConfirm}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
}
