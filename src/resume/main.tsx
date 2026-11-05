import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './resume.css'
import ResumePage from './ResumePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ResumePage />
  </StrictMode>,
)
