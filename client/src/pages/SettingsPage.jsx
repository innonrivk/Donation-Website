import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/layout/DashboardNav';
import * as api from '../services/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  // ── Name ──
  const [nameForm, setNameForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState({ type: '', text: '' });

  // ── Password ──
  const [pwStep, setPwStep] = useState('idle'); // idle → otp_sent → done
  const [pwOtp, setPwOtp] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [devPwOtp, setDevPwOtp] = useState('');

  // ── Email ──
  const [emStep, setEmStep] = useState('idle');
  const [emNew, setEmNew] = useState('');
  const [emOtp, setEmOtp] = useState('');
  const [emLoading, setEmLoading] = useState(false);
  const [emMsg, setEmMsg] = useState({ type: '', text: '' });
  const [devEmOtp, setDevEmOtp] = useState('');

  // ── Accordion ──
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  // ── Name Handlers ──
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!nameForm.firstName || !nameForm.lastName) {
      setNameMsg({ type: 'error', text: 'Both fields are required.' });
      return;
    }
    setNameLoading(true);
    setNameMsg({ type: '', text: '' });
    try {
      const result = await api.changeName(nameForm);
      setNameMsg({ type: 'success', text: result.message });
      await refreshUser();
    } catch (err) {
      setNameMsg({ type: 'error', text: err.message });
    } finally {
      setNameLoading(false);
    }
  };

  // ── Password Handlers ──
  const handleRequestPwOtp = async () => {
    setPwLoading(true);
    setPwMsg({ type: '', text: '' });
    setDevPwOtp('');
    try {
      const result = await api.requestPasswordOtp();
      setPwStep('otp_sent');
      setPwMsg({ type: 'success', text: 'Verification code sent to your email.' });
      if (result.devOtp) {
        setDevPwOtp(result.devOtp);
      }
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (pwNew.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPwLoading(true);
    setPwMsg({ type: '', text: '' });
    try {
      const result = await api.changePassword({ otp: pwOtp, newPassword: pwNew });
      setPwMsg({ type: 'success', text: result.message });
      setPwStep('done');
      setPwOtp('');
      setPwNew('');
      setPwConfirm('');
      setDevPwOtp('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwLoading(false);
    }
  };

  // ── Email Handlers ──
  const handleRequestEmOtp = async (e) => {
    e.preventDefault();
    if (!emNew) {
      setEmMsg({ type: 'error', text: 'Enter a new email address.' });
      return;
    }
    setEmLoading(true);
    setEmMsg({ type: '', text: '' });
    setDevEmOtp('');
    try {
      const result = await api.requestEmailOtp({ newEmail: emNew });
      setEmStep('otp_sent');
      setEmMsg({ type: 'success', text: 'Verification code sent to the new email.' });
      if (result.devOtp) {
        setDevEmOtp(result.devOtp);
      }
    } catch (err) {
      setEmMsg({ type: 'error', text: err.message });
    } finally {
      setEmLoading(false);
    }
  };

  const handleChangeEm = async (e, codeToUse = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setEmLoading(true);
    setEmMsg({ type: '', text: '' });
    try {
      const result = await api.changeEmail({ otp: codeToUse || emOtp });
      setEmMsg({ type: 'success', text: result.message });
      setEmStep('done');
      await refreshUser();
    } catch (err) {
      setEmMsg({ type: 'error', text: err.message });
    } finally {
      setEmLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <DashboardNav />

      <main className="settings-main container">
        <h1 className="settings-title animate-fade-in-up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </h1>

        {/* ── Change Name ── */}
        <div className="settings-accordion animate-fade-in-up animate-delay-1">
          <button
            className={`settings-accordion__header ${openSection === 'name' ? 'settings-accordion__header--open' : ''}`}
            onClick={() => toggleSection('name')}
          >
            <span>Change Name</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" className="settings-accordion__icon">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {openSection === 'name' && (
            <div className="settings-accordion__body animate-fade-in">
              <form onSubmit={handleNameSubmit} className="settings-form">
                <div className="auth-form__row">
                  <div className="auth-form__field">
                    <label htmlFor="settings-first">First Name</label>
                    <input
                      id="settings-first"
                      type="text"
                      value={nameForm.firstName}
                      onChange={e => setNameForm(p => ({ ...p, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="auth-form__field">
                    <label htmlFor="settings-last">Last Name</label>
                    <input
                      id="settings-last"
                      type="text"
                      value={nameForm.lastName}
                      onChange={e => setNameForm(p => ({ ...p, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                {nameMsg.text && <p className={`dash-msg dash-msg--${nameMsg.type}`}>{nameMsg.text}</p>}
                <button type="submit" className="settings-btn" disabled={nameLoading}>
                  {nameLoading ? <span className="auth-form__spinner" /> : 'Update Name'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Change Password ── */}
        <div className="settings-accordion animate-fade-in-up animate-delay-2">
          <button
            className={`settings-accordion__header ${openSection === 'password' ? 'settings-accordion__header--open' : ''}`}
            onClick={() => toggleSection('password')}
          >
            <span>Change Password</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" className="settings-accordion__icon">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {openSection === 'password' && (
            <div className="settings-accordion__body animate-fade-in">
              {pwStep === 'idle' && (
                <div className="settings-form">
                  <p className="settings-info">We'll send a verification code to your email to confirm the change.</p>
                  {pwMsg.text && <p className={`dash-msg dash-msg--${pwMsg.type}`}>{pwMsg.text}</p>}
                  <button className="settings-btn" onClick={handleRequestPwOtp} disabled={pwLoading}>
                    {pwLoading ? <span className="auth-form__spinner" /> : 'Send Verification Code'}
                  </button>
                </div>
              )}

              {pwStep === 'otp_sent' && (
                <form onSubmit={handleChangePw} className="settings-form">
                  {devPwOtp && (
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(66, 133, 244, 0.08)',
                      border: '1px dashed var(--brand-blue)',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>✨ [Dev Mode] Code: <strong>{devPwOtp}</strong></span>
                      <button
                        type="button"
                        onClick={() => setPwOtp(devPwOtp)}
                        style={{
                          background: 'var(--color-accent-gradient)',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Autofill
                      </button>
                    </div>
                  )}
                  <div className="auth-form__field">
                    <label htmlFor="pw-otp">Verification Code</label>
                    <input id="pw-otp" type="text" value={pwOtp} onChange={e => setPwOtp(e.target.value)} maxLength={6} placeholder="6-digit code" required />
                  </div>
                  <div className="auth-form__field">
                    <label htmlFor="pw-new">New Password</label>
                    <input id="pw-new" type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} minLength={8} placeholder="At least 8 characters" required />
                  </div>
                  <div className="auth-form__field">
                    <label htmlFor="pw-confirm">Confirm New Password</label>
                    <input id="pw-confirm" type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} minLength={8} placeholder="Repeat password" required />
                  </div>
                  {pwMsg.text && <p className={`dash-msg dash-msg--${pwMsg.type}`}>{pwMsg.text}</p>}
                  <button type="submit" className="settings-btn" disabled={pwLoading}>
                    {pwLoading ? <span className="auth-form__spinner" /> : 'Update Password'}
                  </button>
                </form>
              )}

              {pwStep === 'done' && (
                <div className="settings-form">
                  <p className="settings-success">✓ Password updated successfully.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Change Email ── */}
        <div className="settings-accordion animate-fade-in-up animate-delay-3">
          <button
            className={`settings-accordion__header ${openSection === 'email' ? 'settings-accordion__header--open' : ''}`}
            onClick={() => toggleSection('email')}
          >
            <span>Change Email</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" className="settings-accordion__icon">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {openSection === 'email' && (
            <div className="settings-accordion__body animate-fade-in">
              {emStep === 'idle' && (
                <form onSubmit={handleRequestEmOtp} className="settings-form">
                  <p className="settings-info">Current email: <strong>{user?.email}</strong></p>
                  <div className="auth-form__field">
                    <label htmlFor="em-new">New Email Address</label>
                    <input id="em-new" type="email" value={emNew} onChange={e => setEmNew(e.target.value)} placeholder="new@email.com" required />
                  </div>
                  {emMsg.text && <p className={`dash-msg dash-msg--${emMsg.type}`}>{emMsg.text}</p>}
                  <button type="submit" className="settings-btn" disabled={emLoading}>
                    {emLoading ? <span className="auth-form__spinner" /> : 'Send Verification Code'}
                  </button>
                </form>
              )}

              {emStep === 'otp_sent' && (
                <form onSubmit={handleChangeEm} className="settings-form">
                  <p className="settings-info">Enter the code sent to <strong>{emNew}</strong></p>
                  {devEmOtp && (
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(66, 133, 244, 0.08)',
                      border: '1px dashed var(--brand-blue)',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>✨ [Dev Mode] Code: <strong>{devEmOtp}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmOtp(devEmOtp);
                          handleChangeEm(null, devEmOtp);
                        }}
                        style={{
                          background: 'var(--color-accent-gradient)',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Autofill & Submit
                      </button>
                    </div>
                  )}
                  <div className="auth-form__field">
                    <label htmlFor="em-otp">Verification Code</label>
                    <input id="em-otp" type="text" value={emOtp} onChange={e => setEmOtp(e.target.value)} maxLength={6} placeholder="6-digit code" required />
                  </div>
                  {emMsg.text && <p className={`dash-msg dash-msg--${emMsg.type}`}>{emMsg.text}</p>}
                  <button type="submit" className="settings-btn" disabled={emLoading}>
                    {emLoading ? <span className="auth-form__spinner" /> : 'Update Email'}
                  </button>
                </form>
              )}

              {emStep === 'done' && (
                <div className="settings-form">
                  <p className="settings-success">✓ Email updated successfully.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
