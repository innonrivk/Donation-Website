import { useState } from 'react';
import './ProjectsSection.css';

export default function ProjectsSection({ projects }) {
  const [expanded, setExpanded] = useState(new Set());

  if (!projects || projects.length === 0) return null;

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  };

  return (
    <section className="projects-section section" id="projects">
      <div className="container">
        <div className="projects-section__header animate-fade-in-up">
          <span className="projects-section__label">Where Your Money Goes</span>
          <h2 className="projects-section__title">
            Active <span className="gradient-text">Projects</span>
          </h2>
          <p className="projects-section__desc">
            Your donations directly fund these community-driven initiatives.
            Track progress and see the real impact of your contribution.
          </p>
        </div>

        <div className="projects-grid">
          {projects.map((project, index) => {
            const isExpanded = expanded.has(project.id);

            return (
              <div
                key={project.id}
                className={`project-card${isExpanded ? ' project-card--expanded' : ''} animate-fade-in-up animate-delay-${index + 1}`}
                aria-expanded={isExpanded}
              >
                <div className="project-card__icon-wrap">
                  <ProjectIcon name={project.projectName} />
                </div>
                <h3 className="project-card__name">{project.projectName}</h3>
                <p className="project-card__details">{project.details}</p>

                {/* Dedicated expand/collapse button — accessible to keyboard and screen readers */}
                <button
                  className="project-card__expand-btn"
                  onClick={() => toggle(project.id)}
                  onKeyDown={(e) => handleKeyDown(e, project.id)}
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
          })}
        </div>
      </div>
    </section>
  );
}

function ProjectIcon({ name }) {
  const lower = name.toLowerCase();

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
