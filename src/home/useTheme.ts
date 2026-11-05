import { useEffect, useState } from 'react'

/**
 * Light/dark for the home page. With nothing stored the OS decides; a click pins a choice.
 * index.html applies a stored choice before first paint, so there's no flash.
 */
const KEY = 'theme'
const root = document.documentElement
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark())

export function useTheme() {
  const [dark, setDark] = useState(isDark)

  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setDark(isDark())
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  const toggle = () => {
    const next = isDark() ? 'light' : 'dark'
    root.dataset.theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage blocked: the choice lasts for this visit */
    }
    setDark(next === 'dark')
  }

  return { dark, toggle }
}
