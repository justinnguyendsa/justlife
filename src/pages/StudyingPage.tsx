import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStudyStore } from '../hooks/useStudyStore';
import DateInput from '../components/ui/DateInput';
import Badge from '../components/ui/Badge';
import type { StudyDoc, Priority } from '../types';

export default function StudyingPage() {
  const { tab } = useParams<{ tab: string }>();
  const activeTab = (tab?.toUpperCase() || 'COURSES') as 'COURSES' | 'ASSIGNMENTS' | 'DOCUMENTS';

  const {
    courses, assignments, docs,
    addCourse, deleteCourse,
    addAssignment, updateAssignment, deleteAssignment,
    addDoc, deleteDoc
  } = useStudyStore();

  const [showModal, setShowModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  
  // Add Course States
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [lmsUrl, setLmsUrl] = useState('');
  const [courseStart, setCourseStart] = useState('');
  const [courseEnd, setCourseEnd] = useState('');
  const [scheduleRules, setScheduleRules] = useState<number[]>([]);

  // Add Assignment States
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [asgPriority, setAsgPriority] = useState<Priority>('MEDIUM');

  // Add Doc States
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docType, setDocType] = useState<StudyDoc['type']>('SLIDE');
  const [docCourseId, setDocCourseId] = useState('');

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName || !courseCode || !courseStart || !courseEnd) return;
    await addCourse(courseName, courseCode, scheduleRules, courseStart, courseEnd, lmsUrl);
    setShowModal(false);
    setCourseName(''); setCourseCode(''); setLmsUrl(''); setCourseStart(''); setCourseEnd(''); setScheduleRules([]);
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle || !asgDue || !selectedCourseId) return;
    await addAssignment(selectedCourseId, asgTitle, asgDue, asgPriority);
    setAsgTitle(''); setAsgDue(''); setSelectedCourseId('');
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docUrl || !docCourseId) return;
    await addDoc(docCourseId, docTitle, docUrl, docType);
    setShowDocModal(false);
    setDocTitle(''); setDocUrl(''); setDocCourseId('');
  };

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-3">
            Học tập & Nghiên cứu
          </h1>
          <div className="flex bg-slate-800/50 p-1 rounded-xl w-fit">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'COURSES' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📚 Khóa học
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'ASSIGNMENTS' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📝 Deadline
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'DOCUMENTS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📁 Tài liệu
            </div>
          </div>
        </div>
        {activeTab === 'COURSES' && (
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 text-sm transition-all">
            + Thêm Môn học
          </button>
        )}
      </header>

      {/* --- COURSES TAB (TABLE VIEW) --- */}
      {activeTab === 'COURSES' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4 font-semibold">Mã môn</th>
                <th className="px-5 py-4 font-semibold">Tên môn học</th>
                <th className="px-5 py-4 font-semibold hidden md:table-cell">Lịch học</th>
                <th className="px-5 py-4 font-semibold hidden lg:table-cell text-center">LMS</th>
                <th className="px-5 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {courses.map(course => (
                <tr key={course.id} className="group hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-mono text-indigo-400 text-xs">{course.courseCode}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-200">{course.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-slate-400 text-xs">
                    {course.scheduleRules.map(d => DAYS[d]).join(', ')}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-center">
                    {course.lmsUrl ? (
                      <a href={course.lmsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                        <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ) : <span className="text-slate-700">−</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => { if(window.confirm('Xoá môn học này?')) deleteCourse(course.id) }} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic">Chưa có môn học nào được ghi lại.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ASSIGNMENTS TAB --- */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1">
              <form onSubmit={handleAddAssignment} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl sticky top-6 space-y-4 shadow-xl">
                 <h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2"><span>✨</span> Thêm Deadline</h3>
                 <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tên bài tập</label>
                   <input type="text" required value={asgTitle} onChange={e=>setAsgTitle(e.target.value)} placeholder="VD: Essay Mid-term..." className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Môn học</label>
                   <select required value={selectedCourseId} onChange={e=>setSelectedCourseId(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer">
                      <option value="">-- Chọn môn --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Hạn nộp</label>
                   <DateInput value={asgDue} onChange={setAsgDue} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl" />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Mức độ ưu tiên</label>
                   <div className="flex gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(p => (
                        <button key={p} type="button" onClick={() => setAsgPriority(p)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${asgPriority === p ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                          {p}
                        </button>
                      ))}
                   </div>
                 </div>
                 <button type="submit" disabled={!asgTitle || !asgDue || !selectedCourseId} className="w-full py-3 mt-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50">
                   Ghi chú Deadline
                 </button>
              </form>
           </div>
           
           <div className="lg:col-span-2">
              <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="w-12 py-4 pl-4"></th>
                      <th className="px-4 py-4 font-semibold">Bài tập</th>
                      <th className="px-4 py-4 font-semibold hidden sm:table-cell">Môn học</th>
                      <th className="px-4 py-4 font-semibold hidden md:table-cell text-center">Ưu tiên</th>
                      <th className="px-4 py-4 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {assignments.map(asg => {
                      const course = courses.find(c => c.id === asg.courseId);
                      const isOverdue = new Date(asg.dueDate) < new Date() && asg.status !== 'DONE';
                      return (
                        <tr key={asg.id} className={`group hover:bg-slate-800/40 transition-colors ${asg.status === 'DONE' ? 'opacity-50' : ''}`}>
                          <td className="pl-4 py-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={asg.status === 'DONE'} 
                              onChange={e => updateAssignment(asg.id, { status: e.target.checked ? 'DONE' : 'TODO' })}
                              className="w-5 h-5 rounded-full border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <p className={`font-bold transition-all ${asg.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-200'}`}>{asg.title}</p>
                            <p className={`text-[10px] mt-1 ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-500'}`}>Hạn: {new Date(asg.dueDate).toLocaleDateString()}</p>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                             <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">{course?.courseCode}</span>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell text-center">
                             <Badge variant="priority" value={asg.priority} size="sm" />
                          </td>
                          <td className="px-4 py-4 text-right">
                             <button onClick={() => deleteAssignment(asg.id)} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </td>
                        </tr>
                      )
                    })}
                    {assignments.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic">Chưa có bài tập nào. Hãy tập trung học tập!</td></tr>}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {/* --- DOCUMENTS TAB (TABLE VIEW) --- */}
      {activeTab === 'DOCUMENTS' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Tài liệu</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Môn học</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell text-center">Loại</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {docs.map(doc => {
                const course = courses.find(c => c.id === doc.courseId);
                return (
                  <tr key={doc.id} className="group hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                       <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-200 hover:text-blue-400 transition-colors flex items-center gap-2">
                         <span>📄</span> {doc.title}
                       </a>
                       <p className="text-[10px] text-slate-500 mt-1">{new Date(doc.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                       <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-mono rounded border border-indigo-500/20">{course?.courseCode}</span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-center">
                       <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">{doc.type}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => deleteDoc(doc.id)} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </td>
                  </tr>
                )
              })}
              {docs.length === 0 && <tr><td colSpan={4} className="py-20 text-center text-slate-500 italic">Chưa có tài liệu học tập nào được lưu.</td></tr>}
            </tbody>
          </table>
          
          {/* Add Doc Floating Button within Tab Area? No, let's just make it clear how to add */}
          {courses.length > 0 && (
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/20 text-center">
               <button onClick={() => {
                   if (courses.length > 0) {
                     setDocCourseId(courses[0].id);
                     setShowDocModal(true);
                   }
               }} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Thêm tài liệu học tập mới</button>
            </div>
          )}
        </div>
      )}

      {/* --- ADD COURSE MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center text-slate-100">
              <h2 className="text-xl font-bold">Thêm Môn học Mới</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200 text-2xl font-light">&times;</button>
            </div>
            
            <form onSubmit={handleAddCourse} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Mã môn học</label>
                   <input type="text" required value={courseCode} onChange={e=>setCourseCode(e.target.value.toUpperCase())} placeholder="VD: CS50" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tên môn học</label>
                   <input type="text" required value={courseName} onChange={e=>setCourseName(e.target.value)} placeholder="VD: Machine Learning" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">LMS URL (Nếu có)</label>
                <input type="url" value={lmsUrl} onChange={e=>setLmsUrl(e.target.value)} placeholder="https://canvas.school.edu" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Bắt đầu</label>
                   <DateInput value={courseStart} onChange={setCourseStart} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl" />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Kết thúc</label>
                   <DateInput value={courseEnd} onChange={setCourseEnd} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 ml-1">Lịch học</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => {
                    const active = scheduleRules.includes(i);
                    return (
                       <button key={i} type="button" onClick={() => setScheduleRules(prev => active ? prev.filter(x => x !== i) : [...prev, i].sort())} className={`w-11 h-11 rounded-xl text-xs font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-700'}`}>
                         {d}
                       </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-medium transition-colors">Huỷ</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/25">Lưu Môn học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD DOCUMENT MODAL --- */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 text-slate-100">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-lg font-bold">Thêm Tài liệu</h2>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-200 text-2xl font-light">&times;</button>
            </div>
            <form onSubmit={handleAddDoc} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Môn học</label>
                <select value={docCourseId} onChange={e=>setDocCourseId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tên tài liệu</label>
                <input type="text" required value={docTitle} onChange={e=>setDocTitle(e.target.value)} placeholder="VD: Bài giảng số 1" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">URL / Link</label>
                <input type="url" required value={docUrl} onChange={e=>setDocUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Loại</label>
                <select value={docType} onChange={e=>setDocType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                  <option value="SLIDE">Slide Bài giảng</option>
                  <option value="BOOK">Giáo trình / Sách</option>
                  <option value="REFERENCE">Tài liệu tham khảo</option>
                  <option value="MY_NOTES">Ghi chú cá nhân</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25">Lưu tài liệu</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
