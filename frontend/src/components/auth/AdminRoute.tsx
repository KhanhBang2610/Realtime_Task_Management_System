import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'

/**
 * Wraps admin-only routes. Behaviour:
 * - Not admin → redirect to /403
 * - Admin → render children via <Outlet />
 *
 * Must be nested inside <ProtectedRoute /> so auth is already guaranteed.
 */
export default function AdminRoute() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
