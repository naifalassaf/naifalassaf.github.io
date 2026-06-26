import { useState, useEffect } from 'react'

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-slate-950/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <a
          href="#"
          className="font-mono text-cyan-400 font-semibold text-xl tracking-tight hover:text-cyan-300 transition-colors"
        >
          NA
        </a>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="text-sm text-slate-400 hover:text-cyan-400 transition-colors font-mono"
              >
                {label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/resume - Naif Alassaf.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 px-4 py-2 rounded font-mono transition-all"
            >
              Resume
            </a>
          </li>
        </ul>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-400 hover:text-cyan-400 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
          <ul className="flex flex-col px-6 py-4 gap-4">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-sm text-slate-400 hover:text-cyan-400 transition-colors font-mono block py-1"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/resume - Naif Alassaf.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 px-4 py-2 rounded font-mono transition-all inline-block"
              >
                Resume
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
