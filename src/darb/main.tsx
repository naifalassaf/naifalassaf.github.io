import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './darb.css'
import DarbApp from './DarbApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DarbApp />
  </StrictMode>,
)
