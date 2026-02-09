import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { UrlShortenerApp } from './UrlShortenerApp'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UrlShortenerApp />
  </StrictMode>,
)
