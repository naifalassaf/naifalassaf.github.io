import { useEffect, useState } from 'react'

/**
 * Light/dark for the home page. With nothing stored the OS decides; a click pins a choice.
 * index.html applies a stored choice before first paint, so there's no flash.
 */
const KEY = 'theme'
const root = document.documentElement
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark())

/** The tab icon follows a pinned choice; unpinned, favicon.svg follows the OS by itself. */
function syncFavicon() {
  const link = document.getElementById('favicon') as HTMLLinkElement | null
  if (!link) return
  const pinned = root.dataset.theme
  link.href = pinned === 'dark' ? '/favicon-dark.svg' : pinned === 'light' ? '/favicon-light.svg' : '/favicon.svg'
}

export function useTheme() {
  const [dark, setDark] = useState(isDark)

  useEffect(syncFavicon, [])

  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setDark(isDark())
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  const toggle = () => {
    const next = isDark() ? 'light' : 'dark'
    root.dataset.theme = next
    syncFavicon()
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage blocked: the choice lasts for this visit */
    }
    setDark(next === 'dark')
  }

  return { dark, toggle }
}
