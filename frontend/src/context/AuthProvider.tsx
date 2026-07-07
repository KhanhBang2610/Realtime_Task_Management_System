import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  const refreshToken = useCallback(async () => {
    try {
      const response = await api.post<{ user: User; accessToken: string }>(
        '/auth/refresh',
      )
      setAuth(response.data.user, response.data.accessToken)
    } catch {
      clearAuth()
    }
  }, [setAuth, clearAuth])

  useEffect(() => {
    const init = async () => {
      if (accessToken) {
        // Token exists — try to refresh to get a fresh one
        await refreshToken()
      }
      setIsLoading(false)
    }

    void init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          isLoading,
          isAuthenticated: !!user && !!accessToken,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
