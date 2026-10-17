import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@arcgis/core/assets/esri/themes/light/main.css'
import './index.css'
import App from './App'

// Yangi deploy'dan keyin eski ochiq sahifa endi mavjud bo'lmagan JS bo'lagini so'rasa — bir marta avtomatik yangilaymiz
window.addEventListener('vite:preloadError', (e) => {
  const key = 'shgat.reloaded-at'
  const last = Number(sessionStorage.getItem(key) ?? 0)
  if (Date.now() - last > 10_000) {
    e.preventDefault()
    sessionStorage.setItem(key, String(Date.now()))
    location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
