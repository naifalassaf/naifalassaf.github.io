import type { ReactNode } from 'react'
import { formatPeriod, projectsFor, resume } from './data/resume'
import TopoBackdrop from './home/TopoBackdrop'
import { useTheme } from './home/useTheme'
import './home/home.css'

const { basics, experience, skills, education, site } = resume

const Label = ({ children }: { children: ReactNode }) => (
  <h2 className="mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
    {children}
  </h2>
)

const Section = ({ id, children }: { id?: string; children: ReactNode }) => (
  <section id={id} className="py-20 border-t first:border-t-0 scroll-mt-4" style={{ borderColor: 'var(--rule)' }}>
    {children}
  </section>
)

function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className="mono text-xs uppercase px-3 py-1.5 rounded-full border transition hover:bg-[var(--accent-soft)]"
      style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀ Day' : '☾ Night'}
    </button>
  )
}

function Hero() {
  return (
    <header className="relative h-[92svh] min-h-[560px] overflow-hidden border-b" style={{ borderColor: 'var(--rule)' }}>
      <TopoBackdrop />
      <div className="relative z-10 max-w-5xl mx-auto px-6 h-full flex flex-col">
        <nav className="flex items-center justify-between gap-4 py-6">
          <span className="mono text-xs uppercase tracking-[0.2em]">{basics.name}</span>
          <div className="flex items-center gap-5 text-sm">
            <a href="#work" className="hidden sm:inline hover:underline">Work</a>
            <a href="#projects" className="hidden sm:inline hover:underline">Projects</a>
            <a href="#toolkit" className="hidden sm:inline hover:underline">Toolkit</a>
            <a href="/resume" className="font-semibold" style={{ color: 'var(--accent)' }}>
              Résumé ↗
            </a>
            <ThemeToggle />
          </div>
        </nav>
        <div className="mt-auto pb-16 max-w-2xl">
          <p className="mono text-xs" style={{ color: 'var(--muted)' }}>
            24.711° N · 46.197° E — {basics.location}
          </p>
          <h1 className="mt-4 text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-tight">{basics.name}</h1>
          <p className="mt-3 text-2xl font-medium" style={{ color: 'var(--accent)' }}>
            {basics.title}
          </p>
          <p className="mt-6 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            {basics.summary}
          </p>
        </div>
      </div>
    </header>
  )
}

function Experience() {
  return (
    <Section id="work">
      <Label>Experience</Label>
      <div className="mt-8 space-y-14">
        {experience.map((job) => (
          <article key={job.company}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {job.logo && (
                <span className="h-9 px-2.5 rounded-md bg-white grid place-items-center border" style={{ borderColor: 'var(--rule)' }}>
                  <img src={job.logo} alt="" className="h-4" />
                </span>
              )}
              <h3 className="text-xl font-bold">
                {job.url ? (
                  <a href={job.url} className="hover:underline decoration-[var(--accent)]">
                    {job.company}
                  </a>
                ) : (
                  job.company
                )}
              </h3>
              {job.formerly && <span style={{ color: 'var(--muted)' }}>formerly {job.formerly}</span>}
            </div>
            {job.roles.map((role) => (
              <div key={role.title} className="mt-6 pl-5 border-l-2" style={{ borderColor: 'var(--rule)' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h4 className="text-lg font-semibold">{role.title}</h4>
                  <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                    {formatPeriod(role.start, role.end)}
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {role.highlights.map((h) => (
                    <li key={h} className="flex gap-3">
                      <span className="mt-[0.6em] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </article>
        ))}
      </div>
    </Section>
  )
}

function Projects() {
  return (
    <Section id="projects">
      <Label>Projects</Label>
      <div className="mt-8 space-y-10">
        {projectsFor('site').map((p) => (
          <a key={p.name} href={p.demo ?? p.github ?? '#'} className="block group">
            <h3 className="text-xl font-bold group-hover:underline decoration-[var(--accent)]">
              {p.siteName ?? p.name} {p.demo && <span style={{ color: 'var(--accent)' }}>↗</span>}
            </h3>
            <p className="mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
              {p.description}
            </p>
            <p className="mono mt-2 text-xs" style={{ color: 'var(--muted)' }}>
              {p.tags.join(' / ')}
            </p>
          </a>
        ))}
      </div>
    </Section>
  )
}

function Toolkit() {
  return (
    <Section id="toolkit">
      <Label>Toolkit</Label>
      <dl className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-6">
        {skills.map((g) => (
          <div key={g.category}>
            <dt className="font-semibold">{g.category}</dt>
            <dd className="mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
              {g.items.join(', ')}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-14">
        <Label>Off the clock</Label>
        <p className="mt-4 leading-relaxed max-w-xl" style={{ color: 'var(--muted)' }}>
          {site.offTheClock}
        </p>
      </div>
    </Section>
  )
}

function Education() {
  return (
    <Section id="education">
      <Label>Education</Label>
      {education.map((e) => (
        <div key={e.school} className="mt-6">
          <h3 className="text-lg font-semibold">{e.school}</h3>
          <p style={{ color: 'var(--muted)' }}>
            {e.degree} · {e.start}–{e.end}
          </p>
          {e.details && (
            <p className="mono mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              {e.details}
            </p>
          )}
        </div>
      ))}
    </Section>
  )
}

function Contact() {
  return (
    <footer className="py-20 border-t" style={{ borderColor: 'var(--rule)' }}>
      <Label>Get in touch</Label>
      <a
        href={`mailto:${basics.email}`}
        className="block mt-4 text-[clamp(1.25rem,6vw,2.25rem)] break-all font-bold hover:underline decoration-[var(--accent)]"
      >
        {basics.email.toLowerCase()}
      </a>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {basics.links.map((l) => (
          <a key={l.url} href={l.url} className="hover:underline" style={{ color: 'var(--muted)' }}>
            {l.label}
          </a>
        ))}
        <a href="/resume" className="hover:underline" style={{ color: 'var(--muted)' }}>
          Résumé
        </a>
      </div>
      <p className="mono mt-16 text-xs" style={{ color: 'var(--muted)' }}>
        © {new Date().getFullYear()} {basics.name}
      </p>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Hero />
      <main className="max-w-3xl mx-auto px-6">
        <Experience />
        <Projects />
        <Toolkit />
        <Education />
        <Contact />
      </main>
    </>
  )
}
