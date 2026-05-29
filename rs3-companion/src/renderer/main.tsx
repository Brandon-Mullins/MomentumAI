import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { OverlayPanel } from './components/OverlayPanel'
import './styles/app.css'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    {window.rs3Companion.isOverlayMode() ? <OverlayPanel /> : <App />}
  </StrictMode>
)
