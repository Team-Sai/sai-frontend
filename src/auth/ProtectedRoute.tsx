import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { ReactNode } from 'react';
import LoadingSkeleton from '../common/components/LoadingSkeleton';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <LoadingSkeleton className="loading-skeleton--page" rows={5} />;
  }

if (!isAuthenticated) {
  return <Navigate to="/login?required=true" state={{ from: location }} replace />;
}
  return <>{children}</>;
}
