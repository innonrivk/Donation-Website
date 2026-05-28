import './HeroSection.css';

export default function HeroSection({ content }) {
  return (
    <section className="hero">
      {/* Animated background elements */}
      <div className="hero__bg-effects">
        <div className="hero__orb hero__orb--purple" />
        <div className="hero__orb hero__orb--teal" />
        <div className="hero__grid" />
      </div>

      <div className="hero__container container">
        <div className="hero__badge">
          <span className="hero__badge-dot" />
          Monthly Donation Program
        </div>
        <h1 className="hero__title">
          {content?.head || 'Empower Communities, Transform Lives'}
        </h1>
        <p className="hero__subtitle">
          {content?.subtitle || 'Your monthly donation creates lasting impact through sustainable projects'}
        </p>
        <div className="hero__actions">
          <a href="#donate" className="hero__cta">
            Start Donating
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
