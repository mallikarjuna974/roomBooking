'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = (nextUser) => {
    setUser(nextUser);
    if (typeof window === 'undefined') return;

    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  const refreshUser = async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return null;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.role) {
        persistUser(currentUser);
        return currentUser;
      }

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.role) {
            persistUser(parsedUser);
            return parsedUser;
          }
        } catch {
          localStorage.removeItem('user');
        }
      }

      localStorage.removeItem('user');
      setUser(null);
      return null;
    } catch {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.role) {
            persistUser(parsedUser);
            return parsedUser;
          }
        } catch {
          localStorage.removeItem('user');
        }
      }

      localStorage.removeItem('user');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (token, serverUser) => {
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('token', token);
    }

    const nextUser = serverUser && serverUser.role
      ? serverUser
      : await getCurrentUser();

    if (nextUser && nextUser.role) {
      persistUser(nextUser);
      return nextUser;
    }

    persistUser(null);
    return null;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    logout,
    refreshUser,
    setUser: persistUser
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
