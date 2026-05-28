import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FullPageSpinner from '../ui/FullPageSpinner';

/**
 * PublicRoute — Redirects already-authenticated users to /dashboard.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
