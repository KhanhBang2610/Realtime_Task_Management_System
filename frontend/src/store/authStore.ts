import { create } from 'zustand'
import type { User } from '@/types'

// Access token lives only in memory (NOT persisted) — Cognito SDK manages
// the refresh token in localStorage under its own keys.
interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,

  setAuth: (user: User, accessToken: string) => {
    set({ user, accessToken })
  },

  clearAuth: () => {
    set({ user: null, accessToken: null })
  },
}))
