import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './i18n'
import EidiyahApp from './EidiyahApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EidiyahApp />
  </StrictMode>,
)
