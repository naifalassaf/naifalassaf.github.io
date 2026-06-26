export default function About() {
  return (
    <section id="about" className="py-28 max-w-5xl mx-auto px-6">
      <h2 className="section-heading">About Me</h2>

      <div className="mt-14 grid md:grid-cols-5 gap-14 items-center">
        <div className="md:col-span-3 space-y-5 text-slate-400 text-base leading-relaxed">
          <p>
            I'm a Senior Front-End Engineer based in Saudi Arabia with over 3
            years of professional experience building web applications and
            developer tooling. I specialize in{" "}
            <span className="text-cyan-400 font-medium">React</span> and{" "}
            <span className="text-cyan-400 font-medium">TypeScript</span>, with
            a strong focus on reusable component systems, interactive data
            dashboards, and improving the day-to-day experience of the
            engineering teams I work with.
          </p>
          <p>
            I studied Computer Science — with a minor in Space! — at the{" "}
            <span className="text-slate-200 font-medium">
              University of Colorado Boulder
            </span>
            , graduating in 2022. I made the Dean's List twice and built a
            foundation in software engineering that I've carried into every role
            since.
          </p>
          <p>
            Outside of code, I enjoy cooking, tabletop games, camping, hiking,
            astronomy, and storytelling.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              ["3+", "Years of experience"],
              ["2", "Companies"],
              ["TypeScript", "Primary language"],
              ["React", "Primary framework"],
            ].map(([stat, label]) => (
              <div
                key={label}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3"
              >
                <p className="text-cyan-400 font-mono font-semibold text-lg">
                  {stat}
                </p>
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
              alt="Naif Alassaf"
              className="relative w-64 md:w-full h-auto rounded-xl grayscale hover:grayscale-0 transition-all duration-500 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
