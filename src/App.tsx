import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import FocusPage from './pages/FocusPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HabitPage from './pages/HabitPage';
import TeachingPage from './pages/TeachingPage';
import SettingsPage from './pages/SettingsPage';

// Placeholder Pages cho Working và Studying
const WorkingPage = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-100">Working Hub</h1><p className="text-slate-400 mt-2">Đang phát triển...</p></div>;
const StudyingPage = () => <div className="p-8"><h1 className="text-3xl font-bold text-slate-100">Studying Hub</h1><p className="text-slate-400 mt-2">Đang phát triển...</p></div>;


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="habits" element={<HabitPage />} />
          <Route path="working" element={<WorkingPage />} />
          <Route path="teaching" element={<Navigate to="/teaching/classes" replace />} />
          <Route path="teaching/:tab" element={<TeachingPage />} />
          <Route path="studying" element={<StudyingPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
