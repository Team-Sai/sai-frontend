import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div>로딩 중...</div>;
  }

if (!isAuthenticated) {
  return <Navigate to="/login?required=true" state={{ from: location }} replace />;
}
  return <>{children}</>;
}