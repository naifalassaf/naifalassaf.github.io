import { Fragment } from 'react'
import { formatPeriod, projectsFor, resume, runs } from '../data/resume'

const { basics, experience, skills, education } = resume

const Rich = ({ text }: { text: string }) => (
  <>
    {runs(text).map((r, i) => (r.em ? <strong key={i}>{r.text}</strong> : <Fragment key={i}>{r.text}</Fragment>))}
  </>
)

export const PDF_PATH = '/Naif-Alassaf-Resume.pdf'

export default function ResumePage() {
  return (
    <>
      {/* screen-only toolbar; hidden in print and in the generated PDF */}
      <div className="toolbar">
        <a href="/">← naifalassaf.github.io</a>
        <a className="pdf" href={PDF_PATH} download>
          Download PDF
        </a>
      </div>

      <article className="page">
        <header>
          <h1>{basics.name}</h1>
          <p className="role">{basics.title}</p>
          <p className="contact">
            <span>{basics.location}</span>
            {basics.phone && <a href={`tel:${basics.phone.replace(/\s/g, '')}`}>{basics.phone}</a>}
            <a href={`mailto:${basics.email}`}>{basics.email}</a>
            {basics.links.map((l) => (
              <a key={l.url} href={l.url}>
                {l.label}
              </a>
            ))}
          </p>
        </header>

        <section>
          <h2>Summary</h2>
          <p className="summary">
            <Rich text={basics.summary} />
          </p>
        </section>

        <section>
          <h2>Experience</h2>
          {experience.map((job) => (
            <div className="job" key={job.company}>
              <p className="org">
                <strong>{job.company}</strong>
                {job.program && <span> · {job.program}</span>}
                {job.location && <span className="muted"> — {job.location}</span>}
              </p>
              {job.roles.map((role) => (
                <div className="roleblock" key={role.title}>
                  <p className="rolehead">
                    <strong>{role.title}</strong>
                    {role.note && <em className="muted"> ({role.note})</em>}
                    <span className="date">{formatPeriod(role.start, role.end)}</span>
                  </p>
                  <ul>
                    {role.highlights.map((h) => (
                      <li key={h}>
                        <Rich text={h} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section>
          <h2>Skills</h2>
          <dl className="skills">
            {skills.map((g) => (
              <div key={g.category}>
                <dt>{g.category}</dt>
                <dd>{g.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Projects</h2>
          {projectsFor('resume').map((p) => (
            <div className="project" key={p.name}>
              <p>
                <strong>{p.name}</strong>
                {p.status && <em className="muted"> ({p.status})</em>}
                {p.github && (
                  <>
                    {' · '}
                    <a href={p.github}>GitHub</a>
                  </>
                )}
              </p>
              <p>
                <Rich text={p.description} />
              </p>
            </div>
          ))}
        </section>

        <section>
          <h2>Education</h2>
          {education.map((e) => (
            <div className="edu" key={e.school}>
              <p className="rolehead">
                <strong>{e.school}</strong>
                <span className="muted"> — {e.location}</span>
                <span className="date">
                  {e.start} – {e.end}
                </span>
              </p>
              <p>{e.degree}</p>
              {e.details && <p className="muted">{e.details}</p>}
            </div>
          ))}
        </section>
      </article>
    </>
  )
}
