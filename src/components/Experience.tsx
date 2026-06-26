const jobs = [
  {
    company: 'SITE',
    role: 'Senior Front-End Engineer',
    period: 'Jan 2025 — Present',
    bullets: [
      'Led internal knowledge-sharing discussions on front-end technologies, improving team alignment on best practices.',
      'Expanded automation across build, testing, and deployment processes to optimize the development pipeline.',
      'Developed a cross-platform mobile application using Flutter and Dart with clean architecture and modern state management.',
      'Built a dynamic form builder system reused across multiple projects, supporting varied input types, validation rules, and conditional logic.',
    ],
  },
  {
    company: 'SITE',
    role: 'Software Engineer',
    period: 'Dec 2022 — Jan 2025',
    bullets: [
      'Developed pages, components, and tools for clients using React and Ant Design.',
      'Built interactive dashboards using Apache ECharts to visualize user data and behavior insights.',
      'Wrote end-to-end automated tests to maintain code quality across the development lifecycle.',
      'Represented front-end engineering perspectives in project planning and technical decisions.',
    ],
  },
  {
    company: 'Checkboard',
    role: 'Software Developer Intern',
    period: 'Oct 2022 — Dec 2022',
    note: 'Misk London Internship Program',
    bullets: [
      'Implemented bug fixes and enhancements to user dashboards and mobile applications.',
      'Tested web and mobile features and created detailed tickets for improvements.',
      'Reviewed production code to maintain quality standards.',
    ],
  },
]

export default function Experience() {
  return (
    <section id="experience" className="py-28 bg-slate-900/40">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="section-heading">Experience</h2>

        <div className="mt-14 relative">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-cyan-400/60 via-slate-700 to-slate-700 hidden sm:block" />

          <div className="space-y-8">
            {jobs.map((job, i) => (
              <div key={i} className="relative sm:pl-14">
                {/* Timeline dot */}
                <div className="hidden sm:flex absolute left-[10px] top-6 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-950 z-10" />

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-7 hover:border-cyan-400/30 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                    <div>
                      <h3 className="text-slate-100 font-semibold text-lg leading-snug">
                        {job.role}
                      </h3>
                      <p className="text-cyan-400 font-mono text-sm mt-0.5">{job.company}</p>
                      {job.note && (
                        <p className="text-slate-500 text-xs mt-0.5 italic">{job.note}</p>
                      )}
                    </div>
                    <span className="font-mono text-xs text-slate-400 bg-slate-700/60 border border-slate-600/50 px-3 py-1.5 rounded-full whitespace-nowrap">
                      {job.period}
                    </span>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {job.bullets.map((b, j) => (
                      <li key={j} className="flex gap-3 text-slate-400 text-sm leading-relaxed">
                        <span className="text-cyan-400 mt-0.5 shrink-0 select-none">▹</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
