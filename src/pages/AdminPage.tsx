import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { db as localDb } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function AdminPage() {
  const { user: currentUser, updateUserRole } = useAuth();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  
  // Login logs from local DB
  const logs = useLiveQuery(() => localDb.loginLogs.reverse().limit(20).toArray()) || [];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const q = query(collection(firestoreDb, "users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const users: any[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setAllUsers(users);
    } catch (err) {
      console.error("Lỗi khi tải người dùng:", err);
    }
    setFetching(false);
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 11V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2zM12 11l-4-4m4 4l4-4" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-200">Truy cập bị từ chối</h2>
        <p className="text-slate-500 mt-2 max-w-sm">Bạn không có quyền Super Admin để xem trang này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-400">Giám sát hệ thống và quản trị người dùng.</p>
          </div>
          {fetching && <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Total Users</p>
            <p className="text-xl font-black text-slate-100">{allUsers.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Table */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-200">Danh sách Người dùng</h2>
                <button onClick={fetchUsers} className="text-xs text-indigo-400 hover:underline">Làm mới</button>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                      {allUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400 border border-slate-700">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-200">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{u.username || u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 uppercase text-[10px] font-black tracking-widest">
                            <span className={u.role === 'super_admin' ? 'text-indigo-400' : u.role === 'admin' ? 'text-blue-400' : 'text-slate-600'}>
                               {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <select 
                              value={u.role}
                              onChange={(e) => updateUserRole(u.id, e.target.value as any)}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
                              disabled={u.id === currentUser.id}
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
             </div>
          </section>
        </div>

        {/* Audit Logs */}
        <div className="space-y-6">
           <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden h-full">
              <h2 className="text-xl font-bold text-slate-200 mb-6">Nhật ký Đăng nhập</h2>
              <div className="space-y-4">
                 {logs.map((log) => (
                   <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className={`w-2 h-2 rounded-full ${log.type === 'login' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <div className="flex-1 overflow-hidden">
                         <p className="text-xs font-medium text-slate-200 truncate">
                            {log.type === 'login' ? 'Đăng nhập thành công' : 'Đã đăng xuất'}
                         </p>
                         <p className="text-[10px] text-slate-500">
                            {new Date(log.timestamp).toLocaleString('vi-VN')}
                         </p>
                      </div>
                   </div>
                 ))}
                 {logs.length === 0 && <p className="text-center py-10 text-slate-600 italic text-sm">Chưa có nhật ký truy cập.</p>}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
