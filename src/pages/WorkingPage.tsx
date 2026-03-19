import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkingStore } from '../hooks/useWorkingStore';
import Badge from '../components/ui/Badge';
import type { IssueStatus, IssueType, Priority } from '../types';

const STATUS_COLUMNS: IssueStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export function WorkingPage() {
  const { tab } = useParams<{ tab: string }>();
  const activeTab = (tab?.toUpperCase() || 'PROJECTS') as 'PROJECTS' | 'BOARD' | 'BACKLOG';

  const {
    projects, issues,
    addProject, deleteProject,
    addIssue, updateIssue, deleteIssue
  } = useWorkingStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Add Project States
  const [showProjModal, setShowProjModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pKey, setPKey] = useState('');
  const [pDesc, setPDesc] = useState('');

  // Add Issue States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [iTitle, setITitle] = useState('');
  const [iType, setIType] = useState<IssueType>('STORY');
  const [iPriority, setIPriority] = useState<Priority>('MEDIUM');
  const [iDesc, setIDesc] = useState('');
  const [iProjectId, setIProjectId] = useState('');

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pKey) return;
    const id = await addProject(pName, pKey, pDesc);
    setSelectedProjectId(id);
    setShowProjModal(false);
    setPName(''); setPKey(''); setPDesc('');
  };

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = iProjectId || selectedProjectId;
    if (!iTitle || !targetProjId) return;
    await addIssue(targetProjId, iTitle, iType, iPriority, iDesc);
    setShowIssueModal(false);
    setITitle(''); setIDesc('');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
             Working Hub <span className="text-slate-600 font-light text-xl ml-2 tracking-normal italic">Jira Style</span>
          </h1>
          <div className="flex bg-slate-800/50 p-1 rounded-xl w-fit">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'PROJECTS' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📁 Dự án
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'BOARD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📊 Bảng (Board)
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'BACKLOG' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              📋 Backlog
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           {activeTab === 'PROJECTS' && (
             <button onClick={() => setShowProjModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-cyan-600/20 text-sm transition-all whitespace-nowrap">+ Dự án Mới</button>
           )}
           <button onClick={() => {
              if (projects.length > 0) {
                 setIProjectId(selectedProjectId || projects[0].id);
                 setShowIssueModal(true);
              } else {
                 alert('Vui lòng tạo Dự án trước!');
              }
           }} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all whitespace-nowrap">+ Tạo Issue</button>
        </div>
      </header>

      {/* --- PROJECTS TAB --- */}
      {activeTab === 'PROJECTS' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-md">
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Mã</th>
                  <th className="px-6 py-4 font-semibold">Tên dự án</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Mô tả</th>
                  <th className="px-6 py-4 font-semibold text-center w-32">Issue</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {projects.map(p => {
                  const pIssues = issues.filter(i => i.projectId === p.id);
                  return (
                    <tr key={p.id} className="group hover:bg-slate-800/40 transition-colors cursor-pointer" onClick={() => setSelectedProjectId(p.id)}>
                      <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{p.key}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-200">{p.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Lead: {p.lead}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-slate-400 text-xs italic">
                        {p.description || 'Chưa có mô tả...'}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className="px-2 py-0.5 bg-slate-800 rounded-full font-bold text-slate-300">{pIssues.length}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Xoá dự án này và tất cả Issue liên quan?')) deleteProject(p.id) }} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                      </td>
                    </tr>
                  )
                })}
                {projects.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic font-medium">Chưa có dự án nào được khởi tạo.</td></tr>}
              </tbody>
           </table>
        </div>
      )}

      {/* --- BOARD TAB --- */}
      {activeTab === 'BOARD' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-900/30 p-3 rounded-2xl border border-slate-800">
             <span className="text-xs text-slate-500 font-bold uppercase ml-2">Dự án:</span>
             <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-cyan-400 font-bold outline-none focus:ring-1 focus:ring-cyan-500">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
                {projects.length === 0 && <option value="">Chưa có dự án nào</option>}
             </select>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[600px] items-start">
            {STATUS_COLUMNS.map(col => {
              const colIssues = issues.filter(i => i.projectId === selectedProjectId && i.status === col);
              return (
                <div key={col} className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-3 min-w-[280px] w-full flex flex-col gap-3">
                  <header className="flex justify-between items-center px-2 py-1">
                    <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase">{col.replace('_', ' ')}</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">{colIssues.length}</span>
                  </header>
                  
                  <div className="space-y-3">
                     {colIssues.map(issue => (
                       <div key={issue.id} className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl shadow-lg border-l-2 border-l-blue-500 group relative">
                          <header className="flex justify-between items-start mb-2">
                             <div className="flex gap-1.5 items-center">
                               {issue.type === 'BUG' ? <span className="text-red-400">🐞</span> : issue.type === 'STORY' ? <span className="text-emerald-400">📗</span> : <span className="text-blue-400">📘</span>}
                               <span className="text-[10px] font-bold text-slate-500 font-mono">{issue.key}</span>
                             </div>
                             <Badge variant="priority" value={issue.priority} size="sm" />
                          </header>
                          <h4 className="text-sm font-bold text-slate-200 mb-3">{issue.title}</h4>
                          
                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/50">
                             <select 
                               value={issue.status} 
                               onChange={(e) => updateIssue(issue.id, { status: e.target.value as IssueStatus })}
                               className={`text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 border-none outline-none cursor-pointer transition-colors ${
                                 issue.status === 'TODO' ? 'text-slate-400' :
                                 issue.status === 'IN_PROGRESS' ? 'text-blue-400' :
                                 issue.status === 'REVIEW' ? 'text-amber-400' : 
                                 'text-emerald-400'
                               }`}
                             >
                                <option value="BACKLOG">BACKLOG</option>
                                <option value="TODO">TO DO</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="REVIEW">REVIEW</option>
                                <option value="DONE">DONE</option>
                             </select>
                             <button onClick={() => deleteIssue(issue.id)} className="p-1.5 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </div>
                       </div>
                     ))}
                     <button onClick={() => { setIProjectId(selectedProjectId); setShowIssueModal(true); }} className="w-full py-2 border border-dashed border-slate-800 rounded-xl text-[10px] text-slate-600 font-bold hover:border-slate-700 hover:text-slate-400 transition-all">+ CREATE ISSUE</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- BACKLOG TAB --- */}
      {activeTab === 'BACKLOG' && (
        <div className="space-y-4">
           <div className="bg-slate-900/30 rounded-2xl border border-slate-800 p-2 flex items-center justify-between">
              <div className="flex items-center gap-4 px-4 py-2">
                 <h2 className="text-xl font-black text-slate-300">Issue Backlog</h2>
                 <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-700">{issues.filter(i => i.status === 'BACKLOG').length} pending</span>
              </div>
              <div className="flex gap-2 p-2">
                 <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-indigo-400 outline-none">
                    <option value="">Tất cả Dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>
           </div>

           <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/20">
              <table className="w-full text-left text-sm">
                 <thead className="bg-slate-800/30 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-800">
                   <tr>
                     <th className="px-6 py-4">Issue Key & Title</th>
                     <th className="px-6 py-4 text-center">Type</th>
                     <th className="px-6 py-4 text-center">Priority</th>
                     <th className="px-6 py-4 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                   {(selectedProjectId ? issues.filter(i => i.projectId === selectedProjectId) : issues)
                    .filter(i => i.status === 'BACKLOG')
                    .map(issue => (
                      <tr key={issue.id} className="group hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <span className="font-mono text-[10px] font-black text-slate-500">{issue.key}</span>
                              <span className="font-bold text-slate-300">{issue.title}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${issue.type === 'BUG' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}>{issue.type}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <Badge variant="priority" value={issue.priority} size="sm" />
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => updateIssue(issue.id, { status: 'TODO' })} className="px-3 py-1 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-20" disabled={issue.status === 'TODO'}>DI CHUYỂN VÀO BOARD</button>
                        </td>
                      </tr>
                   ))}
                   {issues.length === 0 && <tr><td colSpan={4} className="py-20 text-center text-slate-600 italic">Backlog sạch sẽ. Không có issue nào cần xử lý.</td></tr>}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* --- ADD PROJECT MODAL --- */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">Khởi tạo Dự án Mới</h2>
              <button onClick={() => setShowProjModal(false)} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tên dự án</label>
                  <input type="text" required value={pName} onChange={e=>setPName(e.target.value)} placeholder="VD: Web E-commerce" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
               </div>
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Key (Mã viết tắt)</label>
                  <input type="text" required maxLength={5} value={pKey} onChange={e=>setPKey(e.target.value.toUpperCase())} placeholder="VD: PROJ" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
               </div>
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Mô tả dự án</label>
                  <textarea value={pDesc} onChange={e=>setPDesc(e.target.value)} rows={3} placeholder="Mục tiêu, phạm vi dự án..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none" />
               </div>
               <button type="submit" className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-600/20 transition-all">KHỞI TẠO PROJECT</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD ISSUE MODAL --- */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center text-slate-100">
              <h2 className="text-xl font-bold">Tạo Issue Mới</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-500 hover:text-white text-3xl font-light">&times;</button>
            </div>
            <form onSubmit={handleAddIssue} className="p-6 space-y-4">
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Dự án</label>
                  <select value={iProjectId} onChange={e=>setIProjectId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tiêu đề Issue</label>
                  <input type="text" required value={iTitle} onChange={e=>setITitle(e.target.value)} placeholder="Tên công việc cụ thể..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Loại công việc</label>
                     <select value={iType} onChange={e=>setIType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="STORY">Story 📗</option>
                        <option value="TASK">Task 📘</option>
                        <option value="BUG">Bug 🐞</option>
                        <option value="EPIC">Epic 📁</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Độ ưu tiên</label>
                     <select value={iPriority} onChange={e=>setIPriority(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="HIGH">HIGH 🔥</option>
                        <option value="MEDIUM">MEDIUM ⚡</option>
                        <option value="LOW">LOW 🧊</option>
                     </select>
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Mô tả cụ thể</label>
                  <textarea value={iDesc} onChange={e=>setIDesc(e.target.value)} rows={3} placeholder="Các bước thực hiện, yêu cầu chi tiết..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" />
               </div>
               <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all mt-2">TẠO ISSUE</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkingPage;
