import DonationCard from './DonationCard';
import CustomAmountCard from './CustomAmountCard';
import './DonationGrid.css';

export default function DonationGrid({ boxes, onDonate }) {
  // Separate custom amount card from fixed cards
  const fixedBoxes = boxes.filter((b) => !b.isCustomAmount);

  // Mark $25/mo as "most popular"
  const popularAmount = 25;

  return (
    <section className="donation-section section" id="donate">
      <div className="container">
        <div className="donation-section__header animate-fade-in-up">
          <span className="donation-section__label">Make an Impact</span>
          <h2 className="donation-section__title">
            Choose Your <span className="gradient-text">Monthly Donation</span>
          </h2>
          <p className="donation-section__desc">
            Select a plan that works for you. Every contribution, big or small, helps fund
            community projects and create lasting change.
          </p>
        </div>

        <div className="donation-grid">
          {/* Custom amount card spans first column */}
          <div className="donation-grid__custom animate-fade-in-up animate-delay-1">
            <CustomAmountCard onDonate={onDonate} />
          </div>

          {/* Fixed amount cards */}
          {fixedBoxes.map((box, index) => (
            <div
              key={box.id}
              className={`animate-fade-in-up animate-delay-${Math.min(index + 2, 6)}`}
            >
              <DonationCard
                box={box}
                onDonate={onDonate}
                isPopular={box.amount === popularAmount}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
