import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NumbersPage } from '@/pages/NumbersPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { InboxPage } from '@/pages/InboxPage';

export default function App() {
  return (
    <ErrorBoundary>
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/numbers" element={<NumbersPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
          </Route>

          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox/:numberId"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox/:numberId/:conversationId"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
    </ErrorBoundary>
  );
}
