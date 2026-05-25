import './ProjectsSection.css';

export default function ProjectsSection({ projects }) {
  if (!projects || projects.length === 0) return null;

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
            const progress = project.fundingGoal > 0
              ? Math.round((project.fundedAmount / project.fundingGoal) * 100)
              : 0;

            return (
              <div
                key={project.id}
                className={`project-card animate-fade-in-up animate-delay-${index + 1}`}
              >
                <div className="project-card__icon-wrap">
                  <ProjectIcon name={project.projectName} />
                </div>
                <h3 className="project-card__name">{project.projectName}</h3>
                <p className="project-card__details">{project.details}</p>
                <div className="project-card__funding">
                  <div className="project-card__progress-bar">
                    <div
                      className="project-card__progress-fill"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="project-card__funding-info">
                    <span className="project-card__funded">
                      ${(project.fundedAmount / 100).toLocaleString()} raised
                    </span>
                    <span className="project-card__goal">
                      ${(project.fundingGoal / 100).toLocaleString()} goal
                    </span>
                  </div>
                  <span className="project-card__percent">{progress}%</span>
                </div>
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
  if (lower.includes('water')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }
  if (lower.includes('education') || lower.includes('school')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
      </svg>
    );
  }
  // Default: tree/nature
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 20H7l5-16 5 16z" />
      <path d="M12 20v-4" />
      <path d="M7.5 14H12" />
      <path d="M12 14h4.5" />
    </svg>
  );
}
