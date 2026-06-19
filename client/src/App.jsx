import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import AdminDashboard from './pages/admin/Dashboard';
import AdminAssignments from './pages/admin/Assignments';
import AdminReporters from './pages/admin/Reporters';
import AdminAdvances from './pages/admin/Advances';
import AdminExpenses from './pages/admin/Expenses';
import AdminSettlements from './pages/admin/Settlements';
import AdminAnalytics from './pages/admin/Analytics';
import AdminAuditLogs from './pages/admin/AuditLogs';

import ReporterDashboard from './pages/reporter/Dashboard';
import ReporterAssignments from './pages/reporter/Assignments';
import ReporterAdvances from './pages/reporter/Advances';
import ReporterExpenses from './pages/reporter/Expenses';
import ReporterSettlements from './pages/reporter/Settlements';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/reporter'} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/reporter'} replace /> : <Login />} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout title="Admin Dashboard" subtitle="Manage assignments, expenses & settlements" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="reporters" element={<AdminReporters />} />
        <Route path="advances" element={<AdminAdvances />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="settlements" element={<AdminSettlements />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      <Route path="/reporter" element={<ProtectedRoute role="reporter"><Layout title="Reporter Dashboard" subtitle="Your assignments, expenses & settlements" /></ProtectedRoute>}>
        <Route index element={<ReporterDashboard />} />
        <Route path="assignments" element={<ReporterAssignments />} />
        <Route path="advances" element={<ReporterAdvances />} />
        <Route path="expenses" element={<ReporterExpenses />} />
        <Route path="settlements" element={<ReporterSettlements />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
