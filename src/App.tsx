import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import FocusPage from './pages/FocusPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HabitPage from './pages/HabitPage';
import TeachingPage from './pages/TeachingPage';
import { StudyingPage } from './pages/StudyingPage';
import { WorkingPage } from './pages/WorkingPage';
import SettingsPage from './pages/SettingsPage';

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
          <Route path="teaching" element={<Navigate to="/teaching/classes" replace />} />
          <Route path="teaching/:tab" element={<TeachingPage />} />
          <Route path="studying" element={<Navigate to="/studying/courses" replace />} />
          <Route path="studying/:tab" element={<StudyingPage />} />
          <Route path="working" element={<Navigate to="/working/projects" replace />} />
          <Route path="working/:tab" element={<WorkingPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
