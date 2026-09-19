import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authFetch } from './authFetch';
import { AuthContext } from './AuthContext';
import type { User } from './AuthContext';

const ACCESS_TOKEN_KEY = 'accessToken';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const publicPaths = ['/', '/intro', '/login', '/signup'];
    async function initialize() {
      const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
      if (publicPaths.includes(pathname)) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await authFetch('/api/users/me');
        if (res.ok) {
          const userData: User = await res.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    }

    initialize();
  }, []);

  function login(userData: User) {
    setUser(userData);
  }

  function logout() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isInitializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
