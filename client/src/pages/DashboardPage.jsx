import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/layout/DashboardNav';
import CheckoutModal from '../components/checkout/CheckoutModal';
import CustomAmountCard from '../components/donation/CustomAmountCard';
import Modal from '../components/ui/Modal';
import DonationReceipt from '../components/donation/DonationReceipt';
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
  const [selectedReceiptTx, setSelectedReceiptTx] = useState(null);

  const data = profileData;

  useEffect(() => {
    refreshUser();
  }, []); // Refresh user state on mount to check for any changes

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

  const getClaimCount = (milestoneId) =>
    claimedMilestones?.filter(cm => cm.milestoneId === milestoneId).length || 0;

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

          {/* Left Column (Donation History) */}
          <div className="dashboard-col-left">
            <section className="dash-card dash-card--history animate-fade-in-up animate-delay-1">
              <h3 className="dash-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Donation History
              </h3>

              {transactions?.length > 0 ? (
                <div className="dash-timeline">
                  {transactions.map(t => (
                    <div
                      key={t.id}
                      className="dash-timeline__item dash-timeline__item--clickable"
                      onClick={() => setSelectedReceiptTx(t)}
                    >
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
                <div className="dash-history-empty" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  gap: '16px'
                }}>
                  <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-blue)', opacity: 0.7 }}>
                    {/* Heart Outline */}
                    <path d="M50 75 C50 75 25 57.5 25 37.5 C25 25 35 15 45 22.5 C47.5 25 50 30 50 30 C50 30 52.5 25 55 22.5 C65 15 75 25 75 37.5 C75 57.5 50 75 50 75 Z" />
                    {/* Pulse path overlapping */}
                    <path d="M15 50 H32 L38 30 L46 65 L52 42 L56 54 L62 50 H85" stroke="var(--brand-green)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 3px rgba(52,168,83,0.3))' }} />
                  </svg>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '15px' }}>No donation history yet</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '280px', lineHeight: '1.5' }}>
                      Your contribution records will appear here as soon as you complete your first recurring monthly donation!
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column (Donation Preset Cards & Lifetime Milestones) */}
          <div className="dashboard-col-right">
            {/* ── Monthly Donation Update Widget / Start Donation ── */}
            <section className="dash-card dash-card--update animate-fade-in-up animate-delay-1">
              <CustomAmountCard
                onDonate={handleStartDonation}
                title="Change total donation amount"
                desc="The amount you choose will become your new monthly total."
                buttonLabel="Change Total Amount"
                presetAmounts={[10, 85, 170]}
              >
                {/* Tier descriptions rendered inside the card as children */}
                <div className="dash-tiers-desc">
                  <span className="dash-tiers-label">Available Tiers (Click to select)</span>
                  <div className="dash-tier-row" onClick={() => handleStartDonation(10)} style={{ borderLeft: '3px solid #4285f4' }}>
                    <strong>Regular — $10+/mo</strong>
                    <p>Newsletter · Yearly zoom event · Voting seeds · Discounted OMP tours</p>
                  </div>
                  <div className="dash-tier-row" onClick={() => handleStartDonation(85)} style={{ borderLeft: '3px solid #34a853' }}>
                    <strong>Shareholder — $85+/mo</strong>
                    <p>All Regular perks · Quarter meetings · Campaign voting · Extra votes per $10 above $75</p>
                  </div>
                  <div className="dash-tier-row" onClick={() => handleStartDonation(170)} style={{ borderLeft: '3px solid #fbbc04' }}>
                    <strong>Patron — $170+/mo</strong>
                    <p>All Shareholder perks · Name on camp t-shirts · Social media shout-outs</p>
                  </div>
                </div>
              </CustomAmountCard>
            </section>

            {/* ── Lifetime Milestones Panel ── */}
            <section className="dash-card dash-card--milestones animate-fade-in-up animate-delay-2">
              <h3 className="dash-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99A9 9 0 0122.5 12c0 2.108-.966 3.99-2.48 5.228M12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.388a9.06 9.06 0 00-5.25 0" />
                </svg>
                Lifetime Milestones
              </h3>

              <div className="dash-milestones-list">
                {milestones?.map(m => {
                  const claimCount = getClaimCount(m.id);

                  let progress, isUnlocked, claimedPermanently;

                  if (m.isRepeatable) {
                    // Credit remaining since last claim for this specific milestone
                    const creditUsed = claimCount * m.amountUsd;
                    const remainingCredit = Math.max(0, lifetimeTotal - creditUsed);
                    progress = Math.min((remainingCredit / m.amountUsd) * 100, 100);
                    isUnlocked = remainingCredit >= m.amountUsd;
                    claimedPermanently = false;
                  } else {
                    progress = Math.min((lifetimeTotal / m.amountUsd) * 100, 100);
                    isUnlocked = lifetimeTotal >= m.amountUsd;
                    claimedPermanently = claimCount >= 1;
                  }

                  return (
                  <div key={m.id} className={`dash-milestone ${isUnlocked ? 'dash-milestone--unlocked' : ''}`}>
                    <div className="dash-milestone__header">
                      <span className="dash-milestone__label">
                        {m.label}
                        {m.isRepeatable && claimCount > 0 && (
                          <span className="dash-milestone__repeat-count" style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                            🔁 Claimed {claimCount}×
                          </span>
                        )}
                      </span>
                      <span className="dash-milestone__target">${m.amountUsd}</span>
                    </div>
                    <div className="dash-milestone__bar">
                      <div
                        className="dash-milestone__fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="dash-milestone__desc">{m.description}</p>
                    {isUnlocked && !claimedPermanently && (
                      <button
                        className="dash-milestone__claim"
                        onClick={() => handleClaimMilestone(m.id)}
                        disabled={claimingId === m.id}
                      >
                        {claimingId === m.id ? '...' : '🎉 Claim Reward'}
                      </button>
                    )}
                    {claimedPermanently && (
                      <span className="dash-milestone__claimed">✓ Claimed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => { setCheckoutOpen(false); refreshUser(); }}
        amount={selectedAmount}
      />

      <Modal
        isOpen={!!selectedReceiptTx}
        onClose={() => setSelectedReceiptTx(null)}
        title="Donation Receipt"
        size="lg"
      >
        {selectedReceiptTx && (
          <DonationReceipt
            referenceId={selectedReceiptTx.id}
            dateStr={new Date(selectedReceiptTx.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            amount={Math.round(selectedReceiptTx.amount / 100)}
            donorName={`${user.firstName} ${user.lastName}`}
            donorEmail={user.email}
            country={user.country}
            tierName={
              tiers.find(t => {
                const amt = Math.round(selectedReceiptTx.amount / 100);
                return amt >= t.minAmount && (t.maxAmount === null || amt <= t.maxAmount);
              })?.name || 'Regular'
            }
            tierPerks={
              (() => {
                const matchingTier = tiers.find(t => {
                  const amt = Math.round(selectedReceiptTx.amount / 100);
                  return amt >= t.minAmount && (t.maxAmount === null || amt <= t.maxAmount);
                });
                if (matchingTier) {
                  try {
                    return typeof matchingTier.perks === 'string'
                      ? JSON.parse(matchingTier.perks)
                      : (Array.isArray(matchingTier.perks) ? matchingTier.perks : []);
                  } catch (e) {
                    return [];
                  }
                }
                return [];
              })()
            }
            showPrintButton={true}
            onClose={() => setSelectedReceiptTx(null)}
          />
        )}
      </Modal>
    </div>
  );
}
