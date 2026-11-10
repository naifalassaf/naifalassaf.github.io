import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './darb.css'
import DarbApp from './DarbApp'
import '../trails/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DarbApp />
  </StrictMode>,
)
