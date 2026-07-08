import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  cognitoLogin,
  cognitoRegister,
  cognitoRefresh,
  cognitoLogout,
} from '@/lib/cognito'
import type { User } from '@/types'

// ─── Context value shape ──────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

// ─── Helper — derive User from Cognito ID token payload ──────────────────────
function parseUserFromIdToken(idToken: string): User {
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]))
    return {
      id: payload.sub as string,
      name: (payload.name as string) ?? (payload.email as string),
      email: payload.email as string,
      role: (payload['custom:role'] as User['role']) ?? 'member',
      createdAt: new Date(payload.iat * 1000).toISOString(),
    }
  } catch {
    throw new Error('Failed to parse ID token')
  }
}

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // On mount — try to restore session from Cognito (uses refresh token in localStorage)
  const initSession = useCallback(async () => {
    try {
      const session = await cognitoRefresh()
      if (session) {
        const parsedUser = parseUserFromIdToken(session.idToken)
        setAuth(parsedUser, session.accessToken)
      }
    } catch {
      clearAuth()
    } finally {
      setIsLoading(false)
    }
  }, [setAuth, clearAuth])

  useEffect(() => {
    void initSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── login ────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const session = await cognitoLogin(email, password)
      const parsedUser = parseUserFromIdToken(session.idToken)
      setAuth(parsedUser, session.accessToken)
    },
    [setAuth],
  )

  // ─── register ─────────────────────────────────────────────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await cognitoRegister(name, email, password)
      const parsedUser = parseUserFromIdToken(session.idToken)
      setAuth(parsedUser, session.accessToken)
    },
    [setAuth],
  )

  // ─── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    cognitoLogout()
    clearAuth()
    queryClient.clear()
  }, [clearAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          isLoading,
          isAuthenticated: !!user && !!accessToken,
          login,
          register,
          logout,
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
