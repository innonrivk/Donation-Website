import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import HeroSection from '../components/layout/HeroSection';
import Footer from '../components/layout/Footer';
import DonationGrid from '../components/donation/DonationGrid';
import CheckoutModal from '../components/checkout/CheckoutModal';
import { getContent } from '../services/api';
import './DonationPage.css';

export default function DonationPage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const data = await getContent();
        setContent(data);
      } catch (err) {
        setError(err.message);
        // Use fallback data for demo if backend is unavailable
        setContent({
          websiteContent: {
            head: 'Empower Communities, Transform Lives',
            subtitle: 'Your monthly donation creates lasting impact through sustainable projects worldwide',
            body: '',
          },
          donationBoxes: [
            { id: 0, title: 'Custom Amount', amount: 0, tierDetails: 'Choose your own amount', buttonText: 'Donate', isCustomAmount: true, displayOrder: 1 },
            { id: 1, title: 'Regular', amount: 10, tierDetails: 'Monthly newsletter, yearly zoom event, voting seeds, discounted tours', buttonText: 'Donate $10/mo', isCustomAmount: false, displayOrder: 2 },
            { id: 2, title: 'Shareholder', amount: 85, tierDetails: 'All Regular perks + progression meetings, campaign voting, design voting', buttonText: 'Donate $85/mo', isCustomAmount: false, displayOrder: 3 },
            { id: 3, title: 'Patron', amount: 170, tierDetails: 'All Shareholder perks + t-shirt sponsor print + social media thank yous', buttonText: 'Donate $170/mo', isCustomAmount: false, displayOrder: 4 },
          ],
          projects: [],
          tiers: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  const handleDonate = (amount) => {
    setSelectedAmount(amount);
    setCheckoutOpen(true);
  };

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

      {/* Mission / About section */}
      {content?.websiteContent?.body && (
        <section className="mission-section section">
          <div className="container">
            <div className="mission-content animate-fade-in-up">
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

      <DonationGrid
        boxes={content?.donationBoxes || []}
        onDonate={handleDonate}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={handleCloseCheckout}
        amount={selectedAmount}
      />

      <Footer />
    </div>
  );
}
