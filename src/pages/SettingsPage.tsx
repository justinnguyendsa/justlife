import { useEffect, useState } from 'react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, UserRole } from '../types';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const { user: currentUser, updateUserRole } = useAuth();
  const [notiPermission, setNotiPermission] = useState<NotificationPermission>('default');
  
  // User Management State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotiPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const users: any[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setAllUsers(users);
    } catch (err) {
      console.error("Lỗi khi tải danh sách người dùng:", err);
    }
    setLoadingUsers(false);
  };

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ thông báo.');
      return;
    }

    if (settings.enableNotifications) {
      updateSettings({ enableNotifications: false });
    } else {
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
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">
          Cài Đặt Hệ Thống
        </h1>
        <p className="text-slate-400">Tùy biến JustLife và quản lý quyền truy cập.</p>
      </header>

      <div className="space-y-6">
        {/* --- USER MANAGEMENT (SUPER ADMIN ONLY) --- */}
        {currentUser?.role === 'super_admin' && (
          <section className="bg-slate-900/50 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-200">Quản trị Người dùng</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Phân quyền và quản lý tài khoản trong hệ thống.</p>
                </div>
              </div>
              <button onClick={fetchUsers} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                 <svg className={`w-5 h-5 ${loadingUsers ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Người dùng</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Vai trò</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-slate-700">
                              {u.name.charAt(0).toUpperCase()}
                           </div>
                           <span className="font-medium text-slate-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-4 text-center">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                           u.role === 'super_admin' ? 'bg-indigo-500/20 text-indigo-400' :
                           u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                           'bg-slate-800 text-slate-500'
                         }`}>
                           {u.role}
                         </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                         <select 
                           value={u.role} 
                           onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                           className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                           disabled={u.id === currentUser.id} // Không tự đổi quyền mình
                         >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                         </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allUsers.length === 0 && !loadingUsers && <p className="text-center py-10 text-slate-600 italic">Chưa có dữ liệu người dùng.</p>}
            </div>
          </section>
        )}

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
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={notiPermission === 'denied'}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                settings.enableNotifications ? 'bg-indigo-500' : 'bg-slate-600'
              } disabled:opacity-50`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </section>

        {/* Section: Engine Settings */}
        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Động cơ thời gian</h2>
              <p className="text-sm text-slate-400 mt-0.5">Cấu hình thuật toán tính toán deadline an toàn.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-200">Khoảng lùi an toàn (Days Offset)</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Dịch chuyển deadline về sớm hơn để tạo áp lực tích cực.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateSettings({ softDeadlineOffset: Math.max(0, settings.softDeadlineOffset - 1) })} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600">-</button>
              <span className="text-xl font-bold text-slate-100">{settings.softDeadlineOffset}</span>
              <button onClick={() => updateSettings({ softDeadlineOffset: Math.min(14, settings.softDeadlineOffset + 1) })} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600">+</button>
            </div>
          </div>
        </section>

        {/* Section: Firebase / Data Status */}
        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-200">Hệ thống Dữ liệu</h2>
                <p className="text-sm text-slate-400 mt-0.5">Xác thực real-time qua Firebase Auth.</p>
              </div>
           </div>
           
           <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-sm text-slate-200">Firebase SDK: <span className="text-emerald-400 font-mono">Active</span></span>
                 </div>
                 <button 
                   onClick={() => alert('Vui lòng kiểm tra src/lib/firebase.ts để cấu hình API Key thật.')}
                   className="text-xs text-indigo-400 hover:underline"
                 >
                   Kiểm tra kết nối
                 </button>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
