import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useNotificationEngine } from '../../hooks/useNotificationEngine';

export default function Layout() {
  useNotificationEngine();
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/8 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/8 blur-[140px]" />
        <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>
      
      <Sidebar />

      <main className="relative z-10 flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
