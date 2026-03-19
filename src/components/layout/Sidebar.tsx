import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type NavItem = {
  to?: string;
  label: string;
  icon: React.ReactNode;
  subItems?: { to: string; label: string }[];
};

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Monitor',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
  {
    label: 'Tasks',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    ),
    subItems: [
      { to: '/tasks', label: 'Danh Sách (Board)' },
      { to: '/calendar', label: 'Lịch Biểu (Calendar)' }
    ]
  },
  {
    label: 'Working',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
      </svg>
    ),
    subItems: [
      { to: '/working/projects', label: 'Dự án' },
      { to: '/working/board', label: 'Bảng (Board)' },
      { to: '/working/backlog', label: 'Kế hoạch (Backlog)' }
    ]
  },
  {
    label: 'Teaching',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72l5 2.73 5-2.73v3.72z"/>
      </svg>
    ),
    subItems: [
      { to: '/teaching/classes', label: 'Lớp học' },
      { to: '/teaching/students', label: 'Học viên (Pool)' },
      { to: '/teaching/documents', label: 'Tài liệu (Pool)' }
    ]
  },
  {
    label: 'Studying',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
      </svg>
    ),
    subItems: [
      { to: '/studying/courses', label: 'Khóa học' },
      { to: '/studying/assignments', label: 'Bài tập & Deadline' },
      { to: '/studying/documents', label: 'Tài liệu học tập' }
    ]
  },
  {
    label: 'Extensions',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    subItems: [
      { to: '/analytics', label: 'Thống Kê' },
      { to: '/focus', label: 'Tập Trung' },
      { to: '/habits', label: 'Thói Quen' }
    ]
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
      </svg>
    ),
  },
  {
    to: '/admin',
    label: 'Admin Panel',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mở menu group dựa theo route hiện tại
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Tasks': location.pathname.includes('/task') || location.pathname.includes('/calendar'),
    'Extensions': ['/analytics', '/focus', '/habits'].includes(location.pathname),
    'Teaching': location.pathname.includes('/teaching'),
    'Studying': location.pathname.includes('/studying'),
    'Working': location.pathname.includes('/working')
  });

  const toggleExpand = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">JustLife</p>
            <p className="text-xs text-slate-400">Command Center</p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-700/50 mb-4" />

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter(item => {
          if (item.label === 'Admin Panel' && user?.role !== 'super_admin') return false;
          return true;
        }).map((item) => {
          if (item.subItems) {
            const isExpanded = expanded[item.label] || false;
            // Highlight parent if any child is active
            const hasActiveChild = item.subItems.some(sub => location.pathname === sub.to);

            return (
              <div key={item.label} className="flex flex-col mb-1 space-y-1">
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    hasActiveChild ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`transition-colors ${hasActiveChild ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                  <svg className={`w-4 h-4 transition-transform text-slate-500 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {isExpanded && (
                  <div className="ml-5 mt-1 flex flex-col gap-1 border-l-2 border-slate-800 pl-3">
                    {item.subItems.map(subItem => (
                      <NavLink
                        key={subItem.to}
                        to={subItem.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-300'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                          }`
                        }
                      >
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Single Item
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-1 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 mt-auto space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-indigo-500/20">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : user.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
             </div>
          </div>
        )}
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all group"
        >
          <svg className="w-4 h-4 transition-colors group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Đăng xuất
        </button>

        <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-700/30">
          <p className="text-[10px] text-slate-600 text-center italic">
            JustLife Security Protocol v16 (Firebase)
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-xl bg-slate-800/90 backdrop-blur-md border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
        )}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className="hidden md:flex md:w-56 lg:w-64 shrink-0 flex-col h-screen sticky top-0 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/70">
        {sidebarContent}
      </aside>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 md:hidden transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
