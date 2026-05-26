import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMockPanel, setShowMockPanel] = useState(false);

  const from = location.state?.from || '/dashboard';

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ email: form.email, password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogle = async (persona) => {
    setLoading(true);
    setError('');
    try {
      await googleLogin(persona);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const mockPersonas = [
    { label: 'New Google User', email: 'google.new@test.com', firstName: 'Google', lastName: 'User' },
    { label: 'Shadow Donor (existing)', email: 'shadow.donor@test.com', firstName: 'Shadow', lastName: 'Donor' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-page__bg-shapes">
        <div className="auth-page__shape auth-page__shape--1" />
        <div className="auth-page__shape auth-page__shape--2" />
        <div className="auth-page__shape auth-page__shape--3" />
      </div>

      <div className="auth-card glass-strong animate-fade-in-up">
        <Link to="/" className="auth-card__back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>

        <Link to="/" className="auth-card__brand" style={{ marginTop: '24px' }}>
          <img src="/omp-logo.png" alt="OMP Logo" style={{ height: '32px', width: 'auto', marginRight: '8px' }} />
          <span className="gradient-text">OMP</span>
          <span className="auth-card__brand-sub">OpenmindProjects</span>
        </Link>

        <h1 className="auth-card__title">Welcome Back</h1>
        <p className="auth-card__subtitle">Sign in to your donor dashboard</p>

        {error && (
          <div className="auth-card__error animate-fade-in">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-form__submit"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-form__spinner" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-card__divider">
          <span>or</span>
        </div>

        <button
          className="auth-form__google-btn"
          onClick={() => setShowMockPanel(!showMockPanel)}
          type="button"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        {showMockPanel && (
          <div className="auth-card__mock-panel animate-fade-in">
            <p className="auth-card__mock-label">🧪 Dev Mock — Select a persona:</p>
            {mockPersonas.map((p, i) => (
              <button
                key={i}
                className="auth-card__mock-btn"
                onClick={() => handleMockGoogle(p)}
                disabled={loading}
              >
                {p.label} ({p.email})
              </button>
            ))}
          </div>
        )}

        <p className="auth-card__footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-card__link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
