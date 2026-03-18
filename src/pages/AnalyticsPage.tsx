import { useMemo } from 'react';
import { useTaskStore } from '../hooks/useTaskStore';

export default function AnalyticsPage() {
  const { tasks } = useTaskStore();

  // 1. Dữ liệu tổng quan
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Tasks hoàn thành trong 7 ngày qua
  const last7Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight
    return tasks.filter((t) => {
      if (!t.completed || !t.deadline) return false;
      const tDate = new Date(t.deadline);
      const diffTime = today.getTime() - tDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;
  }, [tasks]);

  // 2. Phân phối theo Role
  const roleStats = useMemo(() => {
    const roles = ['WORK', 'TEACH', 'MASTER'] as const;
    return roles.map(role => {
      const roleTasks = tasks.filter(t => t.role === role);
      const roleCompleted = roleTasks.filter(t => t.completed).length;
      const count = roleTasks.length;
      const pct = count > 0 ? Math.round((roleCompleted / count) * 100) : 0;
      
      let label = '';
      let colorClass = '';
      if (role === 'WORK') {
        label = '🏢 Công sở'; colorClass = 'bg-blue-500';
      } else if (role === 'TEACH') {
        label = '👨‍🏫 Giảng dạy'; colorClass = 'bg-emerald-500';
      } else {
        label = '🎓 Cao học'; colorClass = 'bg-purple-500';
      }

      return { role, label, count, roleCompleted, pct, colorClass };
    });
  }, [tasks]);

  // Tính Streak (số ngày liên tiếp hòan thành ít nhất 1 task tính từ hôm qua/hôm nay lùi về trước)
  const currentStreak = useMemo(() => {
    if (tasks.length === 0) return 0;
    
    // Thu thập các ngày có task hoàn thành (format YYYY-MM-DD)
    const completedDates = new Set<string>();
    tasks.forEach(t => {
      if (t.completed && t.deadline) {
        completedDates.add(t.deadline); // Assume deadline is the date it was done for simplicity
      }
    });

    let streak = 0;
    const today = new Date();
    
    // Chạy lùi từ hôm nay
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      if (completedDates.has(dateStr)) {
        streak++;
      } else {
        // Nếu hôm nay ko có, chưa đứt streak vội (có thể user chưa làm việc hôm nay), nhưng hôm qua ko có thì đứt
        if (i > 0) break;
      }
    }
    return streak;
  }, [tasks]);

  // Export JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `justlife-data-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">
          Báo cáo hiệu suất
        </h1>
        <p className="text-slate-400">Xem lại hành trình và các chỉ số tập trung của bạn.</p>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5">
          <div className="text-2xl mb-1">🎯</div>
          <p className="text-3xl font-extrabold text-white">{completionRate}%</p>
          <p className="text-slate-500 text-sm font-medium mt-1">Tỷ lệ hoàn thành</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5">
          <div className="text-2xl mb-1">🔥</div>
          <p className="text-3xl font-extrabold text-orange-400">{currentStreak}</p>
          <p className="text-slate-500 text-sm font-medium mt-1">Ngày liên tiếp (Streak)</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5">
          <div className="text-2xl mb-1">📈</div>
          <p className="text-3xl font-extrabold text-indigo-400">{completedTasks}</p>
          <p className="text-slate-500 text-sm font-medium mt-1">Tổng việc đã xong</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5">
          <div className="text-2xl mb-1">📅</div>
          <p className="text-3xl font-extrabold text-emerald-400">{last7Days}</p>
          <p className="text-slate-500 text-sm font-medium mt-1">Hoàn thành 7 ngày qua</p>
        </div>
      </div>

      {/* Role Distribution */}
      <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
          📊 Phân phối sự chú ý
        </h2>
        
        <div className="space-y-6">
          {roleStats.map(stat => (
            <div key={stat.role}>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="font-semibold text-slate-300">{stat.label}</span>
                  <span className="text-slate-500 text-sm ml-2">({stat.roleCompleted}/{stat.count} việc)</span>
                </div>
                <span className="text-sm font-bold text-slate-100">{stat.pct}%</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${stat.colorClass} transition-all duration-1000 ease-out`}
                  style={{ width: `${stat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {totalTasks === 0 && (
          <p className="text-center text-slate-500 mt-4 text-sm">Chưa có đủ dữ liệu để vẽ biểu đồ nghen!</p>
        )}
      </section>

      {/* Data Export section */}
      <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
          💾 Dữ liệu của bạn
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Tất cả dữ liệu JustLife đều được lưu trữ an toàn ngay trên trình duyệt của bạn. Bạn không cần có mạng internet để lưu việc. Tuy nhiên, nếu bạn muốn đổi máy hay sao lưu để đề phòng, hãy xuất file JSON bên dưới.
        </p>
        <button
          onClick={handleExport}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Tải xuống bản sao lưu (.json)
        </button>
      </section>
    </div>
  );
}
