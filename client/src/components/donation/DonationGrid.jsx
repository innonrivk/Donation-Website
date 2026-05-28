import { useState } from 'react';
import DonationCard from './DonationCard';
import CustomAmountCard from './CustomAmountCard';
import './DonationGrid.css';

export default function DonationGrid({ boxes, onDonate }) {
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Separate custom amount card from fixed cards
  const fixedBoxes = boxes.filter((b) => !b.isCustomAmount);

  // Mark $25/mo as "most popular"
  const popularAmount = 25;

  const toggleExpand = (id) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="donation-section section" id="donate">
      <div className="container">
        <div className="donation-section__header">
          <span className="donation-section__label">Make an Impact</span>
          <h2 className="donation-section__title">
            Choose Your <span className="gradient-text">Monthly Donation</span>
          </h2>
          <p className="donation-section__desc">
            Select a plan that works for you. Every contribution, big or small, helps fund
            community projects and create lasting change.
          </p>
          <div className="donation-section__note">
            <strong>💡 Note:</strong> If you donate without having registered, you can easily access your dashboard and achievements at any time! Simply sign up with the exact same email address you used for your donation.
          </div>
        </div>

        <div className="donation-grid">
          {/* Custom amount card spans first column */}
          <div className="donation-grid__custom">
            <CustomAmountCard onDonate={onDonate} />
          </div>

          {/* Fixed amount cards */}
          {fixedBoxes.map((box, index) => (
            <div
              key={box.id}
              className=""
            >
              <DonationCard
                box={box}
                onDonate={onDonate}
                isPopular={box.amount === popularAmount}
                isExpanded={expandedCardId === box.id}
                onToggleExpand={() => toggleExpand(box.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
