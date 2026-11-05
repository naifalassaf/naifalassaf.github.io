import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './trails.css'
import './i18n'
import TrailsApp from './TrailsApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrailsApp />
  </StrictMode>,
)
