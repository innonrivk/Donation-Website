import React from 'react';

/**
 * UserSummaryCard renders the profile information, active subscription tier badge,
 * and quick totals (monthly amount, lifetime total donations) at the top of the dashboard.
 * 
 * @param {Object} props
 * @param {Object} props.user - Contains firstName, lastName, email
 * @param {Object} props.tier - Contains name, minAmount, maxAmount
 * @param {number} props.monthlyAmount - Current active subscription sum
 * @param {number} props.lifetimeTotal - Historical gross donations sum
 */
export default function UserSummaryCard({ user, tier, monthlyAmount, lifetimeTotal }) {
  // Tier color branding definitions
  const tierColors = {
    Regular: { bg: 'rgba(66, 133, 244, 0.1)', border: '#4285f4', glow: 'rgba(66, 133, 244, 0.3)' },
    Shareholder: { bg: 'rgba(52, 168, 83, 0.1)', border: '#34a853', glow: 'rgba(52, 168, 83, 0.3)' },
    Patron: { bg: 'rgba(251, 188, 4, 0.1)', border: '#fbbc04', glow: 'rgba(251, 188, 4, 0.3)' },
  };

  const tc = tierColors[tier?.name] || tierColors.Regular;

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
  );
}
