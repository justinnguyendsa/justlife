import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTeachingStore } from '../hooks/useTeachingStore';
import DateInput from '../components/ui/DateInput';
import type { Class, Student, Assignment, Submission, TeachingDoc, Attendance } from '../types';

// Utility to generate session dates
function generateSessions(startStr: string, endStr: string, daysOfWeek: number[]) {
  const sessions: string[] = [];
  if (!startStr || !endStr || daysOfWeek.length === 0) return sessions;
  
  const start = new Date(startStr);
  const end = new Date(endStr);
  const current = new Date(start);
  
  // Set time to noon to avoid timezone shift issues during day increment
  current.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);

  while (current <= end) {
    if (daysOfWeek.includes(current.getDay())) {
      sessions.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return sessions;
}

export default function TeachingPage() {
  const { tab } = useParams<{ tab: string }>();
  const store = useTeachingStore();
  // Map route tab to internal tab state
  const mainTab = (tab?.toUpperCase() || 'CLASSES') as 'CLASSES' | 'STUDENTS' | 'DOCUMENTS';

  const { 
    classes, students, assignments, submissions, attendances, teachingDocs, 
    addClass, deleteClass, addStudent, deleteStudent, addAssignment, 
    updateSubmission, toggleAttendance, addDocument, deleteDocument,
    assignStudentToClass, removeStudentFromClass, assignDocToClass, removeDocFromClass
  } = store;
  
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'ASSIGNMENTS' | 'ATTENDANCE' | 'DOCUMENTS'>('STUDENTS');

  // Add Class Form states
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleRules, setScheduleRules] = useState<number[]>([]);

  // Add Student Form states
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState('');

  // Add Assignment Form States
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [asgPoints, setAsgPoints] = useState('');

  // Add Docs Form States
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [selectedDocToAssign, setSelectedDocToAssign] = useState('');

  // Attendance helpers
  const sessions = useMemo(() => {
    if (!selectedClass) return [];
    return generateSessions(selectedClass.startDate, selectedClass.endDate, selectedClass.scheduleRules);
  }, [selectedClass]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'PRESENT': return <span className="text-emerald-500 text-lg">✓</span>;
      case 'ABSENT': return <span className="text-red-500 text-lg">✕</span>;
      case 'EXCUSED': return <span className="text-blue-400 text-lg">✉️</span>;
      case 'LATE': return <span className="text-amber-500 text-lg">⏰</span>;
      default: return <span className="text-slate-700">−</span>;
    }
  };

  const cycleStatus = (classId: string, studentId: string, date: string, currentStatus?: string) => {
    const sequence: (Attendance['status'] | undefined)[] = ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE', undefined];
    const currentIndex = sequence.indexOf(currentStatus as any);
    const nextStatus = sequence[(currentIndex + 1) % sequence.length];
    
    if (nextStatus === undefined) {
      // Toggle back to PRESENT or handle empty? 
      // For simplicity in cycling, if undefined we go back to start
      toggleAttendance(classId, studentId, date, 'PRESENT');
    } else {
      toggleAttendance(classId, studentId, date, nextStatus);
    }
  };

  const toggleDay = (day: number) => {
    setScheduleRules(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !courseCode || !startDate || !endDate || scheduleRules.length === 0) return;
    await addClass(name, courseCode, description, scheduleRules, startDate, endDate);
    setShowModal(false);
    setName(''); setCourseCode(''); setDescription(''); setStartDate(''); setEndDate(''); setScheduleRules([]);
  };

  // Pool handlers
  const handleAddNewStudentToPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentCode) return;
    await addStudent(studentName, studentCode);
    setStudentName(''); setStudentCode('');
  };

  const handleAddNewDocToPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docUrl) return;
    await addDocument(docTitle, docUrl, docDesc);
    setDocTitle(''); setDocUrl(''); setDocDesc('');
  };

  // Class assign handlers
  const handleAssignOrCreateStudentInClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (selectedStudentToAssign) {
      await assignStudentToClass(selectedStudentToAssign, selectedClass.id);
      setSelectedStudentToAssign('');
    } else if (studentName && studentCode) {
      await addStudent(studentName, studentCode, '', selectedClass.id);
      setStudentName(''); setStudentCode('');
    }
  };

  const handleAssignOrCreateDocInClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (selectedDocToAssign) {
      await assignDocToClass(selectedDocToAssign, selectedClass.id);
      setSelectedDocToAssign('');
    } else if (docTitle && docUrl) {
      await addDocument(docTitle, docUrl, docDesc, selectedClass.id);
      setDocTitle(''); setDocUrl(''); setDocDesc('');
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !asgTitle || !asgDue) return;
    await addAssignment(selectedClass.id, asgTitle, asgDue, asgPoints ? Number(asgPoints) : undefined, '');
    setAsgTitle(''); setAsgDue(''); setAsgPoints('');
  };

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const classStudents = students.filter((s: Student) => selectedClass && s.classIds.includes(selectedClass.id));
  const classAssignments = assignments.filter((a: Assignment) => selectedClass && a.classId === selectedClass.id).sort((a: Assignment, b: Assignment) => b.createdAt - a.createdAt);
  const classDocs = teachingDocs.filter((d: TeachingDoc) => selectedClass && d.classIds.includes(selectedClass.id)).sort((a: TeachingDoc, b: TeachingDoc) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6 relative h-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-3">
            Giảng dạy & Lớp học
          </h1>
          <div className="flex bg-slate-800/50 p-1 rounded-xl w-fit overflow-x-auto">
            <div className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'CLASSES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
              👨‍🏫 Lớp học ({classes.length})
            </div>
            <div className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'STUDENTS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              🎓 Kho Học viên ({students.length})
            </div>
            <div className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'DOCUMENTS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📂 Kho Tài liệu ({teachingDocs.length})
            </div>
          </div>
        </div>
        {mainTab === 'CLASSES' && <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 text-sm transition-all whitespace-nowrap">+ Thêm Lớp</button>}
      </header>

      {/* ----------- MAIN TAB: CLASSES ----------- */}
      {mainTab === 'CLASSES' && (
        <>
          {classes.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-slate-800/50 border-dashed">
              <div className="text-6xl mb-4 opacity-50 flex justify-center">👨‍🏫</div>
              <h3 className="text-xl font-medium text-slate-300 mb-2">Chưa có lớp học nào</h3>
              <p className="text-slate-500 text-sm">Bấm "Thêm Lớp Học" để bắt đầu thiết lập.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-5 gap-4">
              {classes.map((cls: Class) => {
                const stuCount = students.filter((s: Student) => s.classIds.includes(cls.id)).length;
                const asgCount = assignments.filter((a: Assignment) => a.classId === cls.id).length;
                return (
                  <div key={cls.id} className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 shadow-xl relative group flex flex-col h-full">
                    <button 
                      onClick={() => { if(window.confirm('Cảnh báo: Xác nhận xoá thông tin Lớp học này? (Học viên và Tài liệu dạng chung sẽ không bị xoá khỏi pool)')) deleteClass(cls.id) }} 
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-500 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold"
                    >
                      &times;
                    </button>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-100">{cls.name}</h3>
                        <span className="inline-block px-2.5 py-1 bg-slate-800 text-blue-400 font-mono text-xs rounded-lg mt-2 border border-slate-700">
                          {cls.courseCode}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-400 space-y-2 mb-6 flex-1">
                      <p className="flex items-center gap-2"><span>📅</span> {new Date(cls.startDate).toLocaleDateString('vi-VN')} - {new Date(cls.endDate).toLocaleDateString('vi-VN')}</p>
                      <p className="flex items-center gap-2"><span>⏰</span> {cls.scheduleRules.map((d: number) => DAYS[d]).join(', ')}</p>
                      {cls.description && <p className="italic text-slate-500 mt-2">"{cls.description}"</p>}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-800/80 flex gap-3">
                      <button onClick={() => { setSelectedClass(cls); setActiveTab('STUDENTS'); }} className="flex-1 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm rounded-lg border border-indigo-500/20 font-medium transition-colors">
                        Sinh Viên ({stuCount})
                      </button>
                      <button onClick={() => { setSelectedClass(cls); setActiveTab('ASSIGNMENTS'); }} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm rounded-lg border border-emerald-500/20 font-medium transition-colors">
                        Quản lý Bài tập ({asgCount})
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ----------- MAIN TAB: STUDENTS POOL ----------- */}
      {mainTab === 'STUDENTS' && (
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-1 border border-indigo-500/20 bg-slate-900/50 rounded-2xl p-5 h-fit">
             <h3 className="text-lg font-bold text-indigo-400 mb-4">Tạo Học Viên Gốc</h3>
             <form onSubmit={handleAddNewStudentToPool} className="space-y-3">
                <input type="text" required placeholder="Họ và Tên" value={studentName} onChange={e=>setStudentName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                <input type="text" required placeholder="Mã số học viên" value={studentCode} onChange={e=>setStudentCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono" />
                <button type="submit" disabled={!studentName || !studentCode} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">Lưu Dữ liệu Gốc</button>
             </form>
          </div>
          <div className="lg:col-span-2">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                   <tr>
                     <th className="px-5 py-3 font-medium">Họ tên</th>
                     <th className="px-5 py-3 font-medium">Lớp tham gia</th>
                     <th className="px-5 py-3 font-medium text-center w-24">Tuỳ chọn</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                   {students.map(s => (
                     <tr key={s.id} className="hover:bg-slate-800/30">
                       <td className="px-5 py-3">
                          <p className="text-slate-200 font-medium text-base">{s.name}</p>
                          <p className="text-slate-500 font-mono text-xs">{s.studentCode}</p>
                       </td>
                       <td className="px-5 py-3">
                         <div className="flex flex-wrap gap-1">
                           {s.classIds.map(cid => {
                             const cls = classes.find(c => c.id === cid);
                             return cls ? <span key={cid} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs rounded font-mono">{cls.courseCode}</span> : null;
                           })}
                           {s.classIds.length === 0 && <span className="text-slate-600 italic text-xs">Chưa xếp lớp</span>}
                         </div>
                       </td>
                       <td className="px-5 py-3 text-center">
                          <button onClick={() => { if(window.confirm('Xóa sinh viên này khỏi hệ thống? (Các lớp học cũng sẽ bị xoá thông tin)')) deleteStudent(s.id) }} className="text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs transition-colors">Xóa</button>
                       </td>
                     </tr>
                   ))}
                   {students.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-slate-500">Chưa có học viên nào trong kho dữ liệu gốc.</td></tr>}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* ----------- MAIN TAB: DOCUMENTS POOL ----------- */}
      {mainTab === 'DOCUMENTS' && (
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-1 border border-emerald-500/20 bg-slate-900/50 rounded-2xl p-5 h-fit">
             <h3 className="text-lg font-bold text-emerald-400 mb-4">Tạo Tài Liệu Gốc</h3>
             <form onSubmit={handleAddNewDocToPool} className="space-y-3">
                <input type="text" required placeholder="Tên tài liệu..." value={docTitle} onChange={e=>setDocTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                <input type="url" required placeholder="URL đính kèm..." value={docUrl} onChange={e=>setDocUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                <input type="text" placeholder="Mô tả..." value={docDesc} onChange={e=>setDocDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                <button type="submit" disabled={!docTitle || !docUrl} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">Lưu Dữ liệu Gốc</button>
             </form>
          </div>
          <div className="lg:col-span-2 space-y-3">
             {teachingDocs.map(d => (
                <div key={d.id} className="relative flex flex-col p-4 bg-slate-900 border border-slate-800 rounded-2xl group hover:border-emerald-500/30 transition-all">
                   <div className="flex justify-between items-start mb-2">
                     <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-slate-200 hover:text-emerald-400 truncate w-[85%]">{d.title}</a>
                     <button onClick={() => { if(window.confirm('Xóa tài liệu này khỏi hệ thống?')) deleteDocument(d.id) }} className="text-slate-500 hover:text-red-400 px-2 py-1 rounded bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">Xoá</button>
                   </div>
                   {d.description && <p className="text-sm text-slate-400 mb-3">{d.description}</p>}
                   <div className="flex gap-2">
                     {d.classIds.length > 0 ? (
                       d.classIds.map(cid => {
                         const cls = classes.find(c => c.id === cid);
                         return cls && <span key={cid} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded font-medium border border-slate-700">{cls.courseCode}</span>
                       })
                     ) : <span className="text-xs italic text-slate-500">Chưa xếp lớp</span>}
                   </div>
                </div>
             ))}
             {teachingDocs.length === 0 && <p className="text-center py-10 text-slate-500">Chưa có tài liệu nào trong kho dữ liệu gốc.</p>}
          </div>
        </div>
      )}


      {/* ----------- CLASS DETAILS DRAWER ----------- */}
      {selectedClass && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedClass(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-2/3 lg:w-3/4 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full transform transition-transform">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded inline-block mb-2 border border-blue-500/20">{selectedClass.courseCode}</span>
                <h2 className="text-2xl font-bold text-slate-100">{selectedClass.name}</h2>
              </div>
              <button onClick={() => setSelectedClass(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex border-b border-slate-800 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('STUDENTS')}
                className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'STUDENTS' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                🎓 Học viên
              </button>
              <button 
                onClick={() => setActiveTab('ATTENDANCE')}
                className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ATTENDANCE' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                📋 Điểm danh (Grid)
              </button>
              <button 
                onClick={() => setActiveTab('ASSIGNMENTS')}
                className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ASSIGNMENTS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                📝 Bài tập
              </button>
              <button 
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'DOCUMENTS' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                📂 Tài liệu
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: STUDENTS */}
              {activeTab === 'STUDENTS' && (
                <div className="space-y-6">
                  <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/20">
                    <h3 className="text-sm font-bold text-indigo-300 mb-3 block">Thêm / Gán Học Viên</h3>
                    <form onSubmit={handleAssignOrCreateStudentInClass} className="space-y-3">
                       <select value={selectedStudentToAssign} onChange={e=>setSelectedStudentToAssign(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200">
                          <option value="">-- Chọn một học viên có sẵn từ Pool gốc --</option>
                          {students.filter(s => !s.classIds.includes(selectedClass.id)).map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>
                          ))}
                       </select>
                       
                       {!selectedStudentToAssign && (
                         <>
                           <div className="text-center text-xs text-slate-500 my-2">HOẶC</div>
                           <div className="flex gap-3">
                              <input type="text" placeholder="Tên SV Mới..." value={studentName} onChange={e=>setStudentName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100" />
                              <input type="text" placeholder="Mã SV Mới..." value={studentCode} onChange={e=>setStudentCode(e.target.value)} className="w-1/3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 font-mono text-center" />
                           </div>
                         </>
                       )}
                       <button type="submit" disabled={!selectedStudentToAssign && (!studentName || !studentCode)} className="px-4 py-2 mt-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                         {selectedStudentToAssign ? 'Gán Học viên đã chọn' : 'Tạo mới & Gán vào Lớp'}
                       </button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex justify-between">
                      <span>Sĩ số: {classStudents.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {classStudents.map((s: Student) => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl group hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">{s.name}</p>
                              <p className="text-xs text-slate-500 font-mono">{s.studentCode}</p>
                            </div>
                          </div>
                          <button onClick={() => removeStudentFromClass(s.id, selectedClass.id)} className="text-xs font-semibold px-2 py-1 rounded bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all border border-slate-600 hover:border-red-500/50">
                            Loại khỏi Lớp
                          </button>
                        </div>
                      ))}
                      {classStudents.length === 0 && <p className="text-center text-sm text-slate-500 py-10">Chưa có học viên nào trong lớp.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE (REFACTORED TO GRID) */}
              {activeTab === 'ATTENDANCE' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1"><span className="text-emerald-500">✓</span> Có mặt</div>
                      <div className="flex items-center gap-1"><span className="text-red-500">✕</span> Vắng</div>
                      <div className="flex items-center gap-1"><span className="text-blue-400">✉️</span> Có phép</div>
                      <div className="flex items-center gap-1"><span className="text-amber-500">⏰</span> Muộn</div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">* Click vào ô để thay đổi trạng thái</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                      <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800/80 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold border-r border-slate-700 min-w-[150px] sticky left-0 bg-slate-800 z-20">Học viên</th>
                          {sessions.map((s, idx) => (
                            <th key={s} className="px-2 py-3 font-bold text-center border-r border-slate-700 last:border-0 min-w-[70px]">
                              <div className="text-slate-400">#{idx + 1}</div>
                              <div className="text-slate-200">{s.split('-').reverse().slice(0, 2).join('/')}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {classStudents.map((stu: Student) => (
                          <tr key={stu.id} className="hover:bg-slate-800/20 transition-colors group">
                            <td className="px-4 py-3 border-r border-slate-700 sticky left-0 bg-slate-900 z-10 group-hover:bg-slate-800/40 transition-colors">
                              <p className="text-slate-200 font-medium truncate">{stu.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{stu.studentCode}</p>
                            </td>
                            {sessions.map(date => {
                              const attRecord = attendances.find((a: Attendance) => a.classId === selectedClass.id && a.studentId === stu.id && a.date === date);
                              return (
                                <td 
                                  key={date} 
                                  onClick={() => cycleStatus(selectedClass.id, stu.id, date, attRecord?.status)}
                                  className="px-2 py-3 text-center border-r border-slate-700 last:border-0 cursor-pointer hover:bg-slate-700/30 transition-all"
                                >
                                  {getStatusIcon(attRecord?.status)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {classStudents.length === 0 && (
                          <tr><td colSpan={sessions.length + 1} className="text-center py-10 text-slate-500">Chưa có học viên nào trong lớp.</td></tr>
                        )}
                        {sessions.length === 0 && (
                          <tr><td colSpan={1} className="text-center py-10 text-slate-500">Lịch học kéo dài chưa sinh buổi nào. Kiểm tra lại ngày bắt đầu/kết thúc.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ASSIGNMENTS */}
              {activeTab === 'ASSIGNMENTS' && (
                <div className="space-y-8">
                  {/* Create Assignment Form */}
                  <form onSubmit={handleAddAssignment} className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2"><span>✨</span> Giao Bài Tập Mới</h3>
                    <div>
                      <input type="text" required placeholder="Tên bài tập (VD: Bài tập lớn Giữa kỳ)" value={asgTitle} onChange={e=>setAsgTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">Hạn nộp</label>
                        <DateInput value={asgDue} onChange={setAsgDue} className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm" />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-xs text-slate-500 mb-1">Thang điểm</label>
                        <input type="number" placeholder="VD: 10" value={asgPoints} onChange={e=>setAsgPoints(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 text-center" />
                      </div>
                    </div>
                    <button type="submit" disabled={!asgTitle || !asgDue || classStudents.length === 0} title={classStudents.length === 0 ? "Cần thêm SV vào lớp trước" : ""} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20">
                      Giao Bài cho Toàn Lớp
                    </button>
                  </form>

                  {/* Assignments List */}
                  <div className="space-y-5">
                    {classAssignments.map((asg: Assignment) => {
                      const asgSubmissions = submissions.filter((sub: Submission) => sub.assignmentId === asg.id);
                      const markedCount = asgSubmissions.filter((sub: Submission) => sub.isMarked).length;
                      
                      return (
                        <div key={asg.id} className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                          {/* Asg Header */}
                          <div className="p-4 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-slate-200">{asg.title}</h4>
                              <p className="text-xs text-slate-400 mt-1">Hạn nộp: <span className="text-amber-400 font-medium">{new Date(asg.dueDate).toLocaleDateString()}</span></p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-300">
                                Đã chấm: <span className={markedCount === classStudents.length && classStudents.length > 0 ? 'text-emerald-400' : 'text-blue-400'}>{markedCount}/{classStudents.length}</span>
                              </span>
                            </div>
                          </div>
                          
                          {/* Marking Board */}
                          <div className="p-0">
                            <table className="w-full text-left text-sm">
                              <thead className="text-xs text-slate-500 bg-slate-900 border-b border-slate-800">
                                <tr>
                                  <th className="px-4 py-2 font-medium">Học viên</th>
                                  <th className="px-4 py-2 font-medium w-24">Điểm</th>
                                  <th className="px-4 py-2 font-medium text-center w-16">Done</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {asgSubmissions.map((sub: Submission) => {
                                  const stu = students.find((s: Student) => s.id === sub.studentId);
                                  return (
                                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                                      <td className="px-4 py-2.5">
                                        <p className="text-slate-200 font-medium">{stu?.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{stu?.studentCode}</p>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <input 
                                          type="number" 
                                          value={sub.score ?? ''} 
                                          onChange={e => updateSubmission(sub.id, { score: e.target.value ? Number(e.target.value) : undefined })}
                                          placeholder={`/${asg.points||0}`} 
                                          className={`w-full bg-slate-900 border rounded-lg px-2 py-1 text-center font-mono ${sub.isMarked ? 'border-emerald-500/50 text-emerald-400 focus:border-emerald-500' : 'border-slate-700 text-slate-300 focus:border-blue-500'}`} 
                                        />
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <input 
                                          type="checkbox" 
                                          checked={sub.isMarked} 
                                          onChange={e => updateSubmission(sub.id, { isMarked: e.target.checked })}
                                          className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900 cursor-pointer" 
                                        />
                                      </td>
                                    </tr>
                                  )
                                })}
                                {asgSubmissions.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-slate-500">Danh sách trống</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                    {classAssignments.length === 0 && <p className="text-center text-sm text-slate-500 py-10">Lớp chưa có bài tập nào.</p>}
                  </div>
                </div>
              )}

              {/* TAB 4: DOCUMENTS */}
              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-6">
                  <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20">
                    <h3 className="text-sm font-bold text-blue-300 mb-3 block">Thêm / Gán Tài Liệu</h3>
                    <form onSubmit={handleAssignOrCreateDocInClass} className="space-y-3">
                       <select value={selectedDocToAssign} onChange={e=>setSelectedDocToAssign(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200">
                          <option value="">-- Chọn tài liệu có sẵn từ Pool gốc --</option>
                          {teachingDocs.filter(d => !d.classIds.includes(selectedClass.id)).map(d => (
                            <option key={d.id} value={d.id}>{d.title}</option>
                          ))}
                       </select>
                       
                       {!selectedDocToAssign && (
                         <>
                           <div className="text-center text-xs text-slate-500 my-2">HOẶC</div>
                           <input type="text" placeholder="Tên tài liệu Mới (VD: Slide Bài 1)" value={docTitle} onChange={e=>setDocTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                           <input type="url" placeholder="Đường dẫn URL đính kèm" value={docUrl} onChange={e=>setDocUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                           <input type="text" placeholder="Mô tả..." value={docDesc} onChange={e=>setDocDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                         </>
                       )}
                       <button type="submit" disabled={!selectedDocToAssign && (!docTitle || !docUrl)} className="px-4 py-2.5 mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                         {selectedDocToAssign ? 'Gán Tài liệu đã chọn' : 'Tạo Link mới & Nhập vào Lớp'}
                       </button>
                    </form>
                  </div>

                  <div className="space-y-3">
                    {classDocs.map((doc: TeachingDoc) => (
                      <div key={doc.id} className="group flex items-start justify-between p-4 bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all">
                        <div className="flex-1 min-w-0 pr-4">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-slate-200 hover:text-blue-400 transition-colors inline-block mb-1 truncate w-full">
                            {doc.title}
                          </a>
                          {doc.description && <p className="text-xs text-slate-400 truncate w-full">{doc.description}</p>}
                          <p className="text-[10px] text-slate-600 mt-2 font-mono">{new Date(doc.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        <button onClick={() => removeDocFromClass(doc.id, selectedClass.id)} className="text-xs font-semibold px-2 py-1 rounded bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all border border-slate-600 hover:border-red-500/50 whitespace-nowrap">
                          Gỡ khỏi Lớp
                        </button>
                      </div>
                    ))}
                    {classDocs.length === 0 && <p className="text-center text-sm text-slate-500 py-10">Lớp chưa gán tài liệu nào.</p>}
                  </div>
                </div>
              )}
            </div>
            {/* End Drawer Content */}
          </div>
        </>
      )}

      {/* Shared Add Class Modal */}
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
                  <DateInput value={startDate} onChange={setStartDate} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Ngày kết thúc</label>
                  <DateInput value={endDate} onChange={setEndDate} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl" />
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
                  Trợ lý System sẽ tạo sẵn các Task <span className="font-mono bg-blue-500/20 px-1 rounded text-blue-200">TEACH</span> đồng bộ với Lịch dạy.
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
