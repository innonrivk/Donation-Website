import './DonationCard.css';

export default function DonationCard({ box, onDonate, isPopular = false }) {
  if (box.isCustomAmount) {
    return null; // Custom amount card is handled separately
  }

  return (
    <div className={`donation-card ${isPopular ? 'donation-card--popular' : ''}`}>
      {isPopular && (
        <div className="donation-card__badge">Most Popular</div>
      )}
      <div className="donation-card__header">
        <h3 className="donation-card__title">{box.title}</h3>
        <div className="donation-card__price">
          <span className="donation-card__currency">$</span>
          <span className="donation-card__amount">{box.amount}</span>
          <span className="donation-card__period">/mo</span>
        </div>
      </div>
      <p className="donation-card__details">{box.tierDetails}</p>
      <div className="donation-card__divider" />
      <ul className="donation-card__perks">
        {box.tierDetails.split('+').map((perk, i) => (
          <li key={i} className="donation-card__perk">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {perk.trim()}
          </li>
        ))}
      </ul>
      <button
        className="donation-card__btn"
        onClick={() => onDonate(box.amount)}
      >
        {box.buttonText || `Donate $${box.amount}/mo`}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
