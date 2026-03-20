import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeachingStore } from '../hooks/useTeachingStore';
import { db } from '../db';
import type { Assignment, Class } from '../types';

export default function SubmissionPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { submitWork } = useTeachingStore();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [targetClass, setTargetClass] = useState<Class | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [url, setUrl] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (assignmentId) {
      db.assignments.get(assignmentId).then(asg => {
        if (asg) {
          setAssignment(asg);
          db.classes.get(asg.classId).then(cls => setTargetClass(cls || null));
        }
      });
    }
  }, [assignmentId]);

  // Effect to fetch existing submission status when student code is entered
  useEffect(() => {
    if (assignmentId && studentCode.length >= 4) {
      db.students.where({ studentCode }).first().then(student => {
        if (student) {
          db.submissions.where({ assignmentId, studentId: student.id }).first().then(sub => {
            setExistingSubmission(sub || null);
          });
        } else {
          setExistingSubmission(null);
        }
      });
    } else {
      setExistingSubmission(null);
    }
  }, [assignmentId, studentCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId || !studentCode || !url) return;

    setStatus('LOADING');
    try {
      await submitWork(assignmentId, studentCode, url);
      setStatus('SUCCESS');
      setMessage('Nộp bài thành công! Giảng viên sẽ sớm nhận được bài của bạn.');
      setStudentCode('');
      setUrl('');
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err.message || 'Có lỗi xảy ra khi nộp bài.');
    }
  };

  if (!assignment) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-bold text-slate-200">Không tìm thấy bài tập</h2>
          <p className="text-slate-500">Vui lòng kiểm tra lại đường dẫn chia sẻ từ giảng viên.</p>
          <Link to="/" className="inline-block text-blue-400 hover:text-blue-300 font-medium">Quay về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <header className="p-8 bg-gradient-to-br from-slate-800/50 to-transparent border-b border-slate-800 relative">
             <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl">📝</div>
             <span className="text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 mb-4 inline-block uppercase">Cổng nộp bài học viên</span>
             <h1 className="text-2xl font-black text-white leading-tight mb-2">{assignment.title}</h1>
             <p className="text-slate-400 text-sm flex items-center gap-2">
                <span>🏫</span> {targetClass?.name} ({targetClass?.courseCode})
             </p>
             <div className="mt-6 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-500">HẠN NỘP: <span className="text-amber-500">{new Date(assignment.dueDate).toLocaleDateString()}</span></div>
                {assignment.points && <div className="text-[10px] font-bold text-slate-500">THANG ĐIỂM: <span className="text-blue-400">{assignment.points}</span></div>}
             </div>
          </header>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 mb-2 ml-1">Mã số học viên</label>
                <input 
                  type="text" 
                  required 
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã SV của bạn..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-700" 
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 mb-2 ml-1">Link bài nộp (URL)</label>
                <input 
                  type="url" 
                  required 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="Link Google Drive, Canva, Github..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-700" 
                />
              </div>
            </div>

            {existingSubmission?.attachmentUrl && (
              <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ĐÃ NỘP BẢN TRƯỚC</span>
                  <span className="text-[10px] text-slate-500">{new Date(existingSubmission.submittedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg border border-blue-500/10">🔗</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-slate-300 font-bold truncate">{existingSubmission.attachmentUrl}</p>
                    <p className="text-[10px] text-slate-500 italic">Bạn có thể nộp lại để thay thế bản này.</p>
                  </div>
                </div>
                {existingSubmission.history && existingSubmission.history.length > 0 && (
                  <div className="pt-2 border-t border-blue-500/10">
                    <p className="text-[9px] font-bold text-slate-600 uppercase mb-2">Lịch sử ({existingSubmission.history.length})</p>
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                      {existingSubmission.history.map((h: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[9px] text-slate-500">
                          <span className="truncate max-w-[150px]">{h.attachmentUrl}</span>
                          <span>{new Date(h.submittedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === 'SUCCESS' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="text-xl">✅</span>
                <p className="text-sm text-emerald-400 font-medium">{message}</p>
              </div>
            )}

            {status === 'ERROR' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="text-xl">❌</span>
                <p className="text-sm text-red-400 font-medium">{message}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={status === 'LOADING'}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'LOADING' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ĐANG GỬI...
                </>
              ) : 'XÁC NHẬN NỘP BÀI'}
            </button>
            <p className="text-center text-[10px] text-slate-600 italic">Hệ thống sẽ ghi nhận thời gian nộp bài của bạn và gửi đến giảng viên.</p>
          </form>
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.2em]">JustLife Management System</p>
        </div>
      </div>
    </div>
  );
}
