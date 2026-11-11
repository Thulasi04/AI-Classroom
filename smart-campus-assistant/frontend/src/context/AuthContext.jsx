import { createContext, useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { setAccessToken, setUnauthorizedHandler } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStudentProfile(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    let mounted = true;

    async function bootstrapSession() {
      try {
        const data = await authService.refresh();
        if (mounted && data?.user) {
          setUser(data.user);
          setStudentProfile(data.student_profile || null);
        }
      } catch {
        if (mounted) clearSession();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrapSession();
    return () => {
      mounted = false;
    };
  }, [clearSession]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    setStudentProfile(data.student_profile || null);
    return data;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    setUser(data.user);
    setStudentProfile(data.student_profile || null);
    return data;
  };

  const refreshProfile = async () => {
    const data = await authService.getMe();
    setUser(data.user);
    setStudentProfile(data.student_profile || null);
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        studentProfile,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

