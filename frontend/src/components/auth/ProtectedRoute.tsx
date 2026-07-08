import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { LoadingSpinner } from '@/components/ui'

/**
 * Wraps protected routes. Behaviour:
 * - While auth is initialising → show full-screen spinner
 * - Not authenticated → redirect to /login (preserving intended URL)
 * - Authenticated → render children via <Outlet />
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Pass current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
