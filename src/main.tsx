import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Only Bootstrap's stylesheet: the app uses its grid and form classes, but no
// interactive components, so the JS bundle would be dead weight.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
