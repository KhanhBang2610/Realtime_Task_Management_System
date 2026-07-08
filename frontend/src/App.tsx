import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AdminRoute from '@/components/auth/AdminRoute'
import AppShell from '@/components/AppShell'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 403 Forbidden */}
          <Route
            path="/403"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-4">
                <h1 className="text-5xl font-bold text-red-500">403</h1>
                <p className="text-gray-400">You don&apos;t have permission to access this page.</p>
                <a href="/dashboard" className="text-indigo-400 hover:underline text-sm">
                  Go to Dashboard
                </a>
              </div>
            }
          />

          {/* Protected routes — wrapped in ProtectedRoute + AppShell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>
                {/* Future admin routes go here */}
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
