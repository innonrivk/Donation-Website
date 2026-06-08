import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './OtpVerifyPage.css';

export default function OtpVerifyPage() {
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);

  // Get email from sessionStorage (set during signup)
  const email = sessionStorage.getItem('otp_email');
  const password = sessionStorage.getItem('otp_password');

  // Redirect if no OTP context
  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (newDigits.every(d => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otpCode) => {
    setLoading(true);
    setError('');

    try {
      await verifyOtp({
        email,
        otp: otpCode,
        password,
      });

      // Clean up sessionStorage
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_password');

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      const { signup } = await import('../services/api');
      await signup({ email, firstName: '', lastName: '', password });
      setResendCooldown(60);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  if (!email) return null;

  return (
    <div className="auth-page">
      <div className="auth-page__bg-shapes">
        <div className="auth-page__shape auth-page__shape--1" />
        <div className="auth-page__shape auth-page__shape--2" />
        <div className="auth-page__shape auth-page__shape--3" />
      </div>

      <div className="auth-card glass-strong animate-fade-in-up">
        <Link to="/signup" className="auth-card__back-btn">
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

        <div className="otp-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="auth-card__title">Verify Your Email</h1>
        <p className="auth-card__subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && (
          <div className="auth-card__error animate-fade-in">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`otp-input ${digit ? 'otp-input--filled' : ''}`}
              disabled={loading}
              autoFocus={i === 0}
              id={`otp-digit-${i}`}
            />
          ))}
        </div>

        {loading && (
          <div className="otp-verifying">
            <span className="auth-form__spinner" />
            <span>Verifying...</span>
          </div>
        )}

        <div className="otp-resend">
          {resendCooldown > 0 ? (
            <span className="otp-resend__timer">
              Resend code in {resendCooldown}s
            </span>
          ) : (
            <button
              className="otp-resend__btn"
              onClick={handleResend}
              type="button"
            >
              Resend verification code
            </button>
          )}
        </div>

        <p className="auth-card__footer">
          <Link to="/signup" className="auth-card__link">← Back to Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
