import { useState } from 'react';
import { parseTasksWithAI, type ParsedTask } from '../utils/aiParser';
import type { Role, Priority } from '../types';
import DateInput from './ui/DateInput';

const ROLE_LABELS: Record<Role, string> = { WORK: '🏢 Công sở', TEACH: '👨‍🏫 Giảng dạy', MASTER: '🎓 Cao học' };
const PRIORITY_LABELS: Record<Priority, string> = { HIGH: '🔴 Cao', MEDIUM: '🟡 TB', LOW: '🟢 Thấp' };

interface AITaskPanelProps {
  apiKey: string | undefined;
  onConfirm: (tasks: ParsedTask[]) => void;
  onClose: () => void;
}

export default function AITaskPanel({ apiKey, onConfirm, onClose }: AITaskPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setParsedTasks([]);
    try {
      const tasks = await parseTasksWithAI(apiKey, input);
      setParsedTasks(tasks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const updateTask = (idx: number, partial: Partial<ParsedTask>) => {
    setParsedTasks((prev) => prev.map((t, i) => i === idx ? { ...t, ...partial } : t));
  };

  const removeTask = (idx: number) => {
    setParsedTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-indigo-500/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">✨</span>
              AI Tạo Công Việc
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Mô tả tự nhiên, AI sẽ phân tích và tạo task giúp bạn.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Hãy mô tả những việc cần làm</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ví dụ:\n- Chuẩn bị slide thuyết trình cho lớp Toán ứng dụng, gấp, nộp trước ngày 20/3\n- Viết báo cáo tiến độ luận văn tháng 3\n- Họp nhóm dự án phần mềm tuần tới`}
              rows={5}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm leading-relaxed"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>
          )}

          {/* Parsed results */}
          {parsedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-300">Kết quả phân tích ({parsedTasks.length} công việc)</p>
                <button onClick={() => setParsedTasks([])} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Xóa tất cả</button>
              </div>
              {parsedTasks.map((task, idx) => (
                <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
                  {editIdx === idx ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={task.title}
                        onChange={(e) => updateTask(idx, { title: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex flex-wrap gap-2">
                        <select value={task.role} onChange={(e) => updateTask(idx, { role: e.target.value as Role })}
                          className="bg-slate-900/50 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <select value={task.priority} onChange={(e) => updateTask(idx, { priority: e.target.value as Priority })}
                          className="bg-slate-900/50 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <DateInput value={task.deadline} onChange={(v) => updateTask(idx, { deadline: v })}
                          className="bg-slate-900/50 border border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 w-36 text-xs" />
                      </div>
                      <button onClick={() => setEditIdx(null)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">✓ Xong</button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">{ROLE_LABELS[task.role]}</span>
                          <span className="text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">{PRIORITY_LABELS[task.priority]}</span>
                          {task.deadline && (
                            <span className="text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                              📅 {new Date(task.deadline + 'T00:00:00').toLocaleDateString('vi-VN')}
                            </span>
                          )}
                          {task.notes && <span className="text-xs text-slate-500 italic truncate max-w-[200px]">{task.notes}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditIdx(idx)} className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors" title="Sửa">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                        </button>
                        <button onClick={() => removeTask(idx)} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Xóa">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">
          {parsedTasks.length === 0 ? (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-sm">Hủy</button>
              <button onClick={handleParse} disabled={loading || !input.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {loading ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI đang phân tích...</>
                ) : '✨ Phân tích với AI'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setParsedTasks([]); setInput(''); }} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-sm">Làm lại</button>
              <button onClick={() => { onConfirm(parsedTasks); onClose(); }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all text-sm">
                ✓ Thêm {parsedTasks.length} công việc
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
