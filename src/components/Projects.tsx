const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
)

const projects = [
  {
    title: 'Request Management System',
    description:
      'A front-end product that manages requests through complex multi-step workflows powered by Camunda 7. Includes interactive dashboards and ECharts visualizations to surface insights on request volume and user behavior. Replaced a manual process previously managed via emails and spreadsheets — now fully automated and self-contained.',
    tags: ['React', 'TypeScript', 'Camunda 7', 'ECharts', 'Ant Design'],
    link: null,
  },
  {
    title: 'CRD App — CU Boulder Psychology Dept.',
    description:
      "Collaborated with the University of Colorado Boulder Psychology Department's Correll Lab to update and gamify their Cross Racial Deficit (CRD) mobile application. The team streamlined the CI/CD pipeline, rewrote documentation, refreshed the UI, and added gamification features to improve study participation.",
    tags: ['Mobile', 'UI/UX', 'CI/CD', 'Agile', 'Documentation'],
    link: 'https://github.com/naifalassaf',
  },
]

export default function Projects() {
  return (
    <section id="projects" className="py-28 bg-slate-900/40">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="section-heading">Projects</h2>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <div
              key={i}
              className="group bg-slate-800/60 border border-slate-700/50 rounded-xl p-8 flex flex-col hover:border-cyan-400/30 hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-5">
                <span className="text-cyan-400 text-3xl select-none">◈</span>
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-cyan-400 transition-colors"
                    aria-label="GitHub repository"
                  >
                    <GitHubIcon />
                  </a>
                )}
              </div>

              <h3 className="text-slate-100 font-semibold text-xl mb-3 group-hover:text-cyan-400 transition-colors leading-snug">
                {project.title}
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-6">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mt-auto">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
