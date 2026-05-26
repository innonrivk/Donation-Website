import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/layout/DashboardNav';
import CheckoutModal from '../components/checkout/CheckoutModal';
import * as api from '../services/api';
import './DashboardPage.css';

export default function DashboardPage() {
  const { profileData, refreshUser } = useAuth();
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });
  const [claimingId, setClaimingId] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('10');

  const data = profileData;

  useEffect(() => {
    if (data?.monthlyAmount) {
      setUpdateAmount(String(data.monthlyAmount));
    }
  }, [data?.monthlyAmount]);

  if (!data) {
    return (
      <div className="dashboard-page">
        <DashboardNav />
        <div className="dashboard-loading">
          <div className="fullpage-spinner__ring" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { user, tier, monthlyAmount, lifetimeTotal, transactions, claimedMilestones, milestones, tiers } = data;

  // Preset amounts for quick selection
  const presetAmounts = [10, 25, 50, 85, 170];

  const handleUpdateSubscription = async () => {
    const amt = parseInt(updateAmount, 10);
    if (!amt || amt < 1) {
      setUpdateMsg({ type: 'error', text: 'Enter a valid amount ($1 minimum).' });
      return;
    }
    setUpdateLoading(true);
    setUpdateMsg({ type: '', text: '' });
    try {
      const result = await api.updateSubscription({ amount: amt });
      setUpdateMsg({ type: 'success', text: result.message });
      await refreshUser();
    } catch (err) {
      setUpdateMsg({ type: 'error', text: err.message });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setUpdateLoading(true);
    try {
      const result = await api.cancelSubscription();
      setUpdateMsg({ type: 'success', text: result.message });
      await refreshUser();
    } catch (err) {
      setUpdateMsg({ type: 'error', text: err.message });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleClaimMilestone = async (milestoneId) => {
    setClaimingId(milestoneId);
    try {
      await api.claimMilestone({ milestoneId });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
      await refreshUser();
    } catch (err) {
      alert(err.message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleStartDonation = (amount) => {
    setSelectedAmount(amount);
    setCheckoutOpen(true);
  };

  const isMilestoneClaimed = (id) => claimedMilestones?.some(cm => cm.milestoneId === id);

  // Tier color mapping
  const tierColors = {
    Regular: { bg: 'rgba(66, 133, 244, 0.1)', border: '#4285f4', glow: 'rgba(66, 133, 244, 0.3)' },
    Shareholder: { bg: 'rgba(52, 168, 83, 0.1)', border: '#34a853', glow: 'rgba(52, 168, 83, 0.3)' },
    Patron: { bg: 'rgba(251, 188, 4, 0.1)', border: '#fbbc04', glow: 'rgba(251, 188, 4, 0.3)' },
  };
  const tc = tierColors[tier?.name] || tierColors.Regular;

  return (
    <div className="dashboard-page">
      <DashboardNav />

      {confetti && (
        <div className="confetti-overlay">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#4285f4', '#ea4335', '#fbbc04', '#34a853'][Math.floor(Math.random() * 4)],
              }}
            />
          ))}
        </div>
      )}

      <main className="dashboard-main container">
        <div className="dashboard-grid">
          {/* ── User Summary Card ── */}
          <section className="dash-card dash-card--summary animate-fade-in-up">
            <div className="dash-card__header">
              <div className="dash-summary__avatar" style={{ borderColor: tc.border, boxShadow: `0 0 20px ${tc.glow}` }}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="dash-summary__info">
                <h2 className="dash-summary__name">{user.firstName} {user.lastName}</h2>
                <p className="dash-summary__email">{user.email}</p>
              </div>
            </div>

            <div className="dash-summary__stats">
              <div className="dash-stat">
                <span className="dash-stat__label">Current Tier</span>
                <span className="dash-stat__value" style={{ color: tc.border }}>
                  {tier?.name || 'None'}
                </span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat__label">Monthly</span>
                <span className="dash-stat__value">${monthlyAmount || 0}/mo</span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat__label">Lifetime</span>
                <span className="dash-stat__value">${lifetimeTotal || 0}</span>
              </div>
            </div>

            {tier && (
              <div className="dash-tier-badge" style={{ background: tc.bg, borderColor: tc.border }}>
                ✦ {tier.name} Tier
              </div>
            )}
          </section>

          {/* ── Monthly Donation Update Widget / Start Donation ── */}
          {monthlyAmount > 0 ? (
            <section className="dash-card dash-card--update animate-fade-in-up animate-delay-1">
              <h3 className="dash-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Update Monthly Donation
              </h3>

              <div className="dash-presets">
                {presetAmounts.map(amt => (
                  <button
                    key={amt}
                    className={`dash-preset-btn ${parseInt(updateAmount, 10) === amt ? 'dash-preset-btn--active' : ''}`}
                    onClick={() => { setUpdateAmount(String(amt)); setUpdateMsg({ type: '', text: '' }); }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <div className="dash-update-row">
                <div className="dash-update-input-wrap">
                  <span className="dash-update-input-prefix">$</span>
                  <input
                    type="number"
                    min="1"
                    value={updateAmount}
                    onChange={e => { setUpdateAmount(e.target.value); setUpdateMsg({ type: '', text: '' }); }}
                    className="dash-update-input"
                    placeholder="Amount"
                    id="update-amount"
                  />
                  <span className="dash-update-input-suffix">/mo</span>
                </div>
                <button
                  className="dash-update-btn"
                  onClick={handleUpdateSubscription}
                  disabled={updateLoading}
                >
                  {updateLoading ? <span className="auth-form__spinner" /> : 'Update'}
                </button>
              </div>

              {updateMsg.text && (
                <p className={`dash-msg dash-msg--${updateMsg.type}`}>
                  {updateMsg.text}
                </p>
              )}

              <button
                className="dash-cancel-btn"
                onClick={handleCancelSubscription}
                disabled={updateLoading}
              >
                Cancel Subscription
              </button>
            </section>
          ) : (
            <section className="dash-card dash-card--update animate-fade-in-up animate-delay-1">
              <h3 className="dash-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Change Total Amount
              </h3>
              
              <p className="dash-info-text" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                Enter the monthly amount you wish to contribute. The amount you enter here will be your new monthly total donation.
              </p>

              <div className="dash-update-row" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <div className="dash-update-input-wrap" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span className="dash-update-input-prefix" style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>$</span>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="dash-update-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 28px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: '#ffffff',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Amount"
                  />
                  <span className="dash-update-input-suffix" style={{ position: 'absolute', right: '12px', color: 'var(--color-text-muted)', fontSize: '14px' }}>/mo</span>
                </div>
                <button
                  className="dash-preset-btn dash-preset-btn--active"
                  onClick={() => {
                    const parsed = parseInt(customAmount, 10);
                    if (parsed && parsed >= 1) {
                      handleStartDonation(parsed);
                    } else {
                      alert('Please enter a valid amount ($1 minimum).');
                    }
                  }}
                  style={{
                    padding: '0 24px',
                    fontSize: '14px',
                    margin: '0',
                    height: '46px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    background: 'var(--color-accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)'
                  }}
                >
                  Change Total Amount
                </button>
              </div>

              {/* Tiers list description below the input */}
              <div className="dash-tiers-desc" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '10px' }}>
                  Available Tiers & Benefits
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(66, 133, 244, 0.04)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #4285f4' }}>
                    <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>Regular Tier ($1 - $84)</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Newsletter, Zoom events & tours</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(52, 168, 83, 0.04)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #34a853' }}>
                    <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>Shareholder Tier ($85 - $169)</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Campaign voting & extra seeds</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(251, 188, 4, 0.04)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #fbbc04' }}>
                    <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>Patron Tier ($170+)</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Social shout-outs & t-shirt sponsor</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Tier Rewards Card ── */}
          <section className="dash-card dash-card--rewards animate-fade-in-up animate-delay-2">
            <h3 className="dash-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              {tier ? `${tier.name} Perks` : 'Tier Perks'}
            </h3>

            {tier?.perks ? (
              <ul className="dash-perks-list">
                {(Array.isArray(tier.perks) ? tier.perks : []).map((perk, i) => (
                  <li key={i} className="dash-perk-item">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" className="dash-perk-check">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-card__empty">Start donating to unlock tier perks!</p>
            )}

            {tiers && (
              <div className="dash-tier-progress">
                {tiers.map((t, i) => (
                  <div
                    key={t.id}
                    className={`dash-tier-step ${tier?.tierLevel >= t.tierLevel ? 'dash-tier-step--active' : ''}`}
                  >
                    <div className="dash-tier-step__dot" />
                    <span>{t.name}</span>
                    <span className="dash-tier-step__amt">${t.minAmount}+</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Lifetime Milestones Panel ── */}
          <section className="dash-card dash-card--milestones animate-fade-in-up animate-delay-3">
            <h3 className="dash-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.388a9.06 9.06 0 00-5.25 0" />
              </svg>
              Lifetime Milestones
            </h3>

            <div className="dash-milestones-list">
              {milestones?.map(m => {
                const progress = Math.min((lifetimeTotal / m.amountUsd) * 100, 100);
                const isUnlocked = lifetimeTotal >= m.amountUsd;
                const claimed = isMilestoneClaimed(m.id);

                return (
                  <div key={m.id} className={`dash-milestone ${isUnlocked ? 'dash-milestone--unlocked' : ''}`}>
                    <div className="dash-milestone__header">
                      <span className="dash-milestone__label">{m.label}</span>
                      <span className="dash-milestone__target">${m.amountUsd}</span>
                    </div>
                    <div className="dash-milestone__bar">
                      <div
                        className="dash-milestone__fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="dash-milestone__desc">{m.description}</p>
                    {isUnlocked && !claimed && (
                      <button
                        className="dash-milestone__claim"
                        onClick={() => handleClaimMilestone(m.id)}
                        disabled={claimingId === m.id}
                      >
                        {claimingId === m.id ? '...' : '🎉 Claim Reward'}
                      </button>
                    )}
                    {claimed && (
                      <span className="dash-milestone__claimed">✓ Claimed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Donation History Timeline ── */}
          <section className="dash-card dash-card--history animate-fade-in-up animate-delay-4">
            <h3 className="dash-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Donation History
            </h3>

            {transactions?.length > 0 ? (
              <div className="dash-timeline">
                {transactions.map(t => (
                  <div key={t.id} className="dash-timeline__item">
                    <div className="dash-timeline__dot" />
                    <div className="dash-timeline__content">
                      <span className={`dash-timeline__amount ${t.status === 'FAILED' ? 'dash-timeline__amount--failed' : ''}`}>
                        ${(t.amount / 100).toFixed(2)}
                      </span>
                      <span className="dash-timeline__date">
                        {new Date(t.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className={`dash-timeline__status dash-timeline__status--${t.status.toLowerCase()}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dash-card__empty">No donation history yet. Start your journey!</p>
            )}
          </section>
        </div>
      </main>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => { setCheckoutOpen(false); refreshUser(); }}
        amount={selectedAmount}
      />
    </div>
  );
}
