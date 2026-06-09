import { useContent } from '../../context/ContentContext';
import { CONTENT_KEYS } from '../../lib/contentKeys';
import { formatContentInline } from '../../utils/formatContent';
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
              <h2 className="program-details__title">
                {formatContentInline(useContent(CONTENT_KEYS.TIERS_TITLE, 'Donation **Tiers**'))}
              </h2>
              <p className="program-details__desc">
                {formatContentInline(useContent(CONTENT_KEYS.TIERS_INTRO, 'Our tiers ensure transparency and show how every dollar level supports specific community goals.'))}
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
                  <h2 className="milestones-header__title">
                    {formatContentInline(useContent(CONTENT_KEYS.ROADMAP_TITLE, 'Monthly Donation **Roadmap**'))}
                  </h2>
                  <p className="milestones-header__desc">
                    {formatContentInline(useContent(CONTENT_KEYS.ROADMAP_INTRO, 'Track the path of your donation from initial funding to on-the-ground project deployment.'))}
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
                  <h2 className="milestones-header__title">
                    {formatContentInline(useContent(CONTENT_KEYS.IMPACT_TITLE, 'Tangible Impact **Objectives**'))}
                  </h2>
                  <p className="milestones-header__desc">
                    {formatContentInline(useContent(CONTENT_KEYS.IMPACT_INTRO, 'We focus on clear, measurable impact metrics. See what achievements our donor community has unlocked.'))}
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
