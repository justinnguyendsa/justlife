import { useState, useEffect, useCallback, useRef } from 'react';
import { useTaskStore } from '../hooks/useTaskStore';
import Badge from '../components/ui/Badge';

type TimerMode = 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';

const MODES: Record<TimerMode, { label: string; duration: number; color: string; bg: string }> = {
  POMODORO: { label: 'Tập trung', duration: 25 * 60, color: 'text-indigo-400', bg: 'bg-indigo-500' },
  SHORT_BREAK: { label: 'Nghỉ ngắn', duration: 5 * 60, color: 'text-emerald-400', bg: 'bg-emerald-500' },
  LONG_BREAK: { label: 'Nghỉ dài', duration: 15 * 60, color: 'text-blue-400', bg: 'bg-blue-500' },
};

export default function FocusPage() {
  const { tasks } = useTaskStore();
  const [mode, setMode] = useState<TimerMode>('POMODORO');
  const [timeLeft, setTimeLeft] = useState(MODES.POMODORO.duration);
  const [isActive, setIsActive] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendingTasks = tasks.filter(t => !t.completed);

  // Play a simple beep sound
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 800;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // ignore
    }
  }, []);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].duration);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playBeep();
      if (timerRef.current) clearInterval(timerRef.current);
      // Optional: Web Notification
      if (Notification.permission === 'granted') {
        new Notification(`Hết giờ ${MODES[mode].label}!`, {
          body: mode === 'POMODORO' ? 'Đến giờ nghỉ ngơi rồi.' : 'Bắt đầu phiên làm việc mới nhé.',
        });
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, playBeep]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((MODES[mode].duration - timeLeft) / MODES[mode].duration) * 100;

  return (
    <div className="flex flex-col min-h-[80vh]">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-1">
          Không Gian Tập Trung
        </h1>
        <p className="text-slate-400">Pomodoro Timer - Chìa khóa đánh bại sự trì hoãn.</p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-8">
        {/* Left: Timer UI */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Background Ambient for Mode */}
          <div className={`absolute inset-0 opacity-10 blur-[100px] transition-colors duration-1000 ${MODES[mode].bg}`} />

          {/* Mode Switcher */}
          <div className="flex gap-2 bg-slate-950/50 p-1.5 rounded-full border border-slate-800/80 mb-12 relative z-10">
            {(Object.keys(MODES) as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  mode === m
                    ? `${MODES[m].bg} text-white shadow-lg`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>

          {/* Timer Circle */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center z-10 mb-12">
            {/* SVG Progress Ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 transform"
              viewBox="0 0 100 100"
            >
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-800/50"
              />
              {/* Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * progress) / 100}
                className={`${MODES[mode].color} transition-all duration-1000 ease-linear`}
              />
            </svg>
            
            <div className="text-center font-mono">
              <div className={`text-6xl md:text-8xl font-black tracking-tighter ${MODES[mode].color}`}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-slate-500 tracking-widest uppercase text-sm font-semibold mt-2">
                {isActive ? 'Đang chạy' : 'Đã dừng'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4 z-10">
            <button
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-2 ${
                isActive
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : `${MODES[mode].bg} border-transparent text-white hover:opacity-90 hover:scale-105`
              }`}
            >
              {isActive ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 translate-x-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={resetTimer}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all duration-300 shadow-xl"
              title="Khôi phục"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Task Selection */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="text-indigo-400">🎯</span> Mục tiêu hiện tại
            </h2>
            
            {pendingTasks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4 border border-dashed border-slate-700 rounded-xl">
                Bạn không có công việc nào đang chờ. Nghỉ ngơi thôi!
              </p>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="">-- Chọn công việc để tập trung --</option>
                  {pendingTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>

                {selectedTaskId && (
                  <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl animate-in fade-in">
                    {/* Selected Task Details */}
                    {(() => {
                      const task = tasks.find(t => t.id === selectedTaskId);
                      if (!task) return null;
                      return (
                        <div>
                          <p className="font-medium text-slate-200 mb-3">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="priority" value={task.priority} />
                            <Badge variant="role" value={task.role} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-amber-900/10 border border-amber-800/20 rounded-2xl p-5">
            <h3 className="text-amber-400/90 font-medium text-sm mb-2 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              Luật Pomodoro
            </h3>
            <ul className="text-slate-400 text-xs space-y-2 list-disc pl-4">
              <li>Hoàn toàn tập trung vào việc đã chọn trong 25 phút.</li>
              <li>Không kiểm tra mail, điện thoại, hay mạng xã hội.</li>
              <li>Nếu bị gián đoạn, phải khởi động lại timer từ đầu.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
