const skillGroups = [
  {
    category: 'Languages',
    icon: '{ }',
    skills: ['TypeScript', 'JavaScript', 'Dart'],
  },
  {
    category: 'Frameworks & Libraries',
    icon: '⚛',
    skills: ['React', 'Flutter', 'Ant Design', 'Apache ECharts'],
  },
  {
    category: 'Tools & Platforms',
    icon: '⚙',
    skills: ['Camunda 7', 'Git', 'Vite'],
  },
  {
    category: 'Practices',
    icon: '◈',
    skills: ['Agile', 'E2E Testing', 'UI/UX Design', 'Component-Driven Dev'],
  },
]

export default function Skills() {
  return (
    <section id="skills" className="py-28 max-w-5xl mx-auto px-6">
      <h2 className="section-heading">Skills</h2>

      <div className="mt-14 grid sm:grid-cols-2 gap-5">
        {skillGroups.map(({ category, icon, skills }) => (
          <div
            key={category}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-7 hover:border-cyan-400/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-cyan-400 text-xl w-8 text-center">{icon}</span>
              <h3 className="text-slate-200 font-semibold text-sm uppercase tracking-widest">
                {category}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-slate-700/60 text-cyan-300 text-xs font-mono px-3 py-1.5 rounded-full border border-slate-600/50 group-hover:border-cyan-400/20 transition-colors"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
