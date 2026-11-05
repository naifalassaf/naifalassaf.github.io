import { formatPeriod, resume } from '../data/resume'

// one card per role, newest first, as the resume lists them
const jobs = resume.experience.flatMap((job) =>
  job.roles.map((role) => ({
    company: job.company,
    formerly: job.formerly,
    logo: job.logo,
    url: job.url,
    role: role.title,
    period: formatPeriod(role.start, role.end, '—'),
    note: job.program,
    bullets: role.highlights,
  })),
)

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
                    <div className="flex items-start gap-4">
                    {job.logo && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center justify-center w-20 h-12 bg-white rounded-lg px-2.5 ring-1 ring-slate-600/40"
                        aria-label={job.company}
                      >
                        {/* official logos are dark-on-light, so they sit on a white tile */}
                        <img src={job.logo} alt={`${job.company} logo`} className="max-h-6 w-full object-contain" loading="lazy" />
                      </a>
                    )}
                    <div>
                      <h3 className="text-slate-100 font-semibold text-lg leading-snug">
                        {job.role}
                      </h3>
                      <p className="text-cyan-400 font-mono text-sm mt-0.5">
                        {job.company}
                        {job.formerly && <span className="text-slate-500"> (formerly {job.formerly})</span>}
                      </p>
                      {job.note && (
                        <p className="text-slate-500 text-xs mt-0.5 italic">{job.note}</p>
                      )}
                    </div>
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
