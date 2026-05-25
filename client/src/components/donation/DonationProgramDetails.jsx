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
            <div className="program-details__header animate-fade-in-up">
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
              {tiers.map((tier, index) => {
                const isFeatured = tier.tierLevel === 3; // Patron
                const perks = parsePerks(tier.perks);
                const icon =
                  TIER_ICONS[tier.name.toLowerCase()] || '⭐';

                return (
                  <div
                    key={tier.id}
                    className={`tier-card${isFeatured ? ' tier-card--featured' : ''} animate-fade-in-up animate-delay-${index + 1}`}
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
            <div className="milestones-header animate-fade-in-up">
              <span className="milestones-header__label">Lifetime Rewards</span>
              <h2 className="milestones-header__title">
                Total Donation <span className="gradient-text">Objectives</span>
              </h2>
              <p className="milestones-header__desc">
                The more you give over time, the more recognition you earn.
                Reach these milestones and unlock special rewards.
              </p>
            </div>

            <div className="milestones-timeline">
              {milestones.map((m, index) => (
                <div
                  key={m.id}
                  className={`milestone-item animate-fade-in-up animate-delay-${Math.min(index + 1, 6)}`}
                >
                  <div className="milestone-item__top">
                    <span className="milestone-item__amount">
                      ${m.amountUsd.toLocaleString()}
                    </span>
                    <span className="milestone-item__label">{m.label}</span>
                    {m.isRepeatable && (
                      <span className="milestone-item__repeatable">Repeatable</span>
                    )}
                  </div>
                  <p className="milestone-item__desc">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
