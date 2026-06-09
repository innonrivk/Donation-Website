import { useState } from 'react';
import DonationCard from './DonationCard';
import CustomAmountCard from './CustomAmountCard';
import { useContent } from '../../context/ContentContext';
import { CONTENT_KEYS } from '../../lib/contentKeys';
import { formatContentInline } from '../../utils/formatContent';
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
          <h2 className="donation-section__title">
            {formatContentInline(useContent(CONTENT_KEYS.BOXES_TITLE, 'Choose Your **Donation**'))}
          </h2>
          <p className="donation-section__desc">
            {formatContentInline(useContent(CONTENT_KEYS.BOXES_CTA, 'Select a plan that works for you. Every contribution, big or small, helps fund community projects and create lasting change.'))}
          </p>
        </div>

        <div className="donation-grid">
          {/* Custom amount card spans first column */}
          <div className="donation-grid__custom" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <CustomAmountCard
              onDonate={(amount) => onDonate(amount, false)}
              isRecurring={false}
              title="One-Time Donation"
              desc="Choose your own one-time donation amount"
              presetAmounts={[10, 25, 50, 100]}
            />
            <CustomAmountCard
              onDonate={(amount) => onDonate(amount, true)}
              isRecurring={true}
              title="Monthly Donation"
              desc="Choose your own monthly donation amount"
              presetAmounts={[5, 15, 35, 75]}
            />
          </div>

          {/* Fixed amount cards */}
          {fixedBoxes.map((box) => (
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
