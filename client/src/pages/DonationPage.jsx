import { useState } from 'react';
import Header from '../components/layout/Header';
import HeroSection from '../components/layout/HeroSection';
import Footer from '../components/layout/Footer';
import ProjectsSection from '../components/donation/ProjectsSection';
import DonationGrid from '../components/donation/DonationGrid';
import DonationProgramDetails from '../components/donation/DonationProgramDetails';
import CheckoutModal from '../components/checkout/CheckoutModal';
import { useCMS } from '../hooks/useCMS';
import DOMPurify from 'dompurify';
import './DonationPage.css';

/**
 * DonationPage renders the primary landing and donation portal.
 * Houses Hero, Projects Carousel, Donation options, Mission section, and Program metrics/details.
 * 
 * @returns {JSX.Element}
 */
export default function DonationPage() {
  const { data: content, isLoading: loading } = useCMS();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [isRecurring, setIsRecurring] = useState(true);

  /**
   * Triggers the Checkout/Subscription modal.
   * @param {number} amount - Amount in USD.
   */
  const handleDonate = (amount, recurring = true) => {
    setSelectedAmount(amount);
    setIsRecurring(recurring);
    setCheckoutOpen(true);
  };

  /**
   * Resets Checkout/Subscription modal states.
   */
  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setSelectedAmount(null);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="page-loader__spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="donation-page">
      <Header />
      <HeroSection content={content?.websiteContent} />

      {/* Project descriptions — between hero and donation grid */}
      <ProjectsSection projects={content?.projects || []} />

      {/* Grid of preset monthly amounts */}
      <DonationGrid
        boxes={content?.donationBoxes || []}
        onDonate={handleDonate}
      />

      {/* Mission / About section — placed between Grid and Tiers */}
      {content?.websiteContent?.body && (
        <section className="mission-section section">
          <div className="container">
            <div className="mission-content">
              <h2 className="mission-content__title">
                Our <span className="gradient-text">Mission</span>
              </h2>
              <div
                className="mission-content__body"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.websiteContent.body) }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Donation tiers & milestones */}
      <DonationProgramDetails
        tiers={content?.tiers || []}
        milestones={content?.milestones || []}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={handleCloseCheckout}
        amount={selectedAmount}
        isRecurring={isRecurring}
      />

      <Footer />
    </div>
  );
}
