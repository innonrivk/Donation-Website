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

  // Find database custom configurations
  const customOneTimeConfig = boxes.find((b) => b.isCustomAmount && !b.isRecurring);
  const customMonthlyConfig = boxes.find((b) => b.isCustomAmount && b.isRecurring);

  // Determine if we should show them (show fallback if missing, show db value if active, hide if db value is inactive)
  const showOneTime = !customOneTimeConfig || customOneTimeConfig.isActive;
  const showMonthly = !customMonthlyConfig || customMonthlyConfig.isActive;

  const oneTimeTitle = customOneTimeConfig ? formatContentInline(customOneTimeConfig.title) : "One-Time Donation";
  const oneTimeDesc = customOneTimeConfig ? formatContentInline(customOneTimeConfig.tierDetails) : "Choose your own one-time donation amount";
  const oneTimeButton = customOneTimeConfig?.buttonText ? formatContentInline(customOneTimeConfig.buttonText) : undefined;

  const monthlyTitle = customMonthlyConfig ? formatContentInline(customMonthlyConfig.title) : "Monthly Donation";
  const monthlyDesc = customMonthlyConfig ? formatContentInline(customMonthlyConfig.tierDetails) : "Choose your own monthly donation amount";
  const monthlyButton = customMonthlyConfig?.buttonText ? formatContentInline(customMonthlyConfig.buttonText) : undefined;

  // Mark $25/mo as "most popular"
  const popularAmount = 25;

  const toggleExpand = (id) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="donation-section section" id="donate">
      <div className="container">
        <div className="donation-section__header">
          <span className="donation-section__label">
            {formatContentInline(useContent(CONTENT_KEYS.BOXES_LABEL, 'Make an Impact'))}
          </span>
          <h2 className="donation-section__title">
            {formatContentInline(useContent(CONTENT_KEYS.BOXES_TITLE, 'Choose Your **Donation**'))}
          </h2>
          <p className="donation-section__desc">
            {formatContentInline(useContent(CONTENT_KEYS.BOXES_CTA, 'Select a plan that works for you. Every contribution, big or small, helps fund community projects and create lasting change.'))}
          </p>
          <div className="donation-section__note">
            <strong>💡 Note:</strong> If you donate without having registered, you can easily access your dashboard and achievements at any time! Simply sign up with the exact same email address you used for your donation.
          </div>
        </div>

        <div className="donation-grid">
          {/* Custom amount card spans first column */}
          <div className="donation-grid__custom" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {showOneTime && (
              <CustomAmountCard
                onDonate={(amount) => onDonate(amount, false)}
                isRecurring={false}
                title={oneTimeTitle}
                desc={oneTimeDesc}
                buttonLabel={oneTimeButton}
                presetAmounts={[10, 25, 50, 100]}
              />
            )}
            {showMonthly && (
              <CustomAmountCard
                onDonate={(amount) => onDonate(amount, true)}
                isRecurring={true}
                title={monthlyTitle}
                desc={monthlyDesc}
                buttonLabel={monthlyButton}
                presetAmounts={[5, 15, 35, 75]}
              />
            )}
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
