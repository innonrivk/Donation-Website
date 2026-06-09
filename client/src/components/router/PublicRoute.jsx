import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FullPageSpinner from '../ui/FullPageSpinner';

/**
 * PublicRoute — Redirects already-authenticated users to /dashboard.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (isAuthenticated) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
