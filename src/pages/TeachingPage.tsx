import { useState } from 'react';
import { useTeachingStore } from '../hooks/useTeachingStore';


export default function TeachingPage() {
  const { classes, addClass, deleteClass } = useTeachingStore();
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleRules, setScheduleRules] = useState<number[]>([]);

  const toggleDay = (day: number) => {
    setScheduleRules(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !courseCode || !startDate || !endDate || scheduleRules.length === 0) return;
    
    await addClass(name, courseCode, description, scheduleRules, startDate, endDate);
    
    setShowModal(false);
    setName('');
    setCourseCode('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setScheduleRules([]);
  };

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-1">
            Quản lý Giảng dạy
          </h1>
          <p className="text-slate-400 text-sm">Lớp học, sinh viên và bài tập.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 text-sm"
        >
          + Thêm Lớp Học
        </button>
      </header>

      {/* Class List */}
      {classes.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-slate-800/50 border-dashed">
          <div className="text-6xl mb-4 opacity-50 flex justify-center">👨‍🏫</div>
          <h3 className="text-xl font-medium text-slate-300 mb-2">Chưa có lớp học nào</h3>
          <p className="text-slate-500 text-sm">Bấm "Thêm Lớp Học" để bắt đầu thiết lập.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 shadow-xl relative group">
              <button 
                onClick={() => { if(window.confirm('Chắc chắn xoá lớp này?')) deleteClass(cls.id) }} 
                className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              </button>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{cls.name}</h3>
                  <span className="inline-block px-2.5 py-1 bg-slate-800 text-blue-400 font-mono text-xs rounded-lg mt-2 border border-slate-700">
                    {cls.courseCode}
                  </span>
                </div>
              </div>

              <div className="text-sm text-slate-400 space-y-2 mb-6">
                <p className="flex items-center gap-2">
                  <span>📅</span> {new Date(cls.startDate).toLocaleDateString('vi-VN')} - {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                </p>
                <p className="flex items-center gap-2">
                  <span>⏰</span> Lịch học: {cls.scheduleRules.map(d => DAYS[d]).join(', ')}
                </p>
                {cls.description && <p className="italic text-slate-500 mt-2">"{cls.description}"</p>}
              </div>
              
              <div className="pt-4 border-t border-slate-800/80 flex gap-3">
                <button disabled className="flex-1 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg opacity-50 cursor-not-allowed border border-slate-700">Danh sách SV</button>
                <button disabled className="flex-1 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg opacity-50 cursor-not-allowed border border-slate-700">Chấm bài</button>
              </div>
              <p className="text-[10px] text-center text-slate-600 mt-2 italic">*Hệ thống tự động sinh Task Lịch Dạy vào Màn hình chính.</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-xl font-bold text-slate-100">Thêm Lớp Học Mới</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddClass} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Mã học phần</label>
                  <input type="text" required value={courseCode} onChange={e=>setCourseCode(e.target.value.toUpperCase())} placeholder="VD: INFS320" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 min-w-0 placeholder-slate-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Tên lớp học</label>
                  <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Toán rời rạc K1" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 min-w-0 placeholder-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mô tả thêm (Không bắt buộc)</label>
                <input type="text" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Phòng học, link meeting..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 min-w-0 placeholder-slate-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Ngày bắt đầu</label>
                  <input type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 min-w-0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Ngày kết thúc</label>
                  <input type="date" required value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 min-w-0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Lịch học trong tuần</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((dayLabel, idx) => {
                    const active = scheduleRules.includes(idx);
                    return (
                      <button
                        key={idx} type="button" onClick={() => toggleDay(idx)}
                        className={`w-11 h-11 rounded-xl text-sm font-medium transition-all ${active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
                      >
                        {dayLabel}
                      </button>
                    )
                  })}
                </div>
                {scheduleRules.length === 0 && <p className="text-red-400 text-xs mt-2">Vui lòng chọn ít nhất 1 ngày học trong tuần.</p>}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3 mt-4">
                <span className="text-blue-400 text-xl leading-none">ℹ️</span>
                <p className="text-xs text-blue-300 leading-relaxed">
                  Trợ lý System sẽ tạo sẵn toàn bộ các Task mang mã <span className="font-mono bg-blue-500/20 px-1 rounded text-blue-200">TEACH</span> ứng với lịch học vào Màn hình Công việc của bạn tự động.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors">Huỷ</button>
                <button type="submit" disabled={scheduleRules.length === 0 || !name || !startDate || !endDate} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50">Tạo Lớp Học</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
