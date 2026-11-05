import { companyCount, fillYears, resume, runs, yearsOfExperience } from '../data/resume'

const { basics, site } = resume

export default function About() {
  const stats: [string, string][] = [
    [`${yearsOfExperience()}+`, 'Years of experience'],
    [String(companyCount()), 'Companies'],
    [site.primaryLanguage, 'Primary language'],
    [site.primaryFramework, 'Primary framework'],
  ]
  return (
    <section id="about" className="py-28 max-w-5xl mx-auto px-6">
      <h2 className="section-heading">About Me</h2>

      <div className="mt-14 grid md:grid-cols-5 gap-14 items-center">
        <div className="md:col-span-3 space-y-5 text-slate-400 text-base leading-relaxed">
          {site.about.map((para, i) => (
            <p key={i}>
              {runs(fillYears(para)).map((r, j) =>
                r.em ? (
                  <span key={j} className="text-cyan-400 font-medium">
                    {r.text}
                  </span>
                ) : (
                  r.text
                ),
              )}
            </p>
          ))}

          <div className="grid grid-cols-2 gap-4 pt-4">
            {stats.map(([stat, label]) => (
              <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-cyan-400 font-mono font-semibold text-lg">{stat}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-xl opacity-30 blur group-hover:opacity-50 transition-opacity duration-500" />
            <img
              src="/naif.jpg"
              alt={basics.name}
              className="relative w-64 md:w-full h-auto rounded-xl grayscale hover:grayscale-0 transition-all duration-500 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
