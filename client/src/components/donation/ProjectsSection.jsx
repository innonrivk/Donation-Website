import { useState, useEffect, useRef } from 'react';
import './ProjectsSection.css';

/**
 * ProjectsSection displays community projects in an elegant auto-cycling sliding carousel.
 * Supports manual arrow controls, dot selectors, in-place card expansion, and auto-pause on hover.
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of project objects from the DB.
 */
export default function ProjectsSection({ projects }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isHovered, setIsHovered] = useState(false);
  const isPausedRef = useRef(false);

  // Fallback check
  if (!projects || projects.length === 0) return null;

  const n = projects.length;
  const isCarouselEnabled = n >= 3;

  // Track window resizing to dynamically update visible slice count
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w <= 640) {
        setVisibleCount(1);
      } else if (w <= 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle auto-rotation interval
  useEffect(() => {
    if (!isCarouselEnabled || expandedId !== null || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % n);
    }, 4000);

    return () => clearInterval(timer);
  }, [isCarouselEnabled, expandedId, isHovered, n]);

  // Compute indices of currently visible project cards
  const getVisibleProjects = () => {
    if (!isCarouselEnabled) return projects;
    const list = [];
    const count = Math.min(visibleCount, n);
    for (let i = 0; i < count; i++) {
      list.push(projects[(currentIndex + i) % n]);
    }
    return list;
  };

  /**
   * Toggles the expanded status of a single project card.
   * @param {number|string} id - The database ID of the clicked project.
   */
  const handleToggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleMouseEnterCard = (id) => {
    const isDesktop = window.matchMedia('(hover: hover)').matches;
    if (isDesktop) {
      setExpandedId(id);
    }
  };

  const handleMouseLeaveCard = () => {
    // No-op on card leave to prevent layout jumping/flickers when transitioning between cards.
    // Collapsing is handled section-wide on mouse leave instead.
  };

  /**
   * Moves carousel to the previous item and resets focus.
   */
  const handlePrev = () => {
    if (!isCarouselEnabled) return;
    setCurrentIndex((prev) => (prev - 1 + n) % n);
  };

  /**
   * Moves carousel to the next item.
   */
  const handleNext = () => {
    if (!isCarouselEnabled) return;
    setCurrentIndex((prev) => (prev + 1) % n);
  };

  const visibleList = getVisibleProjects();

  return (
    <section 
      className="projects-section section" 
      id="projects"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        const isDesktop = window.matchMedia('(hover: hover)').matches;
        if (isDesktop) {
          setExpandedId(null);
        }
      }}
    >
      <div className="container">
        <div className="projects-section__header">
          <span className="projects-section__label">Where Your Money Goes</span>
          <h2 className="projects-section__title">
            Active <span className="gradient-text">Projects</span>
          </h2>
          <p className="projects-section__desc">
            Your donations directly fund these community-driven initiatives.
            Track progress and see the real impact of your contribution.
          </p>
        </div>

        <div className="projects-carousel-container">
          {/* Arrow navigation for carousel */}
          {isCarouselEnabled && (
            <button 
              className="carousel-arrow carousel-arrow--left print-hide"
              onClick={handlePrev}
              aria-label="Previous Project"
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}

          {/* Carousel Viewport Track */}
          <div className={`projects-carousel-track count-${visibleList.length}`}>
            {visibleList.map((project, idx) => {
              const isCardExpanded = expandedId === project.id;
              const hasAnyCardExpanded = expandedId !== null;
              const isSibling = hasAnyCardExpanded && !isCardExpanded;
              
              return (
                <ProjectCard
                  key={`${currentIndex}-${project.id}`}
                  project={project}
                  index={idx}
                  isExpanded={isCardExpanded}
                  isSiblingOfExpanded={isSibling}
                  onToggle={() => handleToggleExpand(project.id)}
                  onMouseEnter={() => handleMouseEnterCard(project.id)}
                  onMouseLeave={handleMouseLeaveCard}
                />
              );
            })}
          </div>

          {isCarouselEnabled && (
            <button 
              className="carousel-arrow carousel-arrow--right print-hide"
              onClick={handleNext}
              aria-label="Next Project"
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>

        {/* Carousel pagination dots */}
        {isCarouselEnabled && (
          <div className="carousel-dots print-hide">
            {projects.map((proj, idx) => (
              <button
                key={proj.id}
                className={`carousel-dot ${idx === currentIndex ? 'carousel-dot--active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Jump to project ${idx + 1}`}
                type="button"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * ProjectCard represents a singular active project in the carousel slider.
 */
function ProjectCard({
  project,
  index,
  isExpanded,
  isSiblingOfExpanded,
  onToggle,
  onMouseEnter,
  onMouseLeave,
}) {
  const detailsRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  // Compute expanding dynamic height style
  const maxHeightStyle = isExpanded
    ? `${detailsRef.current?.scrollHeight || 400}px`
    : '4.8em';

  return (
    <div
      className={`project-card ${isExpanded ? 'project-card--expanded' : ''} ${
        isSiblingOfExpanded ? 'project-card--sibling-of-expanded' : ''
      } project-card--animate project-card--animate-${index + 1}`}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <div className="project-card__icon-wrap">
        <ProjectIcon name={project.projectName} />
      </div>
      <h3 className="project-card__name">{project.projectName}</h3>
      
      <div
        className="project-card__details-wrap"
        style={{ maxHeight: maxHeightStyle }}
        ref={detailsRef}
      >
        <p className="project-card__details">{project.details}</p>
        <div className="project-card__fade-mask" />
      </div>

      <button
        className="project-card__expand-btn"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onKeyDown={handleKeyDown}
        aria-label={isExpanded ? `Show less about ${project.projectName}` : `Read more about ${project.projectName}`}
        type="button"
      >
        <span className="project-card__expand-text">
          {isExpanded ? 'Show less' : 'Read more'}
        </span>
        <svg
          className="project-card__chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

/**
 * ProjectIcon returns appropriate themed SVG icon mark matching camp name tags.
 */
function ProjectIcon({ name }) {
  const lower = name.toLowerCase();

  // English & Literacy Camps
  if (lower.includes('english') || lower.includes('literacy')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 6h7M9 10h7M9 14h4" />
      </svg>
    );
  }

  // Eco-Bricks & Sustainability Camps
  if (lower.includes('eco') || lower.includes('bricks') || lower.includes('sustainability')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    );
  }

  // Digital camp & tech labs
  if (lower.includes('digital') || lower.includes('tech') || lower.includes('computer')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }

  // Train The Trainer Camp — graduation cap
  if (lower.includes('trainer') || lower.includes('train')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
      </svg>
    );
  }

  // Active Learning Camp — brain / lightbulb
  if (lower.includes('learning') || lower.includes('active')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2a6.5 6.5 0 0 0-1.3 12.87V18a1 1 0 0 0 1 1h5.6a1 1 0 0 0 1-1v-3.13A6.5 6.5 0 0 0 14.5 2h-5z" />
        <line x1="9" y1="21" x2="15" y2="21" />
        <line x1="12" y1="18" x2="12" y2="14" />
        <path d="M9 14h6" />
      </svg>
    );
  }

  // Openmind.Travel — globe
  if (lower.includes('travel') || lower.includes('openmind')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }

  // Fallback — generic star
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
