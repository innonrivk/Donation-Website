import { motion } from 'framer-motion';
import { formatContentInline } from '../../utils/formatContent';

/**
 * UserSummaryCard renders the profile information, active subscription tier badge,
 * and quick totals (monthly amount, lifetime total donations) at the top of the dashboard.
 * 
 * Why? Using framer-motion animations and explicit layout styling for scheduled amounts
 * provides clear, branded visual feedback for pending updates.
 *
 * @param {Object} props
 * @param {Object} props.user - Contains firstName, lastName, email
 * @param {Object} props.tier - Contains name, minAmount, maxAmount
 * @param {number} props.monthlyAmount - Current active subscription sum
 * @param {number} props.scheduledAmount - Scheduled next billing cycle donation amount
 * @param {string} props.scheduledAmountEffectiveDate - Next cycle billing date ISO string
 * @param {number} props.lifetimeTotal - Historical gross donations sum
 */
export default function UserSummaryCard({ 
  user, 
  tier, 
  monthlyAmount, 
  scheduledAmount,
  scheduledAmountEffectiveDate,
  lifetimeTotal 
}) {
  // Tier color branding definitions
  const tierColors = {
    Regular: { bg: 'rgba(66, 133, 244, 0.1)', border: '#4285f4', glow: 'rgba(66, 133, 244, 0.3)' },
    Shareholder: { bg: 'rgba(52, 168, 83, 0.1)', border: '#34a853', glow: 'rgba(52, 168, 83, 0.3)' },
    Patron: { bg: 'rgba(251, 188, 4, 0.1)', border: '#fbbc04', glow: 'rgba(251, 188, 4, 0.3)' },
  };

  const tc = tierColors[tier?.name] || tierColors.Regular;

  const isChanged = scheduledAmount && scheduledAmount !== monthlyAmount;
  const isIncrease = scheduledAmount > monthlyAmount;

  return (
    <section className="dash-card dash-card--summary animate-fade-in-up">
      <div className="dash-card__header">
        <div 
          className="dash-summary__avatar" 
          style={{ borderColor: tc.border, boxShadow: `0 0 20px ${tc.glow}` }}
        >
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="dash-summary__info">
          <h2 className="dash-summary__name">{user?.firstName} {user?.lastName}</h2>
          <p className="dash-summary__email">{user?.email}</p>
        </div>
      </div>

      <div className="dash-summary__stats">
        <div className="dash-stat">
          <span className="dash-stat__label">Current Tier</span>
          <span className="dash-stat__value" style={{ color: tc.border }}>
            {tier?.name ? formatContentInline(tier.name) : 'None'}
          </span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat__label">Monthly</span>
          {isChanged ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="dash-stat__value" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ${monthlyAmount || 0}
                <span style={{ color: '#9ca3af', fontWeight: '400', fontSize: '0.9rem' }}>→</span>
                <motion.span 
                  style={{ color: isIncrease ? '#34a853' : '#fbbc04', fontWeight: '800' }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  ${scheduledAmount}
                </motion.span>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 'normal' }}>/mo</span>
              </span>
              {scheduledAmountEffectiveDate && (
                <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px', fontWeight: '500' }}>
                  Effective {new Date(scheduledAmountEffectiveDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          ) : (
            <span className="dash-stat__value">${monthlyAmount || 0}/mo</span>
          )}
        </div>
        <div className="dash-stat">
          <span className="dash-stat__label">Lifetime</span>
          <span className="dash-stat__value">${lifetimeTotal || 0}</span>
        </div>
      </div>

      {tier && (
        <div className="dash-tier-badge" style={{ background: tc.bg, borderColor: tc.border }}>
          ✦ {formatContentInline(tier.name)} Tier
        </div>
      )}
    </section>
  );
}
