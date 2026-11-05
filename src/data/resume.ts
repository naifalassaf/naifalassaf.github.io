/**
 * The resume, typed. `resume.json` is the single source of truth for both the website
 * sections and the /resume page (and the PDF printed from it at build time).
 * Edit the JSON; nothing else holds resume text.
 */
import data from './resume.json'

export type YearMonth = string // "2025-01"

export interface Link {
  label: string
  url: string
  kind: 'linkedin' | 'github' | 'website' | string
}

export interface Role {
  title: string
  start: YearMonth
  end: YearMonth | null
  note?: string
  highlights: string[]
}

export interface Job {
  company: string
  location?: string
  program?: string
  roles: Role[]
}

export interface SkillGroup {
  category: string
  items: string[]
}

export interface Project {
  name: string
  /** shorter title for the website card, when it differs from the resume's */
  siteName?: string
  status?: string
  description: string
  tags: string[]
  demo?: string
  github?: string
  theme?: 'cyan' | 'sunset' | string
  showOn: ('site' | 'resume' | string)[]
}

export interface Education {
  school: string
  location: string
  degree: string
  start: string
  end: string
  details?: string
}

export interface Resume {
  basics: {
    name: string
    title: string
    location: string
    phone?: string
    email: string
    links: Link[]
    summary: string
  }
  experience: Job[]
  skills: SkillGroup[]
  projects: Project[]
  education: Education[]
  site: {
    tagline: string
    intro: string
    about: string[]
    primaryLanguage: string
    primaryFramework: string
    skillIcons: Record<string, string>
  }
}

// assignment (not a cast) so tsc fails the build if the JSON drifts from the shape above
export const resume: Resume = data

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parts = (ym: YearMonth) => {
  const [y, m] = ym.split('-').map(Number)
  return { y, m: m || 1 }
}
export const formatMonth = (ym: YearMonth) => {
  const { y, m } = parts(ym)
  return `${MONTHS[m - 1]} ${y}`
}

/** "Jan 2025 – Present", "Dec 2022 – Jan 2025", and "Oct – Dec 2022" within one year */
export function formatPeriod(start: YearMonth, end: YearMonth | null, dash = '–') {
  if (!end) return `${formatMonth(start)} ${dash} Present`
  const s = parts(start)
  const e = parts(end)
  if (s.y === e.y) return `${MONTHS[s.m - 1]} ${dash} ${MONTHS[e.m - 1]} ${e.y}`
  return `${formatMonth(start)} ${dash} ${formatMonth(end)}`
}

/** Whole years since the first role started. */
export function yearsOfExperience(now = new Date()) {
  const first = resume.experience
    .flatMap((j) => j.roles.map((r) => parts(r.start)))
    .reduce((a, b) => (a.y * 12 + a.m <= b.y * 12 + b.m ? a : b))
  const months = now.getFullYear() * 12 + now.getMonth() + 1 - (first.y * 12 + first.m)
  return Math.floor(months / 12)
}

export const companyCount = () => new Set(resume.experience.map((j) => j.company)).size

export const projectsFor = (where: 'site' | 'resume') => resume.projects.filter((p) => p.showOn.includes(where))

/** The only markup the JSON uses: **emphasis**. Returns alternating plain/emphasised runs. */
export function runs(text: string): { text: string; em: boolean }[] {
  return text.split(/\*\*(.+?)\*\*/g).map((t, i) => ({ text: t, em: i % 2 === 1 }))
}

export const fillYears = (text: string) => text.replace('{years}', String(yearsOfExperience()))
