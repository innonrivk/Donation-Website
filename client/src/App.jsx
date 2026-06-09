import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { ContentProvider } from './context/ContentContext';
import PrivateRoute from './components/router/PrivateRoute';
import PublicRoute from './components/router/PublicRoute';
import AdminProtectedRoute from './components/router/AdminProtectedRoute';
import DonationPage from './pages/DonationPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OtpVerifyPage from './pages/OtpVerifyPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import FullPageSpinner from './components/ui/FullPageSpinner';
import './App.css';

// Lazy load admin pages to keep the donor bundle lightweight
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));

function App() {
  return (
    <ContentProvider>
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<DonationPage />} />
            <Route path="/donation" element={<DonationPage />} />

            {/* Auth pages — redirect if already authenticated */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
            <Route path="/signup/verify-otp" element={<PublicRoute><OtpVerifyPage /></PublicRoute>} />

            {/* Protected pages — redirect if not authenticated */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard/*"
              element={
                <AdminProtectedRoute>
                  <Suspense fallback={<FullPageSpinner />}>
                    <AdminDashboardPage />
                  </Suspense>
                </AdminProtectedRoute>
              }
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
    </ContentProvider>
  );
}

export default App;

