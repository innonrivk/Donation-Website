import React from 'react';

/**
 * LifetimeMilestonesCard renders historical achievement goals for the donor.
 * Allows unlocking and claiming certs/rewards.
 * 
 * @param {Object} props
 * @param {Array} props.milestones - All system Milestones
 * @param {number} props.lifetimeTotal - Total money donated historically in USD
 * @param {Array} props.claimedMilestones - User claimed milestones relations
 * @param {number|string|null} props.claimingId - Currently loading claim state ID
 * @param {Function} props.onClaimMilestone - Action handler when claim button is clicked
 */
export default function LifetimeMilestonesCard({
  milestones,
  lifetimeTotal,
  claimedMilestones,
  claimingId,
  onClaimMilestone,
}) {
  /**
   * Counts how many times this specific milestone has been claimed by the user.
   */
  const getClaimCount = (milestoneId) =>
    claimedMilestones?.filter((cm) => cm.milestoneId === milestoneId).length || 0;

  return (
    <section className="dash-card dash-card--milestones animate-fade-in-up animate-delay-1">
      <h3 className="dash-card__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99A9 9 0 0122.5 12c0 2.108-.966 3.99-2.48 5.228M12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.388a9.06 9.06 0 00-5.25 0" />
        </svg>
        Lifetime Milestones
      </h3>

      <div className="dash-milestones-list">
        {milestones?.map((m) => {
          const claimCount = getClaimCount(m.id);
          let progress, isUnlocked, claimedPermanently;

          if (m.isRepeatable) {
            // Repeatable: progress indicates credit progress towards next claim
            const creditUsed = claimCount * m.amountUsd;
            const remainingCredit = Math.max(0, lifetimeTotal - creditUsed);
            progress = Math.min((remainingCredit / m.amountUsd) * 100, 100);
            isUnlocked = remainingCredit >= m.amountUsd;
            claimedPermanently = false;
          } else {
            // One-time: progress indicates progress towards unlocking
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
                  onClick={() => onClaimMilestone(m.id)}
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
  );
}
