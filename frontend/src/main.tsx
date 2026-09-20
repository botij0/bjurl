import { createRoot } from 'react-dom/client'

import { UrlShortenerApp } from './UrlShortenerApp'

import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <UrlShortenerApp />
)
