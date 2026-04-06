import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Usage:
// <ProtectedRoute>              → just needs login
// <ProtectedRoute role="admin"> → needs admin
// <ProtectedRoute role="student"> → needs student

interface ProtectedRouteProps {
  children: ReactNode;
  role?: 'admin' | 'student';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { isLoggedIn, user, loading } = useAuth();

  // Wait until localStorage is checked
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  // Not logged in → go to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → go to their own dashboard
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;