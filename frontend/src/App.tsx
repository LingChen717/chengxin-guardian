import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import StudentLayout from './components/StudentLayout';
import StudentRoute from './components/StudentRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import DashboardPage from './pages/Admin/DashboardPage';
import PortalPage from './pages/PortalPage';
import ChatPage from './pages/Student/ChatPage';
import DiaryPage from './pages/Student/DiaryPage';
import MeditationPage from './pages/Student/MeditationPage';
import DataDashboard from './pages/SuperAdmin/DataDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalPage />} />
        <Route path="/student" element={<StudentRoute />}>
          <Route element={<StudentLayout />}>
            <Route index element={<Navigate to="chat" replace />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="diary" element={<DiaryPage />} />
            <Route path="meditation" element={<MeditationPage />} />
          </Route>
        </Route>
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<DashboardPage />} />
        </Route>
        <Route path="/superadmin" element={<SuperAdminRoute />}>
          <Route index element={<DataDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
