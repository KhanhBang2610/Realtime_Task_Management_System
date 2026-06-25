import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/awsApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email, password) => {
    const u = await authApi.signIn(email, password);
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    const u = await authApi.signUp(email, password, displayName);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
