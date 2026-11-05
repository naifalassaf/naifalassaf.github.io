import { Fragment, type ReactNode } from 'react'
import { formatPeriod, projectsFor, resume, runs } from '../data/resume'

const { basics, experience, skills, education } = resume

const Rich = ({ text }: { text: string }) => (
  <>
    {runs(text).map((r, i) => (r.em ? <strong key={i}>{r.text}</strong> : <Fragment key={i}>{r.text}</Fragment>))}
  </>
)

/** A LaTeX-style \resumeSubheading row: left text, right text flush to the margin. */
const Row = ({ left, right, className = '' }: { left: ReactNode; right?: ReactNode; className?: string }) => (
  <div className={`row ${className}`}>
    <span>{left}</span>
    {right && <span className="right">{right}</span>}
  </div>
)

export const PDF_PATH = '/Naif-Alassaf-Resume.pdf'

export default function ResumePage() {
  const contact: ReactNode[] = [
    basics.phone && <a href={`tel:${basics.phone.replace(/\s/g, '')}`}>{basics.phone}</a>,
    <a href={`mailto:${basics.email}`}>{basics.email}</a>,
    ...basics.links.map((l) => <a href={l.url}>{l.label}</a>),
  ].filter(Boolean)

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
          {/* real spaces around each separator, so the line can wrap between items */}
          <p className="contact">
            {contact.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="sep"> | </span>}
                <span className="item">{c}</span>
              </Fragment>
            ))}
          </p>
          <p className="location">{basics.location}</p>
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
            <div className="entry" key={job.company}>
              <Row
                left={
                  <>
                    <strong>{job.company}</strong>
                    {job.formerly && <> (formerly {job.formerly})</>}
                  </>
                }
                right={job.location ?? job.program}
              />
              {job.roles.map((role) => (
                <div className="role" key={role.title}>
                  <Row
                    className="sub"
                    left={
                      <>
                        {role.title}
                        {role.note && <span className="note"> ({role.note})</span>}
                      </>
                    }
                    right={formatPeriod(role.start, role.end, '–')}
                  />
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
          <h2>Projects</h2>
          {projectsFor('resume').map((p) => (
            <div className="entry project" key={p.name}>
              <Row
                left={
                  <>
                    <strong>{p.name}</strong>
                    {p.status && <em> ({p.status})</em>}
                  </>
                }
                right={p.github && <a href={p.github}>GitHub</a>}
              />
              <ul>
                <li>
                  <Rich text={p.description} />
                </li>
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h2>Technical Skills</h2>
          <div className="skills">
            {skills.map((g) => (
              <p key={g.category}>
                <strong>{g.category}</strong>: {g.items.join(', ')}
              </p>
            ))}
          </div>
        </section>

        <section>
          <h2>Education</h2>
          {education.map((e) => (
            <div className="entry" key={e.school}>
              <Row left={<strong>{e.school}</strong>} right={e.location} />
              <Row className="sub" left={e.degree} right={`${e.start} – ${e.end}`} />
              {e.details && <p className="details">{e.details}</p>}
            </div>
          ))}
        </section>
      </article>
    </>
  )
}
