import { useState } from 'react';
import { useHabitStore } from '../hooks/useHabitStore';
import type { HabitFrequency, HabitCategory } from '../types';

const ICONS = ['💪', '🏃', '📚', '🧘', '💧', '🥗', '😴', '🎯', '✍️', '🎵', '🌿', '🧹', '🧠', '💊', '🛡️', '❤️'];
const COLORS = [
  { label: 'Indigo', value: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  { label: 'Emerald', value: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  { label: 'Amber', value: 'amber', bg: 'bg-amber-500', light: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400' },
  { label: 'Rose', value: 'rose', bg: 'bg-rose-500', light: 'bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-400' },
  { label: 'Sky', value: 'sky', bg: 'bg-sky-500', light: 'bg-sky-500/20', border: 'border-sky-500/30', text: 'text-sky-400' },
  { label: 'Purple', value: 'purple', bg: 'bg-purple-500', light: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
];

const CATEGORY_LABELS: Record<HabitCategory, string> = {
  health: '💚 Sức khỏe',
  learning: '📖 Học tập',
  mindfulness: '🧘 Thiền định',
  productivity: '⚡ Hiệu suất',
  other: '🌟 Khác',
};

function getColorConfig(colorValue: string) {
  return COLORS.find((c) => c.value === colorValue) ?? COLORS[0];
}

// Generate last N days starting from today going backwards
function getLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function AddHabitModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, icon: string, color: string, frequency: HabitFrequency, category: HabitCategory, description: string) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💪');
  const [color, setColor] = useState('indigo');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), icon, color, frequency, category, description.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100">Thêm thói quen mới</h2>
          <p className="text-sm text-slate-400 mt-1">Xây dựng ngày mới bắt đầu từ những thói quen nhỏ.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Tên thói quen</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Uống 8 ly nước mỗi ngày..."
              autoFocus
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Biểu tượng</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${icon === ic ? 'bg-indigo-500 scale-110' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Màu sắc</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-all ${color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-50 hover:opacity-80'}`}
                />
              ))}
            </div>
          </div>

          {/* Frequency & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Tần suất</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="daily">📅 Hàng ngày</option>
                <option value="weekly">📆 Hàng tuần</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HabitCategory)}
                className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.entries(CATEGORY_LABELS) as [HabitCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Mô tả (tuỳ chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lý do bạn muốn xây dựng thói quen này..."
              rows={2}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Thêm thói quen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HabitPage() {
  const { habits, addHabit, deleteHabit, toggleLog, isDone, getStreak, getTodayCompleted } = useHabitStore();
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const last30 = getLast30Days();
  const todayCompleted = getTodayCompleted();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-1">
            Thói Quen
          </h1>
          <p className="text-slate-400">
            Hôm nay: <span className="text-emerald-400 font-semibold">{todayCompleted}/{habits.length}</span> thói quen đã hoàn thành
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Thêm thói quen
        </button>
      </header>

      {/* Stats row */}
      {habits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
            <p className="text-slate-500 text-xs mb-1">Tổng thói quen</p>
            <p className="text-2xl font-bold text-slate-100">{habits.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
            <p className="text-slate-500 text-xs mb-1">Hoàn thành hôm nay</p>
            <p className="text-2xl font-bold text-emerald-400">{todayCompleted}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
            <p className="text-slate-500 text-xs mb-1">Tỉ lệ hôm nay</p>
            <p className="text-2xl font-bold text-indigo-400">
              {habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0}%
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
            <p className="text-slate-500 text-xs mb-1">Streak dài nhất</p>
            <p className="text-2xl font-bold text-amber-400">
              {habits.length > 0 ? Math.max(...habits.map((h) => getStreak(h.id))) : 0} 🔥
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {habits.length === 0 && (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800/50 border-dashed rounded-3xl">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">Hãy trồng những thói quen đầu tiên</h3>
          <p className="text-slate-500 text-sm mb-6">Mỗi đại thụ đều bắt đầu từ một hạt giống nhỏ.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            Bắt đầu ngay
          </button>
        </div>
      )}

      {/* Habit Cards */}
      <div className="space-y-4">
        {habits.map((habit) => {
          const color = getColorConfig(habit.color);
          const streak = getStreak(habit.id);
          const doneTodayFlag = isDone(habit.id, today);

          return (
            <div
              key={habit.id}
              className={`rounded-2xl border transition-all duration-300 ${color.light} ${color.border}`}
            >
              {/* Habit Header */}
              <div className="p-4 flex items-center gap-4">
                {/* Check button */}
                <button
                  onClick={() => toggleLog(habit.id, today)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 shrink-0 ${
                    doneTodayFlag
                      ? `${color.bg} shadow-lg scale-110`
                      : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={doneTodayFlag ? 'Bỏ đánh dấu' : 'Đánh dấu hoàn thành'}
                >
                  {doneTodayFlag ? '✅' : habit.icon}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold text-slate-100 ${doneTodayFlag ? 'line-through opacity-60' : ''}`}>
                      {habit.name}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.light} ${color.text}`}>
                      {CATEGORY_LABELS[habit.category]}
                    </span>
                  </div>
                  {habit.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{habit.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Streak badge */}
                  {streak > 0 && (
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      <span className="text-xs font-bold text-amber-400">🔥 {streak}</span>
                    </div>
                  )}
                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(habit.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 30-Day Grid */}
              <div className="px-4 pb-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">30 ngày gần nhất</p>
                <div className="flex flex-wrap gap-1">
                  {last30.map((dateKey) => {
                    const done = isDone(habit.id, dateKey);
                    const isToday = dateKey === today;
                    return (
                      <button
                        key={dateKey}
                        onClick={() => toggleLog(habit.id, dateKey)}
                        title={dateKey}
                        className={`w-6 h-6 rounded-md transition-all duration-200 hover:scale-110 ${
                          done
                            ? `${color.bg} opacity-90`
                            : isToday
                            ? 'bg-slate-700 ring-2 ring-slate-500'
                            : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal thêm habit */}
      {showModal && (
        <AddHabitModal
          onClose={() => setShowModal(false)}
          onAdd={addHabit}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-800/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-4xl mb-3 text-center">⚠️</div>
            <h3 className="text-lg font-bold text-slate-100 text-center mb-2">Xác nhận xóa</h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              Bạn có chắc muốn xóa thói quen này? Toàn bộ lịch sử hoàn thành cũng sẽ bị xóa.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => { deleteHabit(confirmDelete!); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-all"
              >
                Xóa thói quen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
