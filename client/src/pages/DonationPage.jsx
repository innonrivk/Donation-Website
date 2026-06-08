import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import HeroSection from '../components/layout/HeroSection';
import Footer from '../components/layout/Footer';
import ProjectsSection from '../components/donation/ProjectsSection';
import DonationGrid from '../components/donation/DonationGrid';
import DonationProgramDetails from '../components/donation/DonationProgramDetails';
import CheckoutModal from '../components/checkout/CheckoutModal';
import { getContent } from '../services/api';
import { FALLBACK_DONATION_CONTENT } from '../services/fallbackData';
import './DonationPage.css';

/**
 * DonationPage renders the primary landing and donation portal.
 * Houses Hero, Projects Carousel, Donation options, Mission section, and Program metrics/details.
 * 
 * @returns {JSX.Element}
 */
export default function DonationPage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [isRecurring, setIsRecurring] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const data = await getContent();
        if (data && data.websiteContent && data.websiteContent.body) {
          // Remove potential header duplicate line from raw body to keep text clean
          data.websiteContent.body = data.websiteContent.body.replace(
            /OpenmindProjects \(OMP\) is dedicated to building stronger communities[\s\S]*?community empowerment\.\s*\n*/i,
            ""
          );
        }
        setContent(data);
      } catch (err) {
        setError(err.message);
        // Load clean localized static fallback context
        setContent(FALLBACK_DONATION_CONTENT);
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

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
              <div className="mission-content__body">
                {content.websiteContent.body.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
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
