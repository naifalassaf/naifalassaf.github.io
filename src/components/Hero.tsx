export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      {/* Fade to bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-32">
        <p className="font-mono text-cyan-400 text-sm mb-5 tracking-widest uppercase">
          Hi, my name is
        </p>
        <h1 className="text-6xl md:text-8xl font-extrabold text-slate-100 mb-4 leading-none tracking-tight">
          Naif Alassaf.
        </h1>
        <h2 className="text-4xl md:text-6xl font-bold text-slate-500 mb-8 leading-tight tracking-tight">
          I build things for the web.
        </h2>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Senior Front-End Engineer specializing in{' '}
          <span className="text-cyan-400 font-semibold">React</span> and{' '}
          <span className="text-cyan-400 font-semibold">TypeScript</span>. I build intuitive
          interfaces, reusable component systems, and automation-driven development pipelines —
          currently at <span className="text-slate-200 font-semibold">SITE</span>.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#projects"
            className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold px-7 py-3.5 rounded-lg transition-all text-sm font-mono"
          >
            View My Work
          </a>
          <a
            href="#contact"
            className="border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 font-semibold px-7 py-3.5 rounded-lg transition-all text-sm font-mono"
          >
            Get In Touch
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#about"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-600 hover:text-cyan-400 transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </a>
    </section>
  )
}
