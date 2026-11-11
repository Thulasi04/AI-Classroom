import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import AcademicInfo from './pages/AcademicInfo';
import Attendance from './pages/Attendance';
import InternalMarks from './pages/InternalMarks';
import Timetable from './pages/Timetable';
import Placement from './pages/Placement';
import CampusServices from './pages/CampusServices';
import Documents from './pages/Documents';
import SupportTickets from './pages/SupportTickets';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/academics" element={<AcademicInfo />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/marks" element={<InternalMarks />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/placements" element={<Placement />} />
              <Route path="/campus-services" element={<CampusServices />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/support" element={<SupportTickets />} />
            </Route>

            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

