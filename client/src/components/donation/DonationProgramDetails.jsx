import './DonationProgramDetails.css';

const TIER_ICONS = {
  regular: '🌱',
  shareholder: '📊',
  patron: '👑',
};

function getTierRange(tier) {
  if (tier.maxAmount == null) {
    return `$${tier.minAmount}+/mo`;
  }
  return `$${tier.minAmount} – $${tier.maxAmount}/mo`;
}

function parsePerks(perks) {
  if (typeof perks === 'string') {
    try {
      return JSON.parse(perks);
    } catch {
      return [perks];
    }
  }
  return Array.isArray(perks) ? perks : [];
}

/**
 * DonationProgramDetails displays tiers and milestones on the landing page.
 *
 * Why? Splits donation milestones into separate tracks to visually differentiate
 * monthly subscription roadmaps from one-time repeatable objectives.
 *
 * @param {Object} props
 * @param {Array} props.tiers - Donation tier levels
 * @param {Array} props.milestones - Accomplishment levels
 * @returns {JSX.Element|null}
 */
export default function DonationProgramDetails({ tiers, milestones }) {
  const hasTiers = tiers && tiers.length > 0;
  const hasMilestones = milestones && milestones.length > 0;

  if (!hasTiers && !hasMilestones) return null;

  return (
    <section className="program-details section" id="tiers">
      <div className="container">
        {/* ── Tiers ── */}
        {hasTiers && (
          <>
            <div className="program-details__header">
              <span className="program-details__label">Your Benefits</span>
              <h2 className="program-details__title">
                Donation <span className="gradient-text">Tiers</span>
              </h2>
              <p className="program-details__desc">
                Every dollar makes an impact. Choose your tier and unlock exclusive
                perks that deepen your connection to our mission.
              </p>
            </div>

            <div className="tiers-grid">
              {tiers.map((tier) => {
                const isFeatured = tier.tierLevel === 3; // Patron
                const perks = parsePerks(tier.perks);
                const icon =
                  TIER_ICONS[tier.name.toLowerCase()] || '⭐';

                return (
                  <div
                    key={tier.id}
                    className={`tier-card${isFeatured ? ' tier-card--featured' : ''}`}
                  >
                    {isFeatured && (
                      <div className="tier-card__badge">Best Value</div>
                    )}
                    <div className="tier-card__icon">{icon}</div>
                    <h3 className="tier-card__name">{tier.name}</h3>
                    <span className="tier-card__range">{getTierRange(tier)}</span>
                    <div className="tier-card__divider" />
                    <ul className="tier-card__perks">
                      {perks.map((perk, i) => (
                        <li key={i} className="tier-card__perk">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Money Milestones ── */}
        {hasMilestones && (
          <div className="milestones-section" id="milestones">
            {/* ── Monthly Donation Roadmap ── */}
            {milestones.some(m => !m.isRepeatable) && (
              <div className="milestones-track-section" style={{ marginBottom: '5rem' }}>
                <div className="milestones-header">
                  <span className="milestones-header__label">Monthly Rewards</span>
                  <h2 className="milestones-header__title">
                    Monthly Donation <span className="gradient-text">Roadmap</span>
                  </h2>
                  <p className="milestones-header__desc">
                    Your consistent monthly support drives lasting change. Reach these honorary milestones to unlock certificates and premium donor statuses.
                  </p>
                </div>

                <div className="milestones-timeline">
                  {milestones.filter(m => !m.isRepeatable).map((m) => (
                    <div
                      key={m.id}
                      className="milestone-item"
                    >
                      <div className="milestone-item__top">
                        <span className="milestone-item__amount">
                          ${m.amountUsd.toLocaleString()}
                        </span>
                        <span className="milestone-item__label">{m.label}</span>
                      </div>
                      <p className="milestone-item__desc">{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tangible Impact Objectives ── */}
            {milestones.some(m => m.isRepeatable) && (
              <div className="milestones-track-section">
                <div className="milestones-header">
                  <span className="milestones-header__label">One-Time Objectives</span>
                  <h2 className="milestones-header__title">
                    Tangible Impact <span className="gradient-text">Objectives</span>
                  </h2>
                  <p className="milestones-header__desc">
                    Funded entirely by one-time donations. Every repeatable target you hit directly finances tangible supplies and field resources.
                  </p>
                </div>

                <div className="milestones-timeline">
                  {milestones.filter(m => m.isRepeatable).map((m) => (
                    <div
                      key={m.id}
                      className="milestone-item"
                    >
                      <div className="milestone-item__top">
                        <span className="milestone-item__amount">
                          ${m.amountUsd.toLocaleString()}
                        </span>
                        <span className="milestone-item__repeatable">Repeatable Objective</span>
                        <span className="milestone-item__label" style={{ background: 'rgba(49, 151, 149, 0.1)', color: '#319795' }}>{m.label}</span>
                      </div>
                      <p className="milestone-item__desc">{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
