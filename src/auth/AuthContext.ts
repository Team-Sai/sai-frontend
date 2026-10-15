import { createContext } from 'react';

export interface User {
  userToken: string;
  email: string;
  name: string;
  birthDate: string;
  createdAt: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);