import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStudyStore } from '../hooks/useStudyStore';
import DateInput from '../components/ui/DateInput';
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
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'COURSES' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📚 Khóa học
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'ASSIGNMENTS' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📝 Deadline
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'DOCUMENTS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
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

      {/* --- COURSES TAB --- */}
      {activeTab === 'COURSES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => (
            <div key={course.id} className="bg-slate-900/50 border border-slate-700/80 rounded-2xl p-6 group relative hover:border-indigo-500/50 transition-all flex flex-col">
              <button 
                onClick={() => { if(window.confirm('Xoá môn học này?')) deleteCourse(course.id) }} 
                className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
              <div className="mb-4">
                 <span className="inline-block px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded border border-indigo-500/20 mb-2">{course.courseCode}</span>
                 <h3 className="text-xl font-bold text-slate-100">{course.name}</h3>
              </div>
              <div className="text-sm text-slate-400 space-y-2 flex-1">
                 <p className="flex items-center gap-2"><span>📅</span> {new Date(course.startDate).toLocaleDateString('vi-VN')} - {new Date(course.endDate).toLocaleDateString('vi-VN')}</p>
                 <p className="flex items-center gap-2"><span>⏰</span> {course.scheduleRules.map(d => DAYS[d]).join(', ')}</p>
                 {course.lmsUrl && (
                   <a href={course.lmsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-indigo-400 hover:text-indigo-300 font-medium">
                     🌐 LMS Portal <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                   </a>
                 )}
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full py-16 text-center bg-slate-900/20 border border-dashed border-slate-700 rounded-3xl">
              <p className="text-slate-500">Chưa có môn học nào. Hãy thêm môn đầu tiên của học kỳ này!</p>
            </div>
          )}
        </div>
      )}

      {/* --- ASSIGNMENTS TAB --- */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1">
              <form onSubmit={handleAddAssignment} className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl sticky top-6 space-y-4">
                 <h3 className="text-lg font-bold text-slate-200 mb-2">Thêm Bài tập mới</h3>
                 <div>
                   <label className="block text-xs text-slate-500 mb-1">Tên bài tập</label>
                   <input type="text" required value={asgTitle} onChange={e=>setAsgTitle(e.target.value)} placeholder="VD: Essay Mid-term..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs text-slate-500 mb-1">Môn học</label>
                   <select required value={selectedCourseId} onChange={e=>setSelectedCourseId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm">
                      <option value="">-- Chọn môn --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs text-slate-500 mb-1">Hạn nộp</label>
                   <DateInput value={asgDue} onChange={setAsgDue} className="w-full bg-slate-950 border border-slate-800 rounded-xl" />
                 </div>
                 <div>
                   <label className="block text-xs text-slate-500 mb-1">Mức độ ưu tiên</label>
                   <div className="flex gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(p => (
                        <button key={p} type="button" onClick={() => setAsgPriority(p)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${asgPriority === p ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                          {p}
                        </button>
                      ))}
                   </div>
                 </div>
                 <button type="submit" disabled={!asgTitle || !asgDue || !selectedCourseId} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50">
                   Ghi chú Deadline
                 </button>
              </form>
           </div>
           
           <div className="lg:col-span-2 space-y-4">
              {assignments.map(asg => {
                const course = courses.find(c => c.id === asg.courseId);
                const isOverdue = new Date(asg.dueDate) < new Date() && asg.status !== 'DONE';
                return (
                  <div key={asg.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/30 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={asg.status === 'DONE'} 
                        onChange={e => updateAssignment(asg.id, { status: e.target.checked ? 'DONE' : 'TODO' })}
                        className="w-6 h-6 rounded-full border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500/20"
                      />
                      <div>
                        <h4 className={`font-bold transition-all ${asg.status === 'DONE' ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{asg.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{course?.courseCode}</span>
                          <span className={`text-xs ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-500'}`}>Hạn: {new Date(asg.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteAssignment(asg.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                       &times;
                    </button>
                  </div>
                )
              })}
              {assignments.length === 0 && <p className="text-center py-10 text-slate-500">Chưa có bài tập nào. Hãy tập trung học tập!</p>}
           </div>
        </div>
      )}

      {/* --- DOCUMENTS TAB --- */}
      {activeTab === 'DOCUMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {courses.map(course => {
             const courseDocs = docs.filter(d => d.courseId === course.id);
             return (
               <div key={course.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                 <div className="p-4 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
                    <h5 className="font-bold text-indigo-400 text-sm">{course.name}</h5>
                    <button onClick={() => {
                        setDocCourseId(course.id);
                        setShowDocModal(true);
                      }} className="text-slate-400 hover:text-white text-xs">+ Thêm file</button>
                 </div>
                 <div className="p-4 space-y-3 flex-1 min-h-[100px]">
                    {courseDocs.map(doc => (
                       <div key={doc.id} className="flex justify-between items-center group">
                         <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-blue-400 transition-colors truncate max-w-[80%]">
                           {doc.title}
                         </a>
                         <button onClick={() => deleteDoc(doc.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                       </div>
                    ))}
                    {courseDocs.length === 0 && <p className="text-[10px] text-slate-600 italic">Chưa có tài liệu</p>}
                 </div>
               </div>
             )
           })}
        </div>
      )}

      {/* --- ADD COURSE MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">Thêm Môn học Mới</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            
            <form onSubmit={handleAddCourse} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Mã môn học</label>
                   <input type="text" required value={courseCode} onChange={e=>setCourseCode(e.target.value.toUpperCase())} placeholder="VD: CS50" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 font-mono" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Tên môn học</label>
                   <input type="text" required value={courseName} onChange={e=>setCourseName(e.target.value)} placeholder="VD: Machine Learning" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">LMS URL (Nếu có)</label>
                <input type="url" value={lmsUrl} onChange={e=>setLmsUrl(e.target.value)} placeholder="https://canvas.school.edu" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Bắt đầu</label>
                   <DateInput value={courseStart} onChange={setCourseStart} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Kết thúc</label>
                   <DateInput value={courseEnd} onChange={setCourseEnd} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Lịch học</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map((d, i) => {
                    const active = scheduleRules.includes(i);
                    return (
                       <button key={i} type="button" onClick={() => setScheduleRules(prev => active ? prev.filter(x => x !== i) : [...prev, i].sort())} className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                         {d}
                       </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors">Huỷ</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">Lưu Môn học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD DOCUMENT MODAL --- */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">Thêm Tài liệu</h2>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleAddDoc} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tên tài liệu</label>
                <input type="text" required value={docTitle} onChange={e=>setDocTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">URL / Link</label>
                <input type="url" required value={docUrl} onChange={e=>setDocUrl(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Loại</label>
                <select value={docType} onChange={e=>setDocType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm">
                  <option value="SLIDE">Slide Bài giảng</option>
                  <option value="BOOK">Giáo trình / Sách</option>
                  <option value="REFERENCE">Tài liệu tham khảo</option>
                  <option value="MY_NOTES">Ghi chú cá nhân</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">Lưu tài liệu</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
