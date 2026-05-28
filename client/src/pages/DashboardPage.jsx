import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/layout/DashboardNav';
import CheckoutModal from '../components/checkout/CheckoutModal';
import CustomAmountCard from '../components/donation/CustomAmountCard';
import Modal from '../components/ui/Modal';
import DonationReceipt from '../components/donation/DonationReceipt';
import UserSummaryCard from '../components/dashboard/UserSummaryCard';
import LifetimeMilestonesCard from '../components/dashboard/LifetimeMilestonesCard';
import * as api from '../services/api';
import './DashboardPage.css';

/**
 * DashboardPage is the donor control center.
 * Features profile summaries, current subscription adjustments, achievements (milestones),
 * and interactive receipt drill-down generation.
 * 
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  const { profileData, refreshUser } = useAuth();
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });
  const [claimingId, setClaimingId] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState(null);

  const data = profileData;

  useEffect(() => {
    // Refresh user state on mount to ensure synchronized records
    refreshUser();
  }, []);

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

  /**
   * Spawns milestone claims API request and triggers brief visual confetti pop.
   * @param {number} milestoneId - Milestone unique identifier.
   */
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

  /**
   * Fast-tracks available subscription preset tiers direct to Checkout StripeModal.
   * @param {number} amount - Tier preset sum in USD.
   */
  const handleStartDonation = (amount) => {
    setSelectedAmount(amount);
    setCheckoutOpen(true);
  };

  return (
    <div className="dashboard-page">
      <DashboardNav />

      {/* Interactive celebratory confetti */}
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
          {/* Top Row Profile Metrics */}
          <UserSummaryCard
            user={user}
            tier={tier}
            monthlyAmount={monthlyAmount}
            lifetimeTotal={lifetimeTotal}
          />

          {/* Left Column - Change donation amount card (Presets & click action) */}
          <div className="dashboard-col-left">
            <section className="dash-card dash-card--update animate-fade-in-up animate-delay-1">
              <CustomAmountCard
                onDonate={handleStartDonation}
                title="Change total donation amount"
                desc="The amount you choose will become your new monthly total."
                buttonLabel="Change Total Amount"
                presetAmounts={[10, 85, 170]}
              >
                <div className="dash-tiers-desc">
                  <span className="dash-tiers-label">Available Tiers (Click to select)</span>
                  
                  <div 
                    className="dash-tier-row" 
                    onClick={() => handleStartDonation(10)} 
                    style={{ borderLeft: '3px solid #4285f4', cursor: 'pointer' }}
                  >
                    <strong>Regular — $10+/mo</strong>
                    <p>Newsletter · Yearly zoom event · Voting seeds · Discounted OMP tours</p>
                  </div>
                  
                  <div 
                    className="dash-tier-row" 
                    onClick={() => handleStartDonation(85)} 
                    style={{ borderLeft: '3px solid #34a853', cursor: 'pointer' }}
                  >
                    <strong>Shareholder — $85+/mo</strong>
                    <p>All Regular perks · Quarter meetings · Campaign voting · Extra votes per $10 above $75</p>
                  </div>
                  
                  <div 
                    className="dash-tier-row" 
                    onClick={() => handleStartDonation(170)} 
                    style={{ borderLeft: '3px solid #fbbc04', cursor: 'pointer' }}
                  >
                    <strong>Patron — $170+/mo</strong>
                    <p>All Shareholder perks · Name on camp t-shirts · Social media shout-outs</p>
                  </div>
                </div>
              </CustomAmountCard>
            </section>
          </div>

          {/* Right Column - Top: Lifetime Milestones, Bottom: Donation History */}
          <div className="dashboard-col-right">
            {/* Top slot: Lifetime Milestones */}
            <LifetimeMilestonesCard
              milestones={milestones}
              lifetimeTotal={lifetimeTotal}
              claimedMilestones={claimedMilestones}
              claimingId={claimingId}
              onClaimMilestone={handleClaimMilestone}
            />

            {/* Bottom slot: Donation History */}
            <section className="dash-card dash-card--history animate-fade-in-up animate-delay-2">
              <h3 className="dash-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Donation History
              </h3>

              {transactions?.length > 0 ? (
                <div className="dash-timeline">
                  {transactions.map((t) => (
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
                <div className="dash-history-empty">
                  <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-blue)', opacity: 0.7 }}>
                    <path d="M50 75 C50 75 25 57.5 25 37.5 C25 25 35 15 45 22.5 C47.5 25 50 30 50 30 C50 30 52.5 25 55 22.5 C65 15 75 25 75 37.5 C75 57.5 50 75 50 75 Z" />
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
