import { useEffect, useState } from 'react';
import { useSettingsStore } from '../hooks/useSettingsStore';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const [notiPermission, setNotiPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotiPermission(Notification.permission);
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ thông báo.');
      return;
    }

    if (settings.enableNotifications) {
      // Turn off
      updateSettings({ enableNotifications: false });
    } else {
      // Turn on - request permission if needed
      let perm = notiPermission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
        setNotiPermission(perm);
      }
      
      if (perm === 'granted') {
        updateSettings({ enableNotifications: true });
        new Notification('JustLife', { body: 'Thông báo đã được bật thành công!' });
      } else {
        alert('Vui lòng cấp quyền thông báo trong cài đặt trình duyệt.');
      }
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">
          Cài Đặt Hệ Thống
        </h1>
        <p className="text-slate-400">Tùy biến JustLife theo cách làm việc của bạn.</p>
      </header>

      <div className="space-y-6">
        {/* Section: Notifications */}
        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Thông báo & Nhắc nhở</h2>
              <p className="text-sm text-slate-400 mt-0.5">Nhận cảnh báo khi công việc sắp hạn màu đỏ.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div>
              <p className="font-medium text-slate-200">Push Notifications</p>
              <p className="text-xs text-slate-400 mt-1">
                Hiển thị thông báo trình duyệt kể cả khi bạn không mở app.
                {notiPermission === 'denied' && (
                  <span className="text-red-400 block mt-1">⚠️ Bạn đã chặn quyền thông báo của trang này.</span>
                )}
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={notiPermission === 'denied'}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                settings.enableNotifications ? 'bg-indigo-500' : 'bg-slate-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Section: Workflow Engine */}
        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Động cơ thời gian (Engine)</h2>
              <p className="text-sm text-slate-400 mt-0.5">Quy tắc sinh ra "Deadline An Toàn".</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="font-medium text-slate-200">Khoảng lùi an toàn (Days Offset)</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  JustLife sẽ ép bạn hoàn thành công việc sớm hơn số ngày này so với hạn chót thực tế để tránh nước đến chân mới nhảy.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSettings({ softDeadlineOffset: Math.max(0, settings.softDeadlineOffset - 1) })}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-slate-100 w-8 text-center">
                  {settings.softDeadlineOffset}
                </span>
                <button
                  onClick={() => updateSettings({ softDeadlineOffset: Math.min(14, settings.softDeadlineOffset + 1) })}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: AI Integration */}
        <section className="bg-slate-900/50 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Tích hợp AI ✨</h2>
              <p className="text-sm text-slate-400 mt-0.5">Kết nối Gemini để AI tự tạo task từ mô tả tự nhiên.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Google Gemini API Key</label>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                  placeholder="AIza..."
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                />
                {settings.geminiApiKey && (
                  <button
                    onClick={() => updateSettings({ geminiApiKey: '' })}
                    className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm text-red-400 transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Lấy miễn phí tại{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                  aistudio.google.com/apikey
                </a>
                . Key được lưu trên máy của bạn, không gửi đến server khác.
              </p>
            </div>
            {settings.geminiApiKey && (
              <div className="flex items-center gap-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs text-emerald-400 font-medium">API Key đã được cấu hình. Tính năng AI Tạo Task đã sẵn sàng.</span>
              </div>
            )}
          </div>
        </section>

        {/* Section: Data */}
        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Dữ liệu Local Storage</h2>
              <p className="text-sm text-slate-400 mt-0.5">Dữ liệu của bạn được lưu hoàn toàn trên máy tính này.</p>
            </div>
          </div>

          <div className="flex justify-start gap-4">
            <button
              onClick={() => {
                const data = localStorage.getItem('justlife_tasks');
                if (!data) return alert('Không có dữ liệu task.');
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `justlife-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 transition-colors"
            >
              📥 Tải xuống chuỗi JSON
            </button>
            <button
              onClick={() => {
                if(window.confirm('CẢNH BÁO: Hành động này sẽ xóa sạc toàn bộ tasks trên máy của bạn. Bạn vẫn muốn tiếp tục?')) {
                  localStorage.removeItem('justlife_tasks');
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-colors"
            >
              🔥 Xóa toàn bộ dữ liệu
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
