import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTeachingStore } from '../hooks/useTeachingStore';
import DateInput from '../components/ui/DateInput';
import { readImportFile, parsePastedText, autoDetectMapping, type RawImportData } from '../utils/importHelpers';
import type { Class, Student, Submission, TeachingDoc, Assignment, Attendance } from '../types';

// Utility to generate session dates
function generateSessions(startStr: string, endStr: string, daysOfWeek: number[]) {
  const sessions: string[] = [];
  if (!startStr || !endStr || daysOfWeek.length === 0) return sessions;

  const start = new Date(startStr);
  const end = new Date(endStr);
  const current = new Date(start);

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
  const mainTab = (tab?.toUpperCase() || 'CLASSES') as 'CLASSES' | 'STUDENTS' | 'DOCUMENTS';

  const {
    classes, students, assignments, submissions, attendances, teachingDocs,
    addClass, updateClass, deleteClass, addStudent, updateStudent, bulkAddStudents, deleteStudent, addAssignment, updateAssignment, deleteAssignment,
    updateSubmission, toggleAttendance, addDocument, updateDocument, deleteDocument,
    assignStudentToClass, removeStudentFromClass, assignDocToClass, removeDocFromClass
  } = store;

  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'ASSIGNMENTS' | 'ATTENDANCE' | 'DOCUMENTS'>('STUDENTS');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importData, setImportData] = useState('');
  const [rawData, setRawData] = useState<RawImportData | null>(null);
  const [fieldMapping, setFieldMapping] = useState({ name: '', studentCode: '', email: '' });
  const [importPreview, setImportPreview] = useState<Array<{ name: string, studentCode: string, email?: string }>>([]);

  // Editing States
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingDoc, setEditingDoc] = useState<TeachingDoc | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'CLASS' | 'STUDENT' | 'ASG' | 'DOC', name: string } | null>(null);

  // Forms
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleRules, setScheduleRules] = useState<number[]>([]);
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [asgPoints, setAsgPoints] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [selectedDocToAssign, setSelectedDocToAssign] = useState('');

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
    toggleAttendance(classId, studentId, date, nextStatus || 'PRESENT');
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readImportFile(file);
      setRawData(data);
      const mapping = autoDetectMapping(data.headers);
      setFieldMapping(mapping as any);
      setImportStep(2);
    } catch (err) {
      alert('Lỗi đọc file: ' + err);
    }
  };

  const handleTextImport = () => {
    if (!importData.trim()) return;
    const data = parsePastedText(importData);
    setRawData(data);
    const mapping = autoDetectMapping(data.headers);
    setFieldMapping(mapping as any);
    setImportStep(2);
  };

  const applyMapping = () => {
    if (!rawData) return;
    const mapped = rawData.rows.map(row => ({
      name: row[fieldMapping.name] || 'Chưa rõ',
      studentCode: row[fieldMapping.studentCode] || `ID_${Math.floor(Math.random() * 10000)}`,
      email: row[fieldMapping.email] || ''
    }));
    setImportPreview(mapped);
    setImportStep(3);
  };

  const execImport = async () => {
    if (importPreview.length === 0) return;
    await bulkAddStudents(importPreview, selectedClass?.id);
    resetImport();
  };

  const resetImport = () => {
    setShowImportModal(false);
    setImportStep(1);
    setImportData('');
    setRawData(null);
    setImportPreview([]);
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
            <div className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'CLASSES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
              👨‍🏫 Lớp học ({classes.length})
            </div>
            <div className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'STUDENTS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              🎓 Kho Học viên ({students.length})
            </div>
            <div className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'DOCUMENTS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📂 Kho Tài liệu ({teachingDocs.length})
            </div>
          </div>
        </div>
        {mainTab === 'CLASSES' && <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 text-sm transition-all whitespace-nowrap">+ Thêm Lớp</button>}
        {mainTab === 'STUDENTS' && <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 text-sm transition-all whitespace-nowrap">📥 Import Học Viên</button>}
      </header>

      {/* ----------- MAIN TAB: CLASSES (TABLE VIEW) ----------- */}
      {mainTab === 'CLASSES' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4 font-semibold">Mã học phần</th>
                <th className="px-5 py-4 font-semibold">Tên lớp học</th>
                <th className="px-5 py-4 font-semibold hidden md:table-cell">Lịch học</th>
                <th className="px-5 py-4 font-semibold hidden sm:table-cell text-center">Sỹ số</th>
                <th className="px-5 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {classes.map((cls: Class) => {
                const stuCount = students.filter((s: Student) => s.classIds.includes(cls.id)).length;
                return (
                  <tr key={cls.id} className="group hover:bg-slate-800/40 transition-colors cursor-pointer" onClick={() => { setSelectedClass(cls); setActiveTab('STUDENTS'); }}>
                    <td className="px-5 py-4 font-mono text-blue-400 text-xs">{cls.courseCode}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-200">{cls.name}</p>
                      {cls.description && <p className="text-[10px] text-slate-500 mt-1 truncate max-w-xs">{cls.description}</p>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-slate-400 text-xs">
                      {cls.scheduleRules.map((d: number) => DAYS[d]).join(', ')}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-center">
                      <span className="px-2 py-1 bg-slate-800 rounded font-bold text-slate-300">{stuCount} SV</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2 pr-2">
                        <button onClick={(e) => { e.stopPropagation(); setEditingClass(cls); }} className="p-2 text-slate-500 hover:text-blue-400 bg-slate-800/50 rounded-lg transition-all" title="Sửa lớp học">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedClass(cls); setActiveTab('ATTENDANCE'); }} className="p-2 text-slate-500 hover:text-amber-400 bg-slate-800/50 rounded-lg" title="Điểm danh">📋</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: cls.id, type: 'CLASS', name: cls.name }); }} className="p-2 text-slate-500 hover:text-red-400 bg-slate-800/50 rounded-lg transition-all" title="Xóa">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {classes.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic">Chưa có lớp học nào trong danh sách.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------- MAIN TAB: STUDENTS POOL (TABLE VIEW) ----------- */}
      {mainTab === 'STUDENTS' && (
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-1 border border-indigo-500/20 bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 h-fit shadow-xl">
            <h3 className="text-lg font-bold text-indigo-400 mb-5 flex items-center gap-2"><span>👤</span> Tạo Học Viên</h3>
            <form onSubmit={handleAddNewStudentToPool} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Họ và Tên</label>
                <input type="text" required placeholder="VD: Nguyễn Văn A" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Mã số học viên</label>
                <input type="text" required placeholder="VD: 20210001" value={studentCode} onChange={e => setStudentCode(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <button type="submit" disabled={!studentName || !studentCode} className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50">Lưu vào Hệ Thống</button>
            </form>
          </div>
          <div className="lg:col-span-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Họ tên & Mã SV</th>
                    <th className="px-5 py-4 font-semibold">Lớp đang theo học</th>
                    <th className="px-5 py-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {students.map(s => (
                    <tr key={s.id} className="group hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-slate-200 font-bold">{s.name}</p>
                        <p className="text-slate-500 font-mono text-xs mt-0.5">{s.studentCode}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {s.classIds.map(cid => {
                            const cls = classes.find(c => c.id === cid);
                            return cls ? <span key={cid} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold rounded font-mono uppercase">{cls.courseCode}</span> : null;
                          })}
                          {s.classIds.length === 0 && <span className="text-slate-600 italic text-xs">Chưa xếp lớp</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditingStudent(s)} className="p-2 text-slate-500 hover:text-blue-400 transition-all" title="Sửa">✏️</button>
                          <button onClick={() => setDeleteConfirm({ id: s.id, type: 'STUDENT', name: s.name })} className="p-2 text-slate-500 hover:text-red-400 transition-all" title="Xóa">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={3} className="text-center py-20 text-slate-500 italic">Kho học viên trống.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------- MAIN TAB: DOCUMENTS POOL (TABLE VIEW) ----------- */}
      {mainTab === 'DOCUMENTS' && (
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-1 border border-emerald-500/20 bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 h-fit shadow-xl">
            <h3 className="text-lg font-bold text-emerald-400 mb-5 flex items-center gap-2"><span>📂</span> Tạo Tài Liệu</h3>
            <form onSubmit={handleAddNewDocToPool} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tên tài liệu</label>
                <input type="text" required placeholder="VD: Đề cương chi tiết" value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Đường dẫn URL</label>
                <input type="url" required placeholder="https://..." value={docUrl} onChange={e => setDocUrl(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Mô tả ngắn</label>
                <input type="text" placeholder="Phân phối chương trình..." value={docDesc} onChange={e => setDocDesc(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <button type="submit" disabled={!docTitle || !docUrl} className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50">Lưu vào Kho Gốc</button>
            </form>
          </div>
          <div className="lg:col-span-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Tài liệu & Mô tả</th>
                    <th className="px-5 py-4 font-semibold hidden sm:table-cell">Lớp liên kết</th>
                    <th className="px-5 py-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {teachingDocs.map(d => (
                    <tr key={d.id} className="group hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-200 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                          <span>📄</span> {d.title}
                        </a>
                        {d.description && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{d.description}</p>}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {d.classIds.length > 0 ? (
                            d.classIds.map(cid => {
                              const cls = classes.find(c => c.id === cid);
                              return cls && <span key={cid} className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded font-mono uppercase">{cls.courseCode}</span>
                            })
                          ) : <span className="text-xs italic text-slate-600">Chưa xếp lớp</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditingDoc(d)} className="p-2 text-slate-500 hover:text-blue-400 transition-all" title="Sửa">✏️</button>
                          <button onClick={() => setDeleteConfirm({ id: d.id, type: 'DOC', name: d.title })} className="p-2 text-slate-500 hover:text-red-400 transition-all" title="Xóa">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teachingDocs.length === 0 && <tr><td colSpan={3} className="text-center py-20 text-slate-500 italic">Kho tài liệu trống.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ----------- CLASS DETAILS DRAWER ----------- */}
      {selectedClass && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedClass(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-2/3 lg:w-[85%] bg-slate-900 border-l border-slate-800 shadow-3xl flex flex-col h-full transform transition-transform animate-in slide-in-from-right duration-300">

            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/80 backdrop-blur-xl">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-500/10 px-2 py-1 rounded inline-block mb-3 border border-blue-500/20">{selectedClass.courseCode}</span>
                <h2 className="text-3xl font-extrabold text-slate-100 leading-none">{selectedClass.name}</h2>
              </div>
              <button onClick={() => setSelectedClass(null)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex bg-slate-900/50 border-b border-slate-800 overflow-x-auto no-scrollbar">
              {[
                { id: 'STUDENTS', label: 'Học viên', icon: '🎓', color: 'indigo' },
                { id: 'ATTENDANCE', label: 'Điểm danh', icon: '📋', color: 'amber' },
                { id: 'ASSIGNMENTS', label: 'Học phẩm/Điểm', icon: '📝', color: 'emerald' },
                { id: 'DOCUMENTS', label: 'Tài liệu lớp', icon: '📂', color: 'blue' }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className={`px-6 py-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? `border-${t.color}-500 text-${t.color}-400 bg-${t.color}-500/5` : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {/* TAB 1: STUDENTS */}
              {activeTab === 'STUDENTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20 shadow-lg sticky top-0">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2"><span>➕</span> Thêm vào Lớp</h3>
                        <button onClick={() => setShowImportModal(true)} className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30 hover:bg-indigo-500/40 font-bold uppercase">Import</button>
                      </div>
                      <form onSubmit={handleAssignOrCreateStudentInClass} className="space-y-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Chọn từ Pool gốc</label>
                          <select value={selectedStudentToAssign} onChange={e => setSelectedStudentToAssign(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Chọn một học viên --</option>
                            {students.filter(s => !s.classIds.includes(selectedClass.id)).map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>
                            ))}
                          </select>
                        </div>
                        {!selectedStudentToAssign && (
                          <>
                            <div className="relative flex items-center justify-center py-2"><span className="absolute bg-slate-900 px-2 text-[10px] text-slate-500 font-bold uppercase">Hoặc Tạo Mới</span><div className="w-full h-px bg-slate-800"></div></div>
                            <div>
                              <input type="text" placeholder="Họ tên SV..." value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 mb-3" />
                              <input type="text" placeholder="MS học viên..." value={studentCode} onChange={e => setStudentCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono text-center" />
                            </div>
                          </>
                        )}
                        <button type="submit" disabled={!selectedStudentToAssign && (!studentName || !studentCode)} className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/25">
                          {selectedStudentToAssign ? 'Gán Học viên' : 'Tạo mới & Gán'}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/20">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/80 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="px-5 py-4 font-bold">Thành viên lớp ({classStudents.length})</th>
                            <th className="px-5 py-4 font-bold text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {classStudents.map((s: Student) => (
                            <tr key={s.id} className="group hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-500/20 shadow-inner">
                                    {s.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-200">{s.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.studentCode}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2 pr-2">
                                  <button onClick={() => setEditingStudent(s)} className="p-2 text-slate-500 hover:text-blue-400 transition-all" title="Sửa học viên">✏️</button>
                                  <button onClick={() => { if (window.confirm('Gỡ học viên này khỏi lớp?')) removeStudentFromClass(s.id, selectedClass.id) }} className="text-[10px] font-bold uppercase tracking-tight px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50 transition-all">
                                    Gỡ khỏi Lớp
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {classStudents.length === 0 && <tr><td colSpan={2} className="text-center py-20 text-slate-600 italic">Chưa có học viên nào trong lớp.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE (GRID) */}
              {activeTab === 'ATTENDANCE' && (
                <div className="space-y-6">
                  <header className="flex items-center justify-between bg-slate-950/40 p-5 rounded-2xl border border-slate-800 shadow-inner">
                    <div className="flex gap-5 text-[10px] items-center">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">✓ CÓ MẶT</span>
                      <span className="flex items-center gap-1.5 font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">✕ VẮNG</span>
                      <span className="flex items-center gap-1.5 font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">✉️ CÓ PHÉP</span>
                      <span className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded">⏰ MUỘN</span>
                    </div>
                    <p className="text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1 rounded-lg">Hướng dẫn: Click vào từng ô để xoay vòng trạng thái</p>
                  </header>

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                        <thead className="bg-slate-800/90 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 z-20 shadow-md">
                          <tr>
                            <th className="px-6 py-5 border-r border-slate-700 min-w-[220px] sticky left-0 bg-slate-800 z-30">Học viên</th>
                            {sessions.map((s, idx) => (
                              <th key={s} className="px-2 py-5 text-center border-r border-slate-700 min-w-[85px] last:border-0 grow">
                                <div className="text-slate-400 opacity-60">SESS #{idx + 1}</div>
                                <div className="text-slate-100 text-base">{s.split('-').reverse().slice(0, 2).join('/')}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {classStudents.map((stu: Student) => (
                            <tr key={stu.id} className="group hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 border-r border-slate-700 sticky left-0 bg-slate-900 z-10 group-hover:bg-slate-800 shadow-xl transition-colors">
                                <p className="text-slate-200 font-bold text-base">{stu.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-wider">{stu.studentCode}</p>
                              </td>
                              {sessions.map(date => {
                                const attRecord = attendances.find((a: Attendance) => a.classId === selectedClass.id && a.studentId === stu.id && a.date === date);
                                return (
                                  <td
                                    key={date}
                                    onClick={() => cycleStatus(selectedClass.id, stu.id, date, attRecord?.status)}
                                    className="px-2 py-4 text-center border-r border-slate-700 last:border-0 cursor-pointer hover:bg-slate-700/50 transition-all select-none"
                                  >
                                    <div className="transform scale-125">{getStatusIcon(attRecord?.status)}</div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {classStudents.length === 0 && <tr><td colSpan={sessions.length + 1} className="py-24 text-center text-slate-600 font-medium bg-slate-950/20">Chưa có dữ liệu học viên để điểm danh.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ASSIGNMENTS (TABLE VIEW) */}
              {activeTab === 'ASSIGNMENTS' && (
                <div className="grid grid-cols-1 gap-10">
                  <form onSubmit={handleAddAssignment} className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 flex flex-col md:flex-row items-end gap-4 shadow-xl">
                    <div className="flex-1 space-y-4 w-full">
                      <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2"><span>✨</span> Giao Bài Mới</h3>
                      <input type="text" required placeholder="Tên bài tập..." value={asgTitle} onChange={e => setAsgTitle(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="w-full md:w-48">
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1.5 ml-1">Hạn nộp</label>
                      <DateInput value={asgDue} onChange={setAsgDue} className="w-full bg-slate-950 border border-slate-800 rounded-xl" />
                    </div>
                    <div className="w-full md:w-24">
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1.5 ml-1">Thang điểm</label>
                      <input type="number" placeholder="10" value={asgPoints} onChange={e => setAsgPoints(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-center font-bold" />
                    </div>
                    <button type="submit" disabled={!asgTitle || !asgDue || classStudents.length === 0} className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 h-[46px]">GIAO BÀI</button>
                  </form>

                  <div className="space-y-8">
                    {classAssignments.map((asg: Assignment) => {
                      const asgSubmissions = submissions.filter((sub: Submission) => sub.assignmentId === asg.id);
                      const markedCount = asgSubmissions.filter((sub: Submission) => sub.isMarked).length;
                      return (
                        <div key={asg.id} className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                          <header className="p-5 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">📝</div>
                              <div>
                                <h4 className="text-xl font-black text-slate-100">{asg.title}</h4>
                                <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Hạn: <span className="text-amber-500">{new Date(asg.dueDate).toLocaleDateString()}</span></p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingAssignment(asg)} className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 rounded-xl transition-all" title="Sửa bài tập">✏️</button>
                              <button onClick={() => setDeleteConfirm({ id: asg.id, type: 'ASG', name: asg.title })} className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 rounded-xl transition-all" title="Xóa">🗑️</button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold">CHẤM ĐIỂM</span>
                                <span className={`text-base font-black ${markedCount === classStudents.length && classStudents.length > 0 ? 'text-emerald-400' : 'text-blue-400'}`}>{markedCount}/{classStudents.length}</span>
                              </div>
                            </div>
                          </header>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[10px] uppercase font-bold text-slate-600 bg-slate-900/50 border-b border-slate-800">
                                <tr>
                                  <th className="px-6 py-4">Học viên / Mã SV</th>
                                  <th className="px-6 py-4 w-32 text-center">Điểm số</th>
                                  <th className="px-6 py-4 w-24 text-center">Hoàn thành</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {asgSubmissions.map((sub: Submission) => {
                                  const stu = students.find((s: Student) => s.id === sub.studentId);
                                  return (
                                    <tr key={sub.id} className="group hover:bg-slate-800/20 transition-colors">
                                      <td className="px-6 py-3">
                                        <p className="text-slate-200 font-bold text-base">{stu?.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{stu?.studentCode}</p>
                                      </td>
                                      <td className="px-6 py-3">
                                        <input type="number" value={sub.score ?? ''} onChange={e => updateSubmission(sub.id, { score: e.target.value ? Number(e.target.value) : undefined })}
                                          placeholder={`/${asg.points || 0}`} className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-center font-black transition-all ${sub.isMarked ? 'border-emerald-500/40 text-emerald-400' : 'border-slate-800 text-slate-400 focus:border-indigo-500'}`} />
                                      </td>
                                      <td className="px-6 py-3 text-center">
                                        <input type="checkbox" checked={sub.isMarked} onChange={e => updateSubmission(sub.id, { isMarked: e.target.checked })}
                                          className="w-6 h-6 rounded-lg border-slate-700 text-emerald-500 bg-slate-950 transition-all cursor-pointer" />
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: DOCUMENTS (TABLE VIEW) */}
              {activeTab === 'DOCUMENTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl rounded-3xl p-6 h-fit shadow-xl">
                    <h3 className="text-sm font-bold text-blue-400 mb-5 flex items-center gap-2"><span>📎</span> Gán Tài Liệu</h3>
                    <form onSubmit={handleAssignOrCreateDocInClass} className="space-y-4">
                      <select value={selectedDocToAssign} onChange={e => setSelectedDocToAssign(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Chọn từ Pool gốc --</option>
                        {teachingDocs.filter(d => !d.classIds.includes(selectedClass.id)).map(d => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                      {!selectedDocToAssign && (
                        <>
                          <div className="relative flex items-center justify-center py-1"><span className="absolute bg-slate-900 px-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">Hoặc Nhập Link</span><div className="w-full h-px bg-slate-800"></div></div>
                          <input type="text" placeholder="Tên tài liệu..." value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                          <input type="url" placeholder="https://..." value={docUrl} onChange={e => setDocUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100" />
                        </>
                      )}
                      <button type="submit" disabled={!selectedDocToAssign && (!docTitle || !docUrl)} className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/25 transition-all">
                        Gán vào Lớp
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 overflow-hidden shadow-2xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-800">
                          <tr>
                            <th className="px-6 py-4">Tên tài liệu & Link</th>
                            <th className="px-6 py-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {classDocs.map((doc: TeachingDoc) => (
                            <tr key={doc.id} className="group hover:bg-slate-800/40 transition-colors">
                              <td className="px-6 py-4">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-slate-200 hover:text-blue-400 flex items-center gap-2 transition-colors">
                                  <span>📎</span> {doc.title}
                                </a>
                                {doc.description && <p className="text-xs text-slate-500 mt-1">{doc.description}</p>}
                              </td>
                              <td className="px-6 py-4 text-right pr-6">
                                <div className="flex justify-end gap-2 items-center">
                                  <button onClick={() => setEditingDoc(doc)} className="p-2 text-slate-500 hover:text-blue-400 transition-all" title="Sửa tài liệu">✏️</button>
                                  <button onClick={() => { if (window.confirm('Gỡ tài liệu này khỏi lớp?')) removeDocFromClass(doc.id, selectedClass.id) }} className="text-[10px] font-bold uppercase tracking-tighter px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/50 rounded-lg transition-all">
                                    Gỡ khỏi Lớp
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {classDocs.length === 0 && <tr><td colSpan={2} className="text-center py-20 text-slate-600 italic">Lớp chưa gán tài liệu nào.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Shared Add Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-[32px] w-full max-w-lg shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-7 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-2xl font-black text-slate-100">✨ Tạo Lớp Mới</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
            </div>

            <form onSubmit={handleAddClass} className="p-7 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 ml-1">Mã học phần</label>
                  <input type="text" required value={courseCode} onChange={e => setCourseCode(e.target.value.toUpperCase())} placeholder="CS101" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 ml-1">Tên lớp học</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Giải tích 1" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 ml-1">Lịch học</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((dayLabel, idx) => {
                    const active = scheduleRules.includes(idx);
                    return (
                      <button key={idx} type="button" onClick={() => toggleDay(idx)}
                        className={`w-12 h-12 rounded-2xl text-xs font-black transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-700'}`}>
                        {dayLabel}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 ml-1">Bắt đầu</label>
                  <DateInput value={startDate} onChange={setStartDate} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5 ml-1">Kết thúc</label>
                  <DateInput value={endDate} onChange={setEndDate} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl" />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all">HUỶ</button>
                <button type="submit" disabled={scheduleRules.length === 0 || !name || !startDate || !endDate} className="flex-1 px-4 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30">TẠO LỚP HỌC</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal - Sprint 20 Refactored */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-[32px] w-full max-w-5xl shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                   {importStep}
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-slate-100 flex items-center gap-3">📥 Nhập Học Viên {selectedClass && <span className="text-blue-400 font-mono text-xs">» {selectedClass.courseCode}</span>}</h2>
                   <div className="flex gap-4 mt-1">
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${importStep >= 1 ? 'text-indigo-400' : 'text-slate-600'}`}>1. Tải lên</span>
                      <span className="text-slate-700">/</span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${importStep >= 2 ? 'text-indigo-400' : 'text-slate-600'}`}>2. Ánh xạ (Mapping)</span>
                      <span className="text-slate-700">/</span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${importStep >= 3 ? 'text-indigo-400' : 'text-slate-600'}`}>3. Hoàn tất</span>
                   </div>
                 </div>
               </div>
               <button onClick={resetImport} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {importStep === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="space-y-6">
                      <div className="bg-slate-950/50 border-2 border-dashed border-slate-800 rounded-[28px] p-10 flex flex-col items-center justify-center text-center group hover:border-indigo-500/50 transition-all cursor-pointer relative">
                        <input type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleFileImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="w-20 h-20 bg-slate-800 rounded-[24px] flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">📄</div>
                        <h3 className="text-slate-200 font-black text-lg mb-2">Chọn tệp tin</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-bold">Hỗ trợ .xlsx, .csv, .json<br/>Kéo thả file vào đây để bắt đầu</p>
                      </div>
                      
                      <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 flex items-center gap-3 text-blue-400">
                        <span className="text-xl">💡</span>
                        <p className="text-[10px] font-bold leading-tight uppercase">Mẹo: Bạn có thể chọn toàn bộ vùng trong Excel/Sheets và dán vào ô bên cạnh để import nhanh hơn.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-slate-400 mb-1 ml-1 uppercase">Hoặc dán văn bản từ Spreadsheet</label>
                      <textarea 
                        value={importData} 
                        onChange={e => setImportData(e.target.value)} 
                        placeholder="Nguyễn Văn A	SV001&#10;Trần Thị B	SV002"
                        className="w-full h-64 bg-slate-950/50 border border-slate-800 rounded-[24px] p-6 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-800"
                      />
                      <button onClick={handleTextImport} disabled={!importData.trim()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-indigo-600/30">🔍 XỬ LÝ VĂN BẢN</button>
                    </div>
                  </div>
                )}

                {importStep === 2 && rawData && (
                  <div className="animate-in slide-in-from-right-4 duration-300 max-w-3xl mx-auto space-y-8">
                     <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-white">📏 Ánh xạ trường dữ liệu</h3>
                        <p className="text-sm text-slate-500 font-bold">Hãy chọn các cột tương ứng từ dữ liệu của bạn để chúng tôi hiểu đúng.</p>
                     </div>

                     <div className="grid grid-cols-1 gap-6 bg-slate-950/30 p-8 rounded-[32px] border border-slate-800">
                        {[
                          { label: 'Tên học viên', field: 'name', emoji: '👤' },
                          { label: 'Mã số học viên', field: 'studentCode', emoji: '🆔' },
                          { label: 'Địa chỉ Email', field: 'email', emoji: '📧' }
                        ].map(item => (
                          <div key={item.field} className="grid grid-cols-2 items-center gap-8">
                            <div className="p-4 bg-slate-900 rounded-2xl flex items-center gap-4 border border-slate-800">
                               <span className="text-xl">{item.emoji}</span>
                               <span className="text-xs font-black text-slate-300 uppercase">{item.label}</span>
                            </div>
                            <select 
                              value={fieldMapping[item.field as keyof typeof fieldMapping]}
                              onChange={(e) => setFieldMapping({...fieldMapping, [item.field]: e.target.value})}
                              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-slate-100 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            >
                               <option value="">-- [Bỏ qua trường này] --</option>
                               {rawData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                     </div>

                     <div className="flex gap-4">
                        <button onClick={() => setImportStep(1)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all">← Quay lại</button>
                        <button onClick={applyMapping} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all">Tiếp tục →</button>
                     </div>
                  </div>
                )}

                {importStep === 3 && (
                  <div className="animate-in zoom-in-95 duration-300 space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-lg font-black text-white">✨ Preview: Sẵn sàng nhập {importPreview.length} học viên</h3>
                         <button onClick={() => setImportStep(2)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline decoration-indigo-500/30">Thay đổi Mapping</button>
                      </div>

                      <div className="border border-slate-800 rounded-[32px] bg-slate-950/40 overflow-hidden shadow-2xl">
                         <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                               <tr>
                                  <th className="px-6 py-5">Họ tên</th>
                                  <th className="px-6 py-5">Mã SV</th>
                                  <th className="px-6 py-5">Email</th>
                                  <th className="px-6 py-5 text-right">Hành động</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                               {importPreview.map((p, i) => (
                                 <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-black text-slate-200">{p.name}</td>
                                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">{p.studentCode}</td>
                                    <td className="px-6 py-4 text-slate-400">{p.email || <span className="text-slate-800 italic">- trống -</span>}</td>
                                    <td className="px-6 py-4 text-right">
                                       <button onClick={() => setImportPreview(prev => prev.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all opacity-20 group-hover:opacity-100">✕</button>
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>

                      <div className="p-6 bg-slate-900 border border-slate-800 rounded-[32px] flex gap-4">
                        <button onClick={() => setImportStep(2)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all">THAY ĐỔI MAPPING</button>
                        <button onClick={execImport} disabled={importPreview.length === 0} className="flex-[2] py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-600/30 transition-all">XÁC NHẬN LƯU VÀO HỆ THỐNG</button>
                      </div>
                  </div>
                   )}
              </div>
           </div>
        </div>
      )}

      {/* Edit Modals rendered as separate components to avoid hook mismatch in parent */}
      {editingClass && (
        <EditClassModal 
          isOpen={!!editingClass} 
          classData={editingClass} 
          onClose={() => setEditingClass(null)} 
          onUpdate={updateClass} 
        />
      )}
      {editingStudent && (
        <EditStudentModal 
          isOpen={!!editingStudent} 
          studentData={editingStudent} 
          onClose={() => setEditingStudent(null)} 
          onUpdate={updateStudent} 
        />
      )}
      {editingAssignment && (
        <EditAssignmentModal 
          isOpen={!!editingAssignment} 
          assignmentData={editingAssignment} 
          onClose={() => setEditingAssignment(null)} 
          onUpdate={updateAssignment} 
        />
      )}
      {editingDoc && (
        <EditDocModal 
          isOpen={!!editingDoc} 
          docData={editingDoc} 
          onClose={() => setEditingDoc(null)} 
          onUpdate={updateDocument} 
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal 
          isOpen={!!deleteConfirm}
          data={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={async () => {
             if (deleteConfirm.type === 'CLASS') await deleteClass(deleteConfirm.id);
             if (deleteConfirm.type === 'STUDENT') await deleteStudent(deleteConfirm.id);
             if (deleteConfirm.type === 'ASG') await deleteAssignment(deleteConfirm.id);
             if (deleteConfirm.type === 'DOC') await deleteDocument(deleteConfirm.id);
             setDeleteConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({ isOpen, data, onClose, onConfirm }: { isOpen: boolean, data: { id: string, type: string, name: string }, onClose: () => void, onConfirm: () => Promise<void> }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-lg p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-red-500/20 rounded-[32px] w-full max-w-sm shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto border border-red-500/20 shadow-inner">🗑️</div>
          <div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Xác nhận xóa?</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-bold">Bạn có chắc muốn xóa <span className="text-red-400">"{data.name}"</span>? Thao tác này không thể hoàn tác.</p>
          </div>
          <div className="flex gap-4 pt-2">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all uppercase tracking-widest text-[10px]">Huỷ</button>
            <button onClick={onConfirm} className="flex-[2] py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black shadow-xl shadow-red-600/30 transition-all uppercase tracking-widest text-[10px]">Xác nhận xóa</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate components to isolate hooks and logic
function EditClassModal({ isOpen, classData, onClose, onUpdate }: { isOpen: boolean, classData: Class, onClose: () => void, onUpdate: (id: string, partial: Partial<Class>) => Promise<void> }) {
  const [data, setData] = useState<Class>({...classData});
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(data.id, { name: data.name, courseCode: data.courseCode, scheduleRules: data.scheduleRules });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-[32px] w-full max-w-xl shadow-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-100 italic">🔧 Chỉnh sửa Lớp học</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tên lớp học</label>
              <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mã học phần</label>
                 <input value={data.courseCode} onChange={e => setData({...data, courseCode: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Lịch dạy (0=CN, 1=T2...)</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5,6,0].map(d => (
                       <button key={d} type="button" onClick={() => setData({...data, scheduleRules: data.scheduleRules.includes(d) ? data.scheduleRules.filter(x => x !== d) : [...data.scheduleRules, d]})} 
                         className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${data.scheduleRules.includes(d) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{d === 0 ? 'CN' : d+1}</button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all uppercase tracking-widest text-[10px]">Huỷ</button>
            <button type="submit" className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all uppercase tracking-widest text-[10px]">Cập nhật lớp học</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditStudentModal({ isOpen, studentData, onClose, onUpdate }: { isOpen: boolean, studentData: Student, onClose: () => void, onUpdate: (id: string, partial: Partial<Student>) => Promise<void> }) {
  const [data, setData] = useState<Student>({...studentData});
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(data.id, { name: data.name, studentCode: data.studentCode, email: data.email });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-[32px] w-full max-w-lg shadow-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-100 italic">👤 Sửa thông tin Học viên</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Họ và Tên</label>
              <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mã số học viên</label>
              <input value={data.studentCode} onChange={e => setData({...data, studentCode: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email</label>
              <input value={data.email || ''} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="example@mail.com" />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all uppercase tracking-widest text-[10px]">Huỷ</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-600/30 transition-all uppercase tracking-widest text-[10px]">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAssignmentModal({ isOpen, assignmentData, onClose, onUpdate }: { isOpen: boolean, assignmentData: Assignment, onClose: () => void, onUpdate: (id: string, partial: Partial<Assignment>) => Promise<void> }) {
  const [data, setData] = useState<Assignment>({...assignmentData});
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(data.id, { title: data.title, dueDate: data.dueDate, points: data.points });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-[32px] w-full max-w-lg shadow-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-100 italic">📝 Sửa Bài Tập</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tiêu đề bài tập</label>
              <input value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Hạn nộp</label>
                 <input type="date" value={data.dueDate} onChange={e => setData({...data, dueDate: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
               </div>
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Thang điểm (Max)</label>
                 <input type="number" value={data.points || ''} onChange={e => setData({...data, points: Number(e.target.value)})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
               </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all uppercase tracking-widest text-[10px]">Huỷ</button>
            <button type="submit" className="flex-[2] py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-600/30 transition-all uppercase tracking-widest text-[10px]">Cập nhật bài tập</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDocModal({ isOpen, docData, onClose, onUpdate }: { isOpen: boolean, docData: TeachingDoc, onClose: () => void, onUpdate: (id: string, partial: Partial<TeachingDoc>) => Promise<void> }) {
  const [data, setData] = useState<TeachingDoc>({...docData});
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(data.id, { title: data.title, url: data.url });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-[32px] w-full max-w-lg shadow-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-100 italic">📂 Sửa Tài Liệu</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tên tài liệu</label>
              <input value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Đường dẫn (URL)</label>
              <input value={data.url} onChange={e => setData({...data, url: e.target.value})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold transition-all uppercase tracking-widest text-[10px]">Huỷ</button>
            <button type="submit" className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-600/30 transition-all uppercase tracking-widest text-[10px]">Lưu tài liệu</button>
          </div>
        </form>
      </div>
    </div>
  );
}
