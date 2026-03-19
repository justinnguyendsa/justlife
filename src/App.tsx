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
import { AuthPage } from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
